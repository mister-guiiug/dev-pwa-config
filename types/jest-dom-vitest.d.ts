/**
 * `@testing-library/jest-dom/vitest` tel que la vérification de types DE CE
 * DÉPÔT le lit (`paths` de `tsconfig.check.json`). Non publié : les apps
 * reçoivent l'augmentation de jest-dom elle-même, par `vitest-setup.d.ts`.
 *
 * POURQUOI. jest-dom 7.0.1 augmente `Assertion<T>`, vitest 5 déclare
 * `Assertion<R, T>`. Depuis le passage du socle à vitest 5 (#459), `tsc`
 * refusait les deux déclarations (TS2428 dans `node_modules`), et la CI du
 * socle était rouge sur toute PR. `skipLibCheck` aurait éteint la
 * vérification des `.d.ts` publiés du socle : on remplace seulement ce
 * fichier-là. Les apps passent, elles, sous `skipLibCheck`.
 *
 * Les matchers rendent `R`, comme ceux de vitest 5 (`void`, ou une promesse
 * sous `.resolves`). À retirer, avec son entrée de `paths`, quand jest-dom
 * prendra vitest 5 en charge (testing-library/jest-dom#742).
 */
import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Une fusion de déclarations : l'interface vide ÉTEND celle de vitest, et ses
// paramètres doivent porter les mêmes noms que les siens, `T` compris.
/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
declare module 'vitest' {
  interface Assertion<R, T> extends TestingLibraryMatchers<unknown, R> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<
    unknown,
    unknown
  > {}
}
/* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
