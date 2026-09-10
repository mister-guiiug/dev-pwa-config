#!/usr/bin/env node
/**
 * « QUELLE MAJEURE LE SOCLE INTERDIT-IL ENCORE AUX APPS ? »
 *
 * Une `peerDependency` est un PLAFOND : `"vitest": "^4.0.0"` interdit Vitest 5
 * à toutes les apps du parc, qu'elles le veuillent ou non. Le plafond ne fait
 * pas de bruit — ni au `npm install` du socle, ni en CI, ni dans une app. Il se
 * découvre le jour où quelqu'un essaie de monter, et se découvre alors comme un
 * conflit de peers, très loin d'ici.
 *
 * CE QUE CETTE SONDE MESURE. Pour chaque peer et chaque devDependency déclarée,
 * la plus haute majeure que la plage accepte, comparée à la majeure publiée
 * sous l'étiquette `latest`. Rien d'autre : ni vulnérabilité (c'est `npm
 * audit`), ni mise à jour de patch (c'est Renovate).
 *
 * POURQUOI ELLE EXISTE. Le relevé du 10/09/2026 a trouvé neuf plafonds
 * derrière la majeure courante — dont `eslint@^9`, sorti du support, qui
 * affichait son avertissement de dépréciation à chaque installation depuis des
 * mois. Aucun n'était le fruit d'une décision : ils avaient simplement cessé
 * d'être regardés, Renovate n'ayant jamais tourné faute de `RENOVATE_TOKEN`.
 * Un plafond doit rester une décision — « nous attendons TypeScript 7 » est
 * une position tenable ; l'oublier ne l'est pas.
 *
 * CE QU'ELLE NE FAIT PAS. Elle ne monte rien et ne propose aucune PR. Elle
 * nomme, avec la date, ce qu'un humain doit trancher. Le code de sortie est 0
 * par défaut : un plafond assumé ne doit pas rougir une CI. `--strict` le fait
 * rougir, pour un dépôt qui préfère ce régime.
 *
 * Usage :
 *   node scripts/plafonds.mjs [--json] [--strict] [--dev] [--tous]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { estPointDEntree } from './entree.mjs';

const REGISTRE = 'https://registry.npmjs.org';

/**
 * La plus haute version que la plage accepte, sous une forme comparable.
 *
 * On ne réimplémente PAS semver : seul le plafond nous intéresse, et il se lit
 * sur la borne haute de chaque terme. Une plage ouverte (`>=8.0.0`, `*`)
 * n'interdit rien — elle rend `Infinity`, et la sonde se tait pour toujours à
 * son sujet. C'est voulu : `>=8.0.0` EST la décision de ne pas plafonner.
 *
 * Le cas `0.x` est traité à part, comme le veut semver : `^0.5.2` autorise
 * jusqu'à `0.5.x`, pas `0.6`. Le plafond porte donc sur la mineure.
 *
 * @param {string} plage Plage déclarée, p. ex. `^9.39.4 || ^10.0.0`.
 * @returns {{ majeure: number, mineure: number }} `Infinity` si non plafonnée.
 */
export function plafond(plage) {
  const OUVERT = { majeure: Infinity, mineure: Infinity };
  if (typeof plage !== 'string' || !plage.trim()) return OUVERT;
  // `npm:`, `workspace:`, `file:`… : rien à comparer à un registre.
  if (/^[a-z]+:/i.test(plage.trim())) return OUVERT;

  let haut = { majeure: -1, mineure: -1 };
  for (const terme of plage.split('||')) {
    const t = terme.trim();
    if (!t || t === '*' || t === 'x' || t === 'latest') return OUVERT;
    // Une borne basse seule n'interdit rien au-dessus.
    if (/^>=?[^<]*$/.test(t) && !/[~^]/.test(t)) return OUVERT;

    const m = t.match(/^([~^]|>=|>)?\s*v?(\d+)(?:\.(\d+))?/);
    if (!m) return OUVERT;
    const majeure = Number(m[2]);
    const mineure = m[3] === undefined ? Infinity : Number(m[3]);
    const operateur = m[1] ?? '';

    // `^0.5.2` ne dépasse pas `0.5.x` ; `^1.2.3` va jusqu'à `1.x`.
    const borne =
      operateur === '~' || (operateur === '^' && majeure === 0)
        ? { majeure, mineure }
        : { majeure, mineure: Infinity };
    if (
      borne.majeure > haut.majeure ||
      (borne.majeure === haut.majeure && borne.mineure > haut.mineure)
    ) {
      haut = borne;
    }
  }
  return haut.majeure === -1 ? OUVERT : haut;
}

/**
 * La version publiée dépasse-t-elle le plafond de la plage ?
 *
 * @param {string} plage
 * @param {string} publiee Version sous l'étiquette `latest`.
 */
