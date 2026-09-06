/**
 * « CE MODULE EST-IL LE PROGRAMME QU'ON A LANCÉ ? »
 *
 * Les bins du paquet sont aussi des modules : leurs tests les importent pour
 * appeler `run()`, `diagnose()` ou `format()` sans rien exécuter. D'où un
 * garde en fin de fichier, qui ne déclenche le travail qu'en ligne de commande.
 *
 * CE QUE LE GARDE PRÉCÉDENT RATAIT. Il comparait `import.meta.url` à
 * `pathToFileURL(process.argv[1])`. Or ces deux chemins ne désignent le même
 * fichier que lorsqu'aucun lien ne se trouve sur la route :
 *
 *   - Node résout le realpath du module d'entrée pour `import.meta.url` ;
 *   - il laisse `process.argv[1]` sur le chemin tel qu'on l'a tapé.
 *
 * Sous POSIX, `npm` installe `node_modules/.bin/pwa-doctor` en LIEN
 * SYMBOLIQUE vers `../@mister-guiiug/dev-pwa-config/scripts/pwa-doctor.mjs`.
 * Les deux chemins diffèrent, le garde est faux, et le bin s'arrête en
 * silence avec le code 0 — une CI verte qui ne contrôle rien. C'est ce qui
 * s'est produit sur toute la famille : mesuré le 06/09/2026 sur le run 34045499498
 * de mister-miss-koh, où `npx pwa-doctor` dure 0,31 s sans imprimer sa ligne
 * de résumé, pourtant inconditionnelle.
 *
 * Sous Windows, `npm` pose un cmd-shim qui passe un chemin bourré de `..` :
 * `pathToFileURL` les normalise, le garde tenait, et personne ne voyait rien.
 * Sauf avec un `node_modules` monté en jonction — le même symptôme, relevé
 * dans le parc bien avant qu'on en comprenne la cause.
 *
 * COMPARER DES REALPATH règle les quatre cas d'un coup : lien symbolique
 * POSIX, cmd-shim Windows, jonction Windows, et import par un test (où
 * `argv[1]` est le fichier du lanceur de tests, un autre fichier pour de bon).
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Vrai quand le module désigné par `urlDuModule` est celui que Node a lancé.
 *
 * @param {string} urlDuModule `import.meta.url` de l'appelant.
 * @returns {boolean}
 */
export function estPointDEntree(urlDuModule) {
  const lance = process.argv[1];
  if (!lance) return false;
  try {
    return realpathSync(lance) === realpathSync(fileURLToPath(urlDuModule));
  } catch {
    // Un `argv[1]` qui ne désigne aucun fichier n'est pas ce module.
    return false;
  }
}
