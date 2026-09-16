/**
 * La garde de l'ÉCRAN D'ENTRÉE — ce que voit un visiteur qui n'est pas encore
 * entré, et qui n'entrera peut-être jamais.
 *
 * POURQUOI CE MODULE EXISTE. Trois fois en un mois, la même famille de défaut a
 * frappé le parc, et trois fois elle n'a été trouvée qu'en production :
 *
 *  1. `UpdatePrompt` — donc `registerSW` — monté dans le gabarit d'écran : AUCUN
 *     service worker ne s'enregistrait tant que l'accueil n'était pas franchi.
 *  2. `ConsentBanner` monté derrière la porte : quatre apps ne posaient JAMAIS
 *     la question du consentement.
 *  3. `usePageViews` monté derrière la porte : trois apps n'envoyaient AUCUNE
 *     vue de page, même après le correctif du socle 4.20.0 — il rejoue une vue
 *     tentée, et aucune ne l'était.
 *
 * À chaque fois, l'app compile, les tests unitaires passent, la CI est verte :
 * le composant est bien écrit, il est juste monté au mauvais endroit. Seul un
 * chargement RÉEL en état « pas encore entré » le voit.
 *
 * CE QUI EST VÉRIFIÉ, ET PAS AUTRE CHOSE. Ces trois propriétés valent sur
 * l'écran d'entrée, pas ailleurs : c'est là qu'elles ont cassé, et c'est là
 * qu'un visiteur non connecté passe tout son temps.
 *
 * Usage (e2e/entree.spec.ts) :
 *   import { test, expect } from '@playwright/test';
 *   import { expectEcranEntreeCable } from '@mister-guiiug/dev-pwa-config/playwright-entree';
 *
 *   test('@critical l’écran d’entrée est câblé', async ({ page }) => {
 *     await expectEcranEntreeCable(page, expect, { url: '/miss-uwh/' });
 *   });
 *
 * LA MESURE DEMANDE UN IDENTIFIANT AU BUILD. Sans `VITE_GA_MEASUREMENT_ID`,
 * `ConsentBanner` ne rend rien — il n'y a rien à demander — et les deux
 * vérifications liées au consentement n'ont pas d'objet. Passer un identifiant
 * FACTICE dans le `.env` du mode e2e (`VITE_GA_MEASUREMENT_ID=G-E2E0000000`)
 * suffit : les appels vers Google sont interceptés ici, rien ne sort. Le format
 * est validé par `parseGaMeasurementId` — `G-` suivi de dix caractères.
 */

/** Sélecteurs posés par `ConsentBanner`. */
const BANDEAU = '[data-dwc="consent-banner"]';
const ACCEPTER = '[data-dwc="consent-accept"]';

/**
 * Coupe tout trafic vers Google. La garde lit `window.dataLayer`, que `gtag`
 * remplit AVANT que le script distant soit chargé : bloquer ne cache donc rien
 * et rend la vérification déterministe, sans dépendre du réseau en CI.
 *
 * @param {any} page Page Playwright.
 */
export async function bloqueGoogle(page) {
  await page.route(/googletagmanager\.com|google-analytics\.com/u, route =>
    route.fulfill({ status: 204, body: '' })
  );
}

/**
 * Les vues de page présentes dans `dataLayer`, quelle que soit la forme.
 *
 * GA4 pousse l'objet `arguments` (`['event', 'page_view', {…}]`), GTM pousse un
 * objet (`{ event: 'page_view', … }`). Les deux comptent.
 *
 * @param {any} page Page Playwright.
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export function litVuesDePage(page) {
  return page.evaluate(() => {
    const couche = /** @type {any[]} */ (globalThis.dataLayer ?? []);
    return couche
      .map(entree => {
        if (entree && typeof entree.length === 'number') {
          const [commande, nom, params] = [...entree];
          return commande === 'event' && nom === 'page_view'
            ? (params ?? {})
            : null;
        }
        return entree?.event === 'page_view' ? entree : null;
      })
      .filter(Boolean);
  });
}

