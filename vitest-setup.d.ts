// Déclarations de types pour le setup Vitest partagé.
//
// Réexporte l'augmentation de types de jest-dom (`declare module 'vitest'`) afin
// que les fichiers de test du consommateur voient les matchers (`toBeInTheDocument`,
// `toHaveTextContent`, …) via tsc — l'import runtime vit dans `vitest-setup.js`,
// mais tsc ne suit pas un `.js` sans types, d'où ce `.d.ts` qui rétablit
// l'augmentation. Requiert `@testing-library/jest-dom` côté consommateur.
import '@testing-library/jest-dom/vitest';
