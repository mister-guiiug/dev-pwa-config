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

/**
 * LE MOTIF RESTAIT FIGÉ QUAND LE MESSAGE CHANGEAIT.
 *
 * `useActionGuard` mémoïse sur une SIGNATURE du contenu de `checks` — parce
 * qu'ils arrivent en littéral, donc avec une identité neuve à chaque rendu.
 * Mais cette signature ne retenait que `[code, blocked]` : **`message` en était
 * absent**. Une app dont les motifs suivent la langue sans passer par
 * `LabelsProvider` gardait donc le texte de la langue précédente, indéfiniment.
 *
 * Les trois apps du lot hors-connexion (mister-qowa, mister-molkky,
 * mister-puzzle) l'ont contourné le même jour — deux en recalculant le motif
 * hors du hook, la troisième en s'appuyant sur un `LabelsProvider` déjà monté.
 * Un contournement que trois apps trouvent séparément est un défaut du socle.
 */
test('la signature retient le MESSAGE, pas seulement le code et l’état', async () => {
  const { createElement: h } = await import('react');
  const { setupDom, mount } = await import('./helpers/dom.mjs');
  const { useActionGuard } = await import('../react/use-action-guard.js');
  const dom = setupDom();
  try {
    // Le défaut n'apparaît qu'au RE-RENDU du même composant : un montage neuf
    // repart avec une mémoïsation vide, et le test passerait sans rien prouver.
    const vus = [];
    function Sonde({ message }) {
      vus.push(
        useActionGuard({ checks: [{ code: 'admin', blocked: true, message }] })
          .reason
      );
      return null;
    }

    const vue = await mount(h(Sonde, { message: 'Réservé aux référents' }));
    await vue.rerender(h(Sonde, { message: 'Reserved for referents' }));

    assert.equal(
      vus.at(-1),
      'Reserved for referents',
      'sans le message dans la signature, le motif reste dans la langue précédente'
    );
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('offlineMessage remplace le libellé du paquet pour le motif « hors ligne »', () => {
  // `mister-puzzle` écrit son i18n à la main, sans `LabelsProvider` : le seul
  // moyen de dire « hors ligne » dans sa langue était d'envelopper le hook.
  const garde = resolveGuard(
    { online: true, offlineMessage: 'Sin conexión: esto necesita red.' },
    { isOnline: false, labels: { offline: 'Indisponible hors ligne' } }
  );
  assert.equal(garde.reasonCode, 'offline', 'le code ne change pas');
  assert.equal(garde.reason, 'Sin conexión: esto necesita red.');

  // Absent : le libellé du paquet, comme avant.
  assert.equal(
    resolveGuard(
      { online: true },
      { isOnline: false, labels: { offline: 'X' } }
    ).reason,
    'X'
  );
  // En ligne : aucun motif, quel que soit le message fourni.
  assert.equal(
    resolveGuard({ online: true, offlineMessage: 'Y' }, { isOnline: true })
      .reason,
    null
  );
});
