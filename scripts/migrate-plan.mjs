/**
 * LA DÉCISION de `migrate-consumers.mjs`, séparée de son exécution.
 *
 * Le script est un OUTIL : son point d'entrée balaie les dossiers frères et
 * lance `npm install` dès qu'on le charge. Ce qu'il décide — quels dossiers
 * sont des consommateurs, et quelles lignes monter — est de la DONNÉE, et se
 * teste. Même séparation que `adoption-equivalents.mjs` pour le relevé.
 *
 * Non publié (absent de `files`) : outillage de développement du dépôt.
 */

/**
 * MIROIRS PUBLICS — jamais modifiés par une migration.
 *
 * `mister-family-map` est un miroir de `elowner-ax/bac-sable`, publié à la
 * main par `npm run mirror`. Une PR y est interdite, et le développement se
 * fait dans le dépôt privé. L'auto-découverte le trouvait pourtant, puisqu'il
 * déclare bien le paquet : lancé avec `--write`, le script y écrivait une
 * modification qui n'aurait jamais dû exister — et qu'un `mirror` suivant
 * aurait écrasée en silence, donc sans que personne ne s'en aperçoive.
 *
 * La SOURCE reste découverte normalement : ce sont deux dossiers distincts.
 */
export const MIRRORS = new Set(['mister-family-map']);

/** Le paquet dont ce dépôt est la source. */
export const PKG_NAME = '@mister-guiiug/dev-wpa-config';

/** Le consommateur déclare-t-il ce paquet ? Rend `[section, range]` ou `null`. */
export function findDep(pkg, name) {
  for (const section of ['dependencies', 'devDependencies']) {
    if (pkg?.[section]?.[name] != null) return [section, pkg[section][name]];
  }
  return null;
}

/** Borne basse majeure d'un range semver simple (`^1.2.3` → 1, `0.469.0` → 0). */
export function majorOf(range) {
  const m = String(range).match(/(\d+)\./);
  return m ? Number(m[1]) : null;
}

/** Un dossier frère est-il un consommateur à migrer ? */
export function isConsumerDir(name, pkg) {
  if (name === 'dev-wpa-config' || MIRRORS.has(name)) return false;
  return findDep(pkg, PKG_NAME) != null;
}

/**
 * Ce qu'il faut changer dans un `package.json` de consommateur.
 *
 * `withPeers` EST FAUX PAR DÉFAUT, et c'est le point. Aligner les peers paraît
 * anodin tant que le parc est homogène — il ne l'est pas. `mister-quota`,
 * seule app Electron, est restée sur React 18, Vite 5, TypeScript 5, Vitest 2
 * et ESLint 8 : un simple « aligne le plancher du socle » y proposait donc
 * CINQ MONTÉES MAJEURES, c'est-à-dire une migration de cadre complète, dans le
 * même geste et sans la nommer. Deux intentions distinctes méritent deux
 * drapeaux.
 *
 * @param {object} pkg Le `package.json` du consommateur.
 * @param {{ target: string, peers?: object, withPeers?: boolean }} options
 */
export function planUpdates(pkg, options) {
  const { target, peers = {}, withPeers = false } = options;
  const updates = [];

  const own = findDep(pkg, PKG_NAME);
  if (own && own[1] !== target) {
    updates.push({ section: own[0], name: PKG_NAME, from: own[1], to: target });
  }

  if (!withPeers) return updates;

  for (const [name, peerRange] of Object.entries(peers)) {
    const dep = findDep(pkg, name);
    if (!dep) continue;
    const want = majorOf(peerRange);
    const have = majorOf(dep[1]);
    if (want != null && have != null && have < want) {
      updates.push({ section: dep[0], name, from: dep[1], to: peerRange });
    }
  }
  return updates;
}
