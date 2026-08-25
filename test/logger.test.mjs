// Journal : ce qui compte est qu'il n'y ait PAS de second système — chaque
// ligne doit finir dans le fil d'Ariane existant, estampillée et masquée.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createLogger, setLogLevel, getLogLevel } = await import('../logger.js');
const { getBreadcrumbs, clearBreadcrumbs } = await import(
  '../react/observability.js'
);

test('chaque ligne part dans le fil d’Ariane, nommée et estampillée', () => {
  clearBreadcrumbs();
  setLogLevel('debug');
  const log = createLogger('favoris', {
    console: false,
    correlation: () => 'corr-1',
  });
  log.warn('quota atteint', { count: 51 });

  const [entry] = getBreadcrumbs();
  assert.equal(entry.category, 'favoris.warn', 'origine ET niveau');
  assert.equal(entry.message, 'quota atteint');
  assert.equal(entry.data.count, 51);
  assert.equal(entry.data.correlationId, 'corr-1', 'rattachable au reste');
});

test('le seuil filtre réellement, sans rien enregistrer', () => {
  clearBreadcrumbs();
  setLogLevel('warn');
  const log = createLogger('carte', { console: false });
  log.debug('ignoré');
  log.info('ignoré aussi');
  assert.deepEqual(getBreadcrumbs(), [], 'rien sous le seuil');
  log.error('celui-ci compte');
  assert.equal(getBreadcrumbs().length, 1);
  assert.equal(getLogLevel(), 'warn');
});

test('les données sensibles sont masquées, comme dans le fil d’Ariane', () => {
  clearBreadcrumbs();
  setLogLevel('info');
  const log = createLogger('auth', { console: false });
  log.info('connexion', { email: 'famille@exemple.fr', token: 'secret' });
  const [entry] = getBreadcrumbs();
  assert.notEqual(entry.data.token, 'secret', 'le jeton ne doit pas survivre');
});

test('un fournisseur d’identifiant cassé n’empêche pas la ligne', () => {
  clearBreadcrumbs();
  setLogLevel('info');
  const log = createLogger('net', {
    console: false,
    correlation: () => {
      throw new Error('pas d’identifiant');
    },
  });
  log.info('requête');
  assert.equal(getBreadcrumbs().length, 1, 'la ligne passe quand même');
  setLogLevel('info');
});
