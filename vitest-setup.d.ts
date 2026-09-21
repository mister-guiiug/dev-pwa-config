// Déclarations de types pour le setup Vitest partagé.
//
// Réexporte l'augmentation de types de jest-dom (`declare module 'vitest'`) afin
// que les fichiers de test du consommateur voient les matchers (`toBeInTheDocument`,
// `toHaveTextContent`, …) via tsc — l'import runtime vit dans `vitest-setup.js`,
// mais tsc ne suit pas un `.js` sans types, d'où ce `.d.ts` qui rétablit
// l'augmentation. Requiert `@testing-library/jest-dom` côté consommateur.
import '@testing-library/jest-dom/vitest';

/**
 * `createObjectURL` de cet environnement est-elle utilisable ? Sonde plutôt
 * qu'écrase : jsdom 30.1.0 la fait LEVER sous Vitest, mais l'implémentation
 * redeviendra correcte un jour.
 */
export declare function urlObjetUtilisable(portee?: typeof globalThis): boolean;

/**
 * Pose une `createObjectURL` de test — une URL `blob:` unique par objet — et
 * rend la table des URL vivantes, pour qu'un test puisse vérifier qu'elles ont
 * bien été révoquées.
 */
export declare function installeUrlObjet(
  portee?: typeof globalThis
): Map<string, unknown>;