export function enRetard(plage, publiee) {
  const p = plafond(plage);
  if (p.majeure === Infinity) return false;
  const m = String(publiee).match(/^v?(\d+)(?:\.(\d+))?/);
  if (!m) return false;
  const majeure = Number(m[1]);
  const mineure = m[2] === undefined ? 0 : Number(m[2]);
  if (majeure !== p.majeure) return majeure > p.majeure;
  return p.mineure !== Infinity && mineure > p.mineure;
}

/**
 * Interroge le registre pour l'étiquette `latest` de chaque paquet.
 *
 * Une requête par paquet, en parallèle, sur le point d'entrée « abrégé » du
 * registre : quelques kilo-octets par paquet au lieu du document complet, qui
 * atteint plusieurs mégaoctets pour un paquet ancien.
 *
 * @param {string[]} noms
 * @param {{ fetchImpl?: typeof fetch, registre?: string }} [options]
 * @returns {Promise<Record<string, string | null>>}
 */
export async function versionsPubliees(noms, options = {}) {
  const { fetchImpl = fetch, registre = REGISTRE } = options;
  const entrees = await Promise.all(
    noms.map(async nom => {
      try {
        const reponse = await fetchImpl(
          `${registre}/${nom.replace('/', '%2f')}`,
          {
            headers: { accept: 'application/vnd.npm.install-v1+json' },
          }
        );
        if (!reponse?.ok) return [nom, null];
        const corps = await reponse.json();
        return [nom, corps?.['dist-tags']?.latest ?? null];
      } catch {
        // Un registre injoignable n'est pas un plafond : la ligne dira
        // « inconnue » plutôt que d'inventer un retard.
        return [nom, null];
      }
    })
  );
  return Object.fromEntries(entrees);
}

/**
 * Confronte les plages déclarées aux versions publiées.
 *
 * @param {Record<string, string>} declarations
 * @param {Record<string, string | null>} publiees
 * @returns {{ nom: string, plage: string, publiee: string | null, verdict: 'retard' | 'ok' | 'inconnue' }[]}
 */
export function analyse(declarations, publiees) {
  return Object.entries(declarations)
    .map(([nom, plage]) => {
      const publiee = publiees[nom] ?? null;
      const verdict = !publiee
        ? 'inconnue'
        : enRetard(plage, publiee)
          ? 'retard'
          : 'ok';
      return { nom, plage, publiee, verdict };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

/** Le tableau, en Markdown : lisible en terminal comme en résumé de job. */
export function format(lignes) {
  const retards = lignes.filter(l => l.verdict === 'retard');
  const inconnues = lignes.filter(l => l.verdict === 'inconnue');
  if (!retards.length) {
    return `✅ ${lignes.length} plages examinées, aucun plafond derrière la majeure publiée.${
      inconnues.length
        ? `\n(${inconnues.length} version${inconnues.length > 1 ? 's' : ''} non lue${inconnues.length > 1 ? 's' : ''} : ${inconnues.map(l => l.nom).join(', ')})`
        : ''
    }`;
  }
  const table = [
    '| Paquet | Déclaré | Publié |',
    '| --- | --- | --- |',
    ...retards.map(l => `| \`${l.nom}\` | \`${l.plage}\` | **${l.publiee}** |`),
  ].join('\n');
  return [
    `${retards.length} plafond${retards.length > 1 ? 's' : ''} sur ${lignes.length} interdi${retards.length > 1 ? 'sent' : 't'} la majeure publiée :`,
    '',
    table,
    '',
    'Chacun est soit une décision (à écrire quelque part), soit un oubli (à monter).',
    inconnues.length
      ? `\n${inconnues.length} version non lue : ${inconnues.map(l => l.nom).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {string[]} [args]
 * @returns {Promise<number>} Code de sortie.
 */
export async function run(args = []) {
  const json = args.includes('--json');
  const strict = args.includes('--strict');
  const avecDev = args.includes('--dev') || args.includes('--tous');
  const racine = fileURLToPath(new URL('..', import.meta.url));
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );

  const declarations = {
    ...pkg.peerDependencies,
    ...(avecDev ? pkg.devDependencies : {}),
  };
  const publiees = await versionsPubliees(Object.keys(declarations));
  const lignes = analyse(declarations, publiees);

  if (json) console.log(JSON.stringify({ racine, lignes }, null, 2));
  else console.log(format(lignes));

  const retards = lignes.filter(l => l.verdict === 'retard');
  // Les annotations rendent le relevé visible sur la page du job, sans quoi il
  // faut ouvrir les journaux — ce que personne ne fait pour un job vert.
  if (process.env.GITHUB_ACTIONS === 'true') {
    for (const l of retards) {
      console.log(
        `::warning title=Plafond derrière la majeure publiée::${l.nom} : le socle déclare ${l.plage}, npm publie ${l.publiee}`
      );
    }
  }
  return strict && retards.length ? 1 : 0;
}

if (estPointDEntree(import.meta.url)) {
  process.exitCode = await run(process.argv.slice(2));
}
