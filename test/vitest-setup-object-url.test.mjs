/**
 * `URL.createObjectURL` : le trou que le couple Vitest 5 / jsdom 30.1 a ouvert,
 * et que `vitest-setup` bouche.
 *
 * LE DÉFAUT QUE CE TEST REND IMPOSSIBLE À REPRODUIRE. jsdom n'a jamais
 * implémenté `createObjectURL` ; c'est Vitest qui la fournit dans son
 * environnement jsdom, en retrouvant l'objet d'implémentation du Blob par « le
 * premier symbole propre » de l'instance — sa source commente ce passage par
 * « this is cursed ». jsdom 30.0.1 exposait un `Symbol(impl)` ; jsdom 30.1.0
 * n'en expose plus aucun, et tout appel lève
 * `Cannot read properties of undefined (reading '_buffer')`.
 *
 * Constaté le 18/09/2026 sur `miss-uwh` : son test de téléchargement du bilan
 * PDF passe par `downloadBlob` du socle, donc par cette API. Isolé à la seule
 * variable — jsdom 30.0.1 vert, 30.1.0 rouge, tout le reste égal.
 *
 * CE QUE CE TEST SIMULE, ET POURQUOI. Le socle n'a ni Vitest ni jsdom 30.1 en
 * dépendance : reproduire le symbole manquant demanderait les deux. Ce qui est
 * simulé est donc l'OBSERVABLE — une `createObjectURL` qui lève — car c'est
 * exactement ce que le correctif sonde. Le lien avec la cause réelle est fait
 * ci-dessus et vérifié à la main.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

/** Charge `vitest-setup.js` hors de Vitest, ses deux imports doublés. */
async function chargerVitestSetup() {
  const sources = new Map([
    ['vitest', 'export const vi = { mock: () => {} };'],
    ['@testing-library/jest-dom/vitest', 'export {};'],
  ]);
  const hooks = registerHooks({
    resolve: (spec, ctx, suite) =>
      sources.has(spec)
        ? { url: `dwc-double:${spec}`, shortCircuit: true }
        : suite(spec, ctx),
    load: (url, ctx, suite) =>
      url.startsWith('dwc-double:')
        ? {
            format: 'module',
            source: sources.get(url.slice('dwc-double:'.length)),
            shortCircuit: true,
          }
        : suite(url, ctx),
  });
  try {
    return await import('../vitest-setup.js');
  } finally {
    hooks.deregister();
  }
}

test('une createObjectURL qui lève est remplacée, et le remplacement tient ses promesses', async () => {
  // 1. LA CAUSE, telle que Vitest la livre avec jsdom 30.1 : la méthode EXISTE,
  //    elle lève. Une garde qui ne testerait que sa présence ne verrait rien.
  const dorigine = Object.getOwnPropertyDescriptor(
    globalThis.URL,
    'createObjectURL'
  );
  let appelsCasses = 0;
  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    value: () => {
      appelsCasses++;
      return undefined._buffer; // la ligne exacte qui casse, dans son effet
    },
    writable: true,
    configurable: true,
  });

  try {
    assert.throws(
      () => globalThis.URL.createObjectURL(new Blob(['x'])),
      TypeError
    );

    // 2. LE CORRECTIF, exécuté depuis le fichier réellement publié.
    const mod = await chargerVitestSetup();
    assert.ok(
      appelsCasses > 0,
      'la sonde n’a pas appelé l’implémentation cassée'
    );

    // 3. CE QUI COMPTE : le code de téléchargement du socle peut travailler.
    const url = globalThis.URL.createObjectURL(new Blob(['pdf']));
    assert.equal(typeof url, 'string');
    assert.match(url, /^blob:/);
    const autre = globalThis.URL.createObjectURL(new Blob(['autre']));
    assert.notEqual(url, autre, 'deux objets doivent recevoir deux URL');
    assert.doesNotThrow(() => globalThis.URL.revokeObjectURL(url));

    // 4. LA SONDE NE MENT PAS DANS L’AUTRE SENS : posée sur une implémentation
    //    saine, elle la déclare utilisable et le socle s’efface. C’est ce qui
    //    fera disparaître ce correctif le jour où Vitest corrigera le sien.
    assert.equal(mod.urlObjetUtilisable(), true);
    assert.equal(
      mod.urlObjetUtilisable({ URL: {}, Blob }),
      false,
      'une portée sans createObjectURL doit être déclarée inutilisable'
    );
    assert.equal(
      mod.urlObjetUtilisable({
        URL: {
          createObjectURL() {
            throw new TypeError('cursed');
          },
        },
        Blob,
      }),
      false
    );

    // 5. `installeUrlObjet` rend le registre des URL vivantes : révoquer la
    //    retire pour de bon, sans quoi un test de fuite ne prouverait rien.
    const portee = { URL: {} };
    const vivantes = mod.installeUrlObjet(portee);
    const u = portee.URL.createObjectURL('objet');
    assert.equal(vivantes.size, 1);
    assert.equal(vivantes.get(u), 'objet');
    portee.URL.revokeObjectURL(u);
    assert.equal(vivantes.size, 0);
  } finally {
    if (dorigine)
      Object.defineProperty(globalThis.URL, 'createObjectURL', dorigine);
  }
});
