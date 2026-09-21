// Renovate hébergé par le socle : le préréglage que les apps étendent, la
// configuration auto-hébergée, et le workflow qui la lance.
//
// POURQUOI CES TESTS. Le 02/09/2026, treize apps étendaient un préréglage dans
// un dépôt `.github` inexistant, et personne ne l'a su pendant des mois : un
// préréglage cassé ne fait pas de bruit, il ne fait rien. Ces tests figent ce
// qui doit rester vrai pour que Renovate tourne — et ne touche jamais le miroir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));

export const PRESET =
  'github>mister-guiiug/dev-pwa-config//renovate/default.json';

test('le préréglage partagé : recommandé, tableau de bord, samedi matin, regroupements', () => {
  const preset = json('../renovate/default.json');
  assert.ok(preset.extends.includes('config:recommended'));
  assert.ok(preset.extends.includes(':dependencyDashboard'));
  assert.equal(preset.timezone, 'Europe/Paris');
  assert.deepEqual(preset.schedule, ['before 7am on saturday']);
  const groupes = preset.packageRules.map(rule => rule.groupName);
  assert.ok(groupes.includes('npm (mineur & patch)'));
  assert.ok(groupes.includes('github-actions'));

  // Le compte n'est pas fait que de PWA : quatre dépôts publics vivent sur
  // cargo, nuget ou les seules actions GitHub. Sans règle pour eux, chaque
  // mise à jour mineure y arrive en PR séparée — le bruit qui fait qu'on
  // cesse de les lire.
  const autres = preset.packageRules.find(
    rule => rule.groupName === 'dépendances (mineur & patch)'
  );
  assert.ok(autres, 'les écosystèmes hors npm sont groupés eux aussi');
  for (const manager of ['cargo', 'nuget']) {
    assert.ok(
      autres.matchManagers.includes(manager),
      `${manager} est utilisé par un dépôt public du compte`
    );
  }
  const socle = preset.packageRules.find(rule =>
    rule.matchPackageNames?.includes('@mister-guiiug/dev-pwa-config')
  );
  assert.ok(socle, 'le socle a sa propre règle');
  assert.deepEqual(
    socle.schedule,
    ['at any time'],
    'le socle sort quand il sort'
  );
});

/*
 * LE PLAFOND SUR TYPESCRIPT, ET LA RAISON DE SON EXCEPTION.
 *
 * Dix-sept PR « update dependency typescript to v7 » étaient ouvertes le
 * 19/09/2026, toutes rouges, la plus ancienne du 15. Elles revenaient parce que
 * rien dans ce préréglage ne parlait de TypeScript — un refus qui n'est écrit
 * nulle part se reprend à chaque passage du robot.
 *
 * Elles ne pouvaient pas aboutir : `typescript-eslint` lève à l'import dès que
 * `require('typescript').versionMajorMinor` atteint 7, donc ESLint meurt pour
 * TOUS les fichiers. Sa plage de pairs le dit aussi — `>=4.8.4 <6.1.0`, canary
 * comprise.
 *
 * `matchCurrentVersion` est la clé de voûte : le plafond ne s'applique qu'aux
 * dépôts DÉJÀ en 6.x. Les deux qui ont franchi faute d'ESLint —
 * `vscode-sops-diff` et le front de `mister-commitia`, tous deux en 7.0.2 —
 * en sortent d'eux-mêmes et gardent leurs correctifs 7.x. Une règle qui porte
 * son exception vaut mieux qu'une dérogation à recopier dans deux dépôts.
 */
test('typescript est plafonné sous la 7, sauf là où il l’a déjà franchie', () => {
  const preset = json('../renovate/default.json');
  const regle = preset.packageRules.find(r =>
    r.matchDepNames?.includes('typescript')
  );
  assert.ok(regle, 'le refus de TS 7 est ÉCRIT, pas repris à chaque PR');
  assert.equal(regle.allowedVersions, '<7');
  assert.equal(
    regle.matchCurrentVersion,
    '<7',
    'le plafond ne doit toucher que les dépôts encore en 6.x'
  );
  assert.deepEqual(regle.matchManagers, ['npm']);

  // La raison et sa condition de levée vivent dans la règle : sans elles,
  // personne ne saura quand la retirer.
  assert.match(regle.description, /typescript-eslint/);
  assert.match(regle.description, /10940/);

  // Le socle épingle la même cible en pair : les deux doivent se répondre,
  // sinon le plafond laisserait passer ce que l'installation refuse.
  const pkg = json('../package.json');
  assert.match(
    pkg.peerDependencies.typescript,
    /^~6\./,
    'la pair du socle et le plafond Renovate nomment la même génération'
  );
});

