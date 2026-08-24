#!/usr/bin/env node
/**
 * Capture les applications de la famille pour la vitrine du showroom.
 *
 *   npm run screenshots              # les quinze apps web
 *   npm run screenshots -- miss-dice mister-qowa
 *
 * POURQUOI UN SCRIPT. Le showroom sait déjà afficher une vraie capture à la
 * place de l'aperçu généré (`showroom/screenshots.js`), mais rien ne les
 * produisait : « déposer un WebP portrait » restait une consigne, donc un
 * dossier vide. Quinze captures prises à la main dérivent aussi, et sans
 * outillage personne ne les reprend.
 *
 * CE QUE LE SCRIPT GARANTIT, ET QU'UNE CAPTURE MANUELLE NE GARANTIT PAS :
 *   - même cadre pour toutes (540 × 1170, le 9/19.5 d'un téléphone) ;
 *   - même langue, même schéma clair, animations coupées — deux passages
 *     donnent le même fichier, donc un diff Git lisible ;
 *   - WebP à qualité 78 : une capture PNG pleine résolution pèse dix fois plus,
 *     et ces images sont des aperçus, pas des documents.
 *
 * PRÉREQUIS. `playwright-core` (ou `playwright`) et `sharp`, tous deux peers
 * OPTIONNELS du paquet — ce script n'est pas publié, il n'ajoute donc aucune
 * dépendance aux applications. Le navigateur doit être installé
 * (`npx playwright install chromium`), ou son chemin donné dans
 * `CHROMIUM_PATH`.
 *
 * Les captures ne sont PAS engendrées en CI : elles demandent un accès réseau
 * aux applications déployées, et une image commitée sans relecture humaine
 * n'aurait pas sa place dans un dépôt de configuration.
 *
 * Après le passage : déclarer les fichiers produits dans
 * `showroom/screenshots.js`. Le script rappelle la ligne exacte à ajouter.
 */
import { mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FAMILY_APPS } from '../apps-catalog.js';

const OUT = fileURLToPath(new URL('../showroom/screenshots/', import.meta.url));

// Portrait 9/19.5 : le cadre du composant `.sr-phone` du showroom. 540 px de
// large suffisent — au-delà, on paie des octets pour une vignette.
const VIEWPORT = { width: 540, height: 1170 };

async function loadDeps() {
  const browser = await import('playwright-core').catch(() =>
    import('playwright').catch(() => null)
  );
  const sharp = await import('sharp').catch(() => null);
  if (!browser || !sharp) {
    console.error(
      'playwright-core (ou playwright) et sharp sont requis :\n' +
        '  npm i -D playwright-core sharp && npx playwright install chromium'
    );
    process.exit(1);
  }
  return { chromium: browser.chromium, sharp: sharp.default };
}

async function main() {
  const { chromium, sharp } = await loadDeps();
  const only = process.argv.slice(2);

  // L'app desktop n'a pas de page publique : son `appUrl` pointe sur le dépôt,
  // et capturer une page GitHub ne montrerait pas l'application.
  const targets = FAMILY_APPS.filter(
    a => a.platform === 'web' && (only.length === 0 || only.includes(a.id))
  );
  if (!targets.length) {
    console.error(
      `Aucune application web ne correspond à : ${only.join(', ')}`
    );
    process.exit(1);
  }

  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const captured = [];

  for (const app of targets) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      locale: 'fr-FR',
      colorScheme: 'light',
      // Deux passages doivent donner le même fichier : une animation figée à
      // un instant différent suffirait à rendre chaque diff illisible.
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    try {
      const res = await page.goto(app.appUrl, {
        waitUntil: 'load',
        timeout: 30_000,
      });
      if (!res || !res.ok())
        throw new Error(`HTTP ${res ? res.status() : '?'}`);
      // Le premier écran d'une PWA s'hydrate après le `load` : sans ce délai,
      // on capture un squelette de chargement.
      await page.waitForTimeout(2500);

      const png = await page.screenshot({ type: 'png' });
      const file = `${app.id}.webp`;
      await sharp(png)
        .webp({ quality: 78 })
        .toFile(new URL(file, `file://${OUT}`).pathname);
      const ko = Math.round(statSync(`${OUT}${file}`).size / 1024);
      captured.push({ id: app.id, file, name: app.name });
      console.log(`✅ ${app.id.padEnd(18)} ${String(ko).padStart(4)} ko`);
    } catch (error) {
      // Une app injoignable n'interrompt pas les quatorze autres.
      console.log(`⚠️  ${app.id.padEnd(18)} ${error.message.split('\n')[0]}`);
    }
    await context.close();
  }
  await browser.close();

  if (!captured.length) return;
  console.log(
    `\nÀ déclarer dans showroom/screenshots.js :\n` +
      captured
        .map(
          c =>
            `  '${c.id}': { file: '${c.file}', alt: 'Écran d’accueil de ${c.name}' },`
        )
        .join('\n')
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
