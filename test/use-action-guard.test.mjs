// Garde d'action (`react/use-action-guard.js`), promu de miss-supaboss.
//
// L'essentiel se teste sans React : `resolveGuard` est la décision, le hook
// n'est que son branchement sur `useOnline` et les libellés.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGuard } from '../react/use-action-guard.js';

test('rien à vérifier : l’action passe, sans motif', () => {
  const garde = resolveGuard();
  assert.equal(garde.allowed, true);
  assert.equal(garde.reason, null);
  assert.equal(garde.reasonCode, null);
  assert.deepEqual(garde.disabledProps, { 'aria-disabled': undefined });
});

test('hors ligne : le code est stable, le texte vient des libellés', () => {
  const garde = resolveGuard(
    { online: true },
    { isOnline: false, labels: { offline: 'Indisponible hors ligne' } }
  );
  assert.equal(garde.allowed, false);
  assert.equal(garde.reasonCode, 'offline', 'le code se teste sans le texte');
  assert.equal(garde.reason, 'Indisponible hors ligne');
  assert.deepEqual(garde.disabledProps, { 'aria-disabled': true });
});

test('le PREMIER motif bloquant est celui qui s’affiche', () => {
  // « Hors ligne » avant « réservé aux référents » : être au mauvais endroit
  // ne sert à rien si le réseau manque. L'ordre des vérifications est l'ordre
  // des explications.
  const garde = resolveGuard(
    {
      online: true,
      checks: [
        { code: 'admin', blocked: true, message: 'Réservé aux référents' },
      ],
    },
    { isOnline: false, labels: { offline: 'Hors ligne' } }
  );
  assert.equal(garde.reasonCode, 'offline');

  const enLigne = resolveGuard(
    {
      online: true,
      checks: [
        { code: 'readonly', blocked: false },
        { code: 'admin', blocked: true, message: 'Réservé aux référents' },
      ],
    },
    { isOnline: true }
  );
  assert.equal(enLigne.reasonCode, 'admin');
  assert.equal(enLigne.reason, 'Réservé aux référents');
});

test('un motif sans message retombe sur le libellé du code, sinon le code', () => {
  const avecLibelle = resolveGuard(
    { checks: [{ code: 'readonly', blocked: true }] },
    { labels: { readonly: 'Données non synchronisées' } }
  );
  assert.equal(avecLibelle.reason, 'Données non synchronisées');

  // Un code brut à l'écran est un bug VISIBLE — préférable à un blocage muet.
  const sansRien = resolveGuard({ checks: [{ code: 'quota', blocked: true }] });
  assert.equal(sansRien.reason, 'quota');
});

test('wrap : le clic d’une action bloquée ne déclenche RIEN', () => {
  // Un lecteur d'écran qui ignore aria-disabled, ou un test, peut cliquer :
  // la fonction enveloppée doit être inerte.
  let appels = 0;
  const bloque = resolveGuard({ checks: [{ code: 'x', blocked: true }] });
  bloque.wrap(() => {
    appels += 1;
  })();
  assert.equal(appels, 0);

  const permis = resolveGuard({});
  const somme = permis.wrap((a, b) => a + b);
  assert.equal(
    somme(2, 3),
    5,
    'permise, la fonction garde arguments et retour'
  );
});

test('exiger le réseau sans le perdre ne bloque pas', () => {
  const garde = resolveGuard({ online: true }, { isOnline: true });
  assert.equal(garde.allowed, true);
});