/*
 * L'ALIAS `typescript-7`, ET POURQUOI IL NE PEUT PAS SE SÉLECTIONNER PAR
 * `matchPackageNames`.
 *
 * Mesuré le 22/09/2026 par `renovate --dry-run=extract` sur un dépôt du parc,
 * pas déduit de la documentation : Renovate rend, pour
 * `"typescript-7": "npm:typescript@~7.0.2"`,
 *
 *   { depName: 'typescript-7', packageName: 'typescript',
 *     currentValue: '~7.0.2', npmPackageAlias: true, lockedVersion: '7.0.2' }
 *
 * Les DEUX dépendances portent donc le même `packageName`. Un plafond écrit sur
 * `matchPackageNames` attrape l'alias en même temps que l'original ; ici, seul
 * `matchCurrentVersion: "<7"` l'en sortait — par un effet de bord, pas par une
 * intention lisible. Les deux règles nomment maintenant leur `depName`.
 */
test('l’alias typescript-7 tient la 7, et ne peut pas glisser en 8', () => {
  const preset = json('../renovate/default.json');
  const alias = preset.packageRules.find(r =>
    r.matchDepNames?.includes('typescript-7')
  );
  assert.ok(alias, 'le second avis a sa propre règle');
  assert.equal(
    alias.allowedVersions,
    '<8',
    'l’alias n’existe que pour tenir la 7 : une 8 lui ferait perdre son objet'
  );
  assert.deepEqual(alias.matchManagers, ['npm']);

  // PAS de matchCurrentVersion ici, et c'est volontaire : le plafond doit tenir
  // quelle que soit la 7.x en place, sinon il cesserait d'agir dès le premier
  // correctif adopté.
  assert.equal(alias.matchCurrentVersion, undefined);

  // La condition de levée est nommée : cette règle meurt AVEC l'alias.
  assert.match(alias.description, /10940/);
  assert.match(alias.description, /npmPackageAlias/);
});

test('les deux règles TypeScript ne se recouvrent JAMAIS', () => {
  const preset = json('../renovate/default.json');
  const regles = preset.packageRules.filter(r =>
    r.matchDepNames?.some(n => n.startsWith('typescript'))
  );
  assert.equal(regles.length, 2, 'une règle par compilateur, pas une de plus');

  // Aucune des deux ne doit sélectionner par `packageName` : les deux
  // dépendances le partagent, la règle attraperait l'autre compilateur.
  for (const r of regles) {
    assert.equal(
      r.matchPackageNames,
      undefined,
      'sélectionner par packageName attraperait les DEUX compilateurs'
    );
  }

  // Et les jeux de noms sont disjoints : rien ne peut recevoir deux plafonds
  // contradictoires (<7 et <8) sur la même dépendance.
  const [a, b] = regles.map(r => new Set(r.matchDepNames));
  for (const nom of a) assert.ok(!b.has(nom), `${nom} est visé deux fois`);
});

test('le socle étend son propre préréglage — le même que les apps', () => {
  const config = json('../renovate.json');
  assert.deepEqual(config.extends, [PRESET]);
});

test('auto-hébergé : tous les dépôts du compte, jamais le miroir, jamais sans configuration', () => {
  const self = json('../renovate/self-hosted.json');
  assert.equal(self.platform, 'github');
  assert.equal(self.autodiscover, true);
  assert.ok(self.autodiscoverFilter.includes('mister-guiiug/*'));
  assert.ok(
    self.autodiscoverFilter.includes('!mister-guiiug/mister-family-map'),
    'le miroir public de bac-sable ne reçoit JAMAIS de PR'
  );
  assert.equal(self.onboarding, false, 'pas de PR d’accueil surprise');
  assert.equal(
    self.requireConfig,
    'required',
    'un dépôt sans renovate.json est ignoré'
  );
  const packages = self.hostRules.find(
    rule => rule.matchHost === 'npm.pkg.github.com'
  );
  assert.ok(
    packages,
    'le socle vit sur GitHub Packages : il faut s’y authentifier'
  );
});

test('renovate.yml : le samedi avant 7 h Paris, lançable à la main, et muet sans jeton', () => {
  const yml = read('../.github/workflows/renovate.yml');
  assert.match(
    yml,
    /cron: '0 4 \* \* 6'/,
    'samedi 04:00 UTC — dans la fenêtre du préréglage'
  );
  assert.match(yml, /workflow_dispatch:/);
  assert.match(
    yml,
    /renovatebot\/github-action@v\d+\.\d+\.\d+/,
    'action épinglée'
  );
  assert.match(yml, /configurationFile: renovate\/self-hosted\.json/);
  assert.match(
    yml,
    /steps\.token\.outputs\.present == 'true'/,
    'Renovate ne démarre pas sans jeton'
  );
  assert.doesNotMatch(yml, /secrets: inherit/);
});