/**
 * Le service worker s'est-il enregistré ?
 * @param {any} page Page Playwright.
 */
export function litServiceWorkers(page) {
  return page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return -1; // non pris en charge
    const liste = await navigator.serviceWorker.getRegistrations();
    return liste.length;
  });
}

/** Attend qu'un prédicat asynchrone devienne vrai, sans jamais lever soi-même. */
async function patiente(lecture, estVrai, timeout, pas = 250) {
  const fin = Date.now() + timeout;
  let dernier = await lecture();
  while (Date.now() < fin) {
    if (estVrai(dernier)) return dernier;
    await new Promise(r => setTimeout(r, pas));
    dernier = await lecture();
  }
  return dernier;
}

/**
 * La garde complète.
 *
 * @param {any} page Page Playwright.
 * @param {any} expect `expect` de `@playwright/test`.
 * @param {{
 *   url?: string,
 *   serviceWorker?: boolean,
 *   consentement?: boolean,
 *   vueDePage?: boolean,
 *   timeout?: number,
 * }} [options]
 *
 * `serviceWorker: false` pour une app qui n'en enregistre pas ;
 * `consentement: false` quand le build e2e n'a pas d'identifiant de mesure —
 * mais alors la vue de page ne peut pas être vérifiée non plus, et le dire
 * vaut mieux que de vérifier à vide.
 */
export async function expectEcranEntreeCable(page, expect, options = {}) {
  const {
    url = '/',
    serviceWorker = true,
    consentement = true,
    vueDePage = consentement,
    timeout = 15_000,
  } = options;

  if (vueDePage && !consentement) {
    throw new Error(
      'expectEcranEntreeCable : `vueDePage` sans `consentement` ne peut pas ' +
        'être vérifié — rien ne part avant l’accord. Demander les deux, ou aucun.'
    );
  }

  await bloqueGoogle(page);
  await page.goto(url);

  if (consentement) {
    // 1. LA QUESTION EST-ELLE POSÉE ? Un bandeau monté derrière la porte ne
    // rend rien, et l'app paraît simplement ne pas mesurer.
    await expect(
      page.locator(BANDEAU),
      'le bandeau de consentement doit être visible sur l’écran d’entrée — ' +
        's’il ne l’est pas, il est monté derrière la porte (ou aucun ' +
        'VITE_GA_MEASUREMENT_ID n’a été passé au build e2e)'
    ).toBeVisible({ timeout });

    await page.locator(ACCEPTER).click();
  }

  if (vueDePage) {
    // 2. UNE VUE PART-ELLE ? C'est le défaut du 16/09/2026 : le hook vivait
    // dans le gabarit monté APRÈS l'écran d'entrée, donc aucune vue n'était
    // même tentée, et le rejeu du socle n'avait rien à rejouer.
    const vues = await patiente(
      () => litVuesDePage(page),
      liste => liste.length > 0,
      timeout
    );
    expect(
      vues.length,
      'aucune vue de page après l’accord : `usePageViews` n’est pas monté sur ' +
        'l’écran d’entrée. La corriger en faisant DÉCLARER sa vue par l’écran ' +
        'lui-même, plutôt qu’en recopiant la condition de la porte.'
    ).toBeGreaterThan(0);
  }

  if (serviceWorker) {
    // 3. LE SERVICE WORKER S'ENREGISTRE-T-IL ? `UpdatePrompt` appelle
    // `registerSW` : monté derrière la porte, rien n'est mis en cache tant que
    // l'écran d'entrée n'est pas franchi, et l'app n'existe pas hors ligne.
    const nombre = await patiente(
      () => litServiceWorkers(page),
      n => n !== 0,
      timeout
    );
    if (nombre !== -1) {
      expect(
        nombre,
        'aucun service worker enregistré sur l’écran d’entrée : le composant ' +
          'qui appelle `registerSW` est monté derrière la porte — rien n’est ' +
          'mis en cache tant qu’elle n’est pas franchie'
      ).toBeGreaterThan(0);
    }
  }
}
