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
 * TOUS LES PLAFONDS NE SE VALENT PAS, et l'avoir ignoré a coûté un
 * ordonnancement entier. Ce dépôt déclare trente-deux peers dont vingt-deux
 * OPTIONNELLES : une peer optionnelle en conflit **n'arrête pas** `npm install`
 * — elle dit seulement que le socle se décrit mal. Une peer non optionnelle,
 * elle, fait échouer l'installation (`ERESOLVE`) et interdit réellement la
 * montée. Le 12/09/2026, sept plafonds étaient signalés ici, **deux seulement
 * mordaient** ; un chantier a été planifié derrière `@testing-library/jest-dom
 * ^6.0.0` comme s'il s'agissait d'un mur, alors que la résolution réelle passe
 * sans broncher. D'où la colonne « Mord ? ».
 *
 * ET UN PLAFOND ASSUMÉ N'EST PLUS UN OUBLI. `DECISIONS` porte ceux qu'on garde
 * volontairement, avec leur raison et leur date : la sonde les sort du tableau
 * d'action et les rappelle à part. Sans cet endroit, « écrire la décision
 * quelque part » n'arrive jamais, et la même ligne rouge revient chaque lundi
 * jusqu'à ce que plus personne ne la lise.
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
 * Les plafonds GARDÉS, et pourquoi.
 *
 * Une entrée ici est une position tenue, pas une dette : la sonde la sort du
 * tableau d'action et la rappelle en bas, avec sa raison. La retirer relance
 * le signal — c'est le geste qui rouvre la question.
 *
 * @type {Record<string, string>}
 */
export const DECISIONS = {
  typescript:
    'TypeScript 7 est une réécriture du compilateur : chantier à part, pas un effet de bord d’une montée de socle (12/09/2026).',
  vitest:
    'Le parc vient d’arriver en Vitest 4 ; la 5 se décidera une fois cette montée digérée (12/09/2026).',
  '@vitest/browser':
    'Suit `vitest` : même version majeure, donc même décision (12/09/2026).',
};

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
 * La forme d'un nom de paquet npm, et rien d'autre.
 *
 * POURQUOI UNE GARDE ICI. Ce script lit `package.json` — un fichier — et met ce
 * qu'il y trouve dans une URL qu'il appelle. Un contrôle de sécurité relève ce
 * chemin (« données de fichier dans une requête sortante »), et il a raison de
 * le faire : rien ne garantissait, avant cette ligne, que la clé lue soit un
 * nom de paquet. Une entrée malformée — `../../autre-chose`, une URL complète,
 * un nom porteur d'un `?` ou d'un `#` — était interpolée telle quelle et
 * pouvait désigner une tout autre ressource que celle qu'on croit interroger.
 *
 * La règle est celle de npm : un nom, éventuellement précédé d'un scope, en
 * minuscules, sans caractère qui ait un sens dans une URL. Ce qui n'y répond
 * pas n'est PAS interrogé — la ligne dira « inconnue », ce qui est exact.
 */
