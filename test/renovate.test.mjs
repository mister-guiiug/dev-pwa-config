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
  'github>mister-guiiug/dev-wpa-config//renovate/default.json';

test('le préréglage partagé : recommandé, tableau de bord, samedi matin, regroupements', () => {
  const preset = json('../renovate/default.json');
  assert.ok(preset.extends.includes('config:recommended'));
  assert.ok(preset.extends.includes(':dependencyDashboard'));
  assert.equal(preset.timezone, 'Europe/Paris');
  assert.deepEqual(preset.schedule, ['before 7am on saturday']);
  const groupes = preset.packageRules.map(rule => rule.groupName);
  assert.ok(groupes.includes('npm (mineur & patch)'));
  assert.ok(groupes.includes('github-actions'));
  const socle = preset.packageRules.find(rule =>
    rule.matchPackageNames?.includes('@mister-guiiug/dev-wpa-config')
  );
  assert.ok(socle, 'le socle a sa propre règle');
  assert.deepEqual(
    socle.schedule,
    ['at any time'],
    'le socle sort quand il sort'
  );
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
