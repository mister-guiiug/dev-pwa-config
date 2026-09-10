/**
 * « Sommes-nous hors production ? » — la réponse, écrite une seule fois.
 *
 * Le paquet est servi TEL QUEL, sans étape de build : aucun indicateur ne
 * suffit seul. `import.meta.env` couvre Vite, `process.env` couvre Node (tests,
 * SSR), et les deux sont gardés par `typeof` pour rester inoffensifs dans un
 * navigateur sans bundler — où `process` n'existe pas et où le lire lèverait
 * une `ReferenceError` au premier rendu.
 *
 * MODULE INTERNE. `button.js` et `toast.js` en portaient chacun une copie
 * mot pour mot, et un troisième appelant venait de s'ajouter : c'est le moment
 * où une copie devient un module, pas celui où l'on écrit la quatrième.
 */

/** Vrai hors production. */
export function isDev() {
  // `import.meta.env` n'existe pas dans la bibliothèque standard : c'est Vite
  // qui l'ajoute. On le lit par un transtypage plutôt qu'en tirant les types
  // de Vite dans un paquet qui ne dépend pas de Vite à l'exécution.
  const meta = /** @type {{ env?: { DEV?: boolean } }} */ (
    /** @type {unknown} */ (import.meta)
  );
  if (typeof import.meta !== 'undefined' && meta.env) {
    return meta.env.DEV === true;
  }
  return (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV !== 'production'
  );
}