const NOM_NPM = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

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
      if (!NOM_NPM.test(nom)) return [nom, null];
      // Le chemin est RECONSTRUIT à partir de ce que la garde vient de
      // reconnaître, segment par segment : `@scope/nom` devient
      // `@scope%2fnom`, et rien d'autre ne peut s'y glisser.
      const segments = nom.split('/');
      const chemin = segments.map(s => encodeURIComponent(s)).join('%2f');
      try {
        const reponse = await fetchImpl(`${registre}/${chemin}`, {
          headers: { accept: 'application/vnd.npm.install-v1+json' },
        });
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
 * `portee` dit ce qu'un dépassement COÛTE, et c'est la moitié utile du relevé :
 *
 * - `dur`   — peer non optionnelle : un conflit fait échouer `npm install`
 *             (`ERESOLVE`). L'app ne peut pas monter avant le socle.
 * - `mou`   — peer optionnelle : npm laisse passer. Le socle se décrit mal,
 *             rien n'est bloqué.
 * - `interne` — devDependency du socle (`--dev`) : n'engage aucune app.
 *
 * Un paquet nommé dans `decisions` rend le verdict `assume` : le plafond est
 * tenu volontairement, il n'a pas à figurer parmi les choses à faire.
 *
 * @param {Record<string, string>} declarations
 * @param {Record<string, string | null>} publiees
 * @param {{ optionnelles?: Iterable<string>, peers?: Iterable<string>, decisions?: Record<string, string> }} [options]
 * @returns {{ nom: string, plage: string, publiee: string | null, verdict: 'retard' | 'assume' | 'ok' | 'inconnue', portee: 'dur' | 'mou' | 'interne', raison?: string }[]}
 */
export function analyse(declarations, publiees, options = {}) {
  const optionnelles = new Set(options.optionnelles ?? []);
  // Sans liste de peers explicite, tout ce qui est déclaré est traité comme
  // une peer : c'est le cas du relevé par défaut (sans `--dev`).
  const peers = options.peers ? new Set(options.peers) : null;
  const decisions = options.decisions ?? {};
  return Object.entries(declarations)
    .map(([nom, plage]) => {
      const publiee = publiees[nom] ?? null;
      const portee =
        peers && !peers.has(nom)
          ? 'interne'
          : optionnelles.has(nom)
            ? 'mou'
            : 'dur';
      let verdict = 'ok';
      if (!publiee) verdict = 'inconnue';
      else if (enRetard(plage, publiee))
        verdict = nom in decisions ? 'assume' : 'retard';
      const ligne = { nom, plage, publiee, verdict, portee };
      if (verdict === 'assume') ligne.raison = decisions[nom];
      return ligne;
    })
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

/** Ce qu'un dépassement coûte, en clair dans le tableau. */
const MORD = {
  dur: '**oui — `ERESOLVE`**',
  mou: 'non (peer optionnelle)',
  interne: 'non (interne au socle)',
};

/** Le tableau, en Markdown : lisible en terminal comme en résumé de job. */
export function format(lignes) {
  const retards = lignes.filter(l => l.verdict === 'retard');
  const assumes = lignes.filter(l => l.verdict === 'assume');
  const inconnues = lignes.filter(l => l.verdict === 'inconnue');
  const pied = [
    assumes.length
      ? `\n${assumes.length} plafond${assumes.length > 1 ? 's' : ''} assumé${assumes.length > 1 ? 's' : ''} :\n` +
        assumes
          .map(
            l =>
              `- \`${l.nom}\` \`${l.plage}\` (publié ${l.publiee}) — ${l.raison}`
          )
          .join('\n')
      : '',
    inconnues.length
      ? `\n${inconnues.length} version non lue : ${inconnues.map(l => l.nom).join(', ')}`
      : '',
  ].filter(Boolean);

  if (!retards.length) {
    return [
      `✅ ${lignes.length} plages examinées, aucun plafond à trancher.`,
      ...pied,
    ].join('\n');
  }
  const durs = retards.filter(l => l.portee === 'dur').length;
  const table = [
    '| Paquet | Déclaré | Publié | Mord ? |',
    '| --- | --- | --- | --- |',
    ...retards.map(
      l =>
        `| \`${l.nom}\` | \`${l.plage}\` | **${l.publiee}** | ${MORD[l.portee] ?? '—'} |`
    ),
  ].join('\n');
  return [
    `${retards.length} plafond${retards.length > 1 ? 's' : ''} sur ${lignes.length} interdi${retards.length > 1 ? 'sent' : 't'} la majeure publiée — dont ${durs} qui ${durs > 1 ? 'mordent' : 'mord'} :`,
    '',
    table,
    '',
    'Un plafond DUR est un mur : aucune app ne peut monter avant que le socle n’élargisse.',
    'Un plafond MOU est une incohérence : le socle interdit peut-être ce qu’il pratique.',
    'Chacun est soit une décision (à inscrire dans `DECISIONS`), soit un oubli (à monter).',
    ...pied,
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
  const lignes = analyse(declarations, publiees, {
    peers: Object.keys(pkg.peerDependencies ?? {}),
    optionnelles: Object.entries(pkg.peerDependenciesMeta ?? {})
      .filter(([, meta]) => meta?.optional)
      .map(([nom]) => nom),
    decisions: DECISIONS,
  });

  if (json) console.log(JSON.stringify({ racine, lignes }, null, 2));
  else console.log(format(lignes));

  // Un plafond ASSUMÉ n'est pas une chose à faire : ni annotation, ni rougeur.
  // C'est tout l'objet de `DECISIONS`.
  const retards = lignes.filter(l => l.verdict === 'retard');
  // Les annotations rendent le relevé visible sur la page du job, sans quoi il
  // faut ouvrir les journaux — ce que personne ne fait pour un job vert.
  if (process.env.GITHUB_ACTIONS === 'true') {
    for (const l of retards) {
      console.log(
        `::warning title=Plafond ${l.portee === 'dur' ? 'DUR (bloque les apps)' : 'derrière la majeure publiée'}::${l.nom} : le socle déclare ${l.plage}, npm publie ${l.publiee}`
      );
    }
  }
  return strict && retards.length ? 1 : 0;
}

if (estPointDEntree(import.meta.url)) {
  process.exitCode = await run(process.argv.slice(2));
}
