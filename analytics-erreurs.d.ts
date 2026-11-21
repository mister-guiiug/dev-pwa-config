/**
 * Le suivi des erreurs de PostHog — chargé par `analytics` à l'accord, et
 * seulement quand l'app fournit `errorTrackingLoader`.
 */

/**
 * Ce que le suivi des erreurs capte quand `errorTrackingLoader` est fourni —
 * passé en `capture_exceptions` : les erreurs non rattrapées et les promesses
 * rejetées sans `catch`. Jamais les `console.error`, dont le texte est ce que
 * l'app journalise.
 */
export declare const OPTIONS_SUIVI_ERREURS: Readonly<{
  capture_unhandled_errors: true;
  capture_unhandled_rejections: true;
  capture_console_errors: false;
}>;

/**
 * Nettoie un texte libre — message d'erreur, URL — avant qu'il parte : requête
 * et fragment d'URL (la route d'un `HashRouter` reste, jusqu'au premier `?`,
 * `#`, `&` ou `=`), adresses électroniques, UUID, jetons (JWT, hexadécimal,
 * base64), texte entre guillemets qui porte une espace ou dépasse quarante
 * caractères, suites de quatre chiffres ou plus. Ce qui est retiré devient un
 * marqueur (`[email]`, `[nombre]`, `[jeton]`, `[uuid]`, `?[requête]`,
 * `#[fragment]`, `[texte]`…). L'entrée est coupée à deux mille caractères
 * avant les motifs, la sortie tronquée à cinq cents.
 */
export declare function nettoieTexteLibre(texte: string): string;

/**
 * Le `before_send` posé par `prepareSuiviErreurs`. Sur un `$exception`, rend une
 * copie dont `$exception_list[].value`, `$exception_values`,
 * `$exception_message` et toute propriété d'adresse (clé finissant par `_url`,
 * `referrer` ou `pathname` : `$current_url`, `$referrer`, `$session_entry_*`,
 * `$initial_*`, y compris dans `$set` et `$set_once`) sont passés par
 * `nettoieTexteLibre`, sans `$exception_steps` ; le type et les cadres de pile
 * restent. Tout autre événement est rendu tel quel.
 */
export declare function nettoieException<T>(evenement: T): T;

/**
 * Les options qu'`analytics` ajoute à `init` quand l'app suit ses erreurs —
 * `__extensionClasses` (les seules `exceptions` et `exceptionObserver`),
 * `capture_exceptions` et `before_send`, ensemble — ou `null` si le chargeur
 * n'a pas rendu les extensions.
 */
export declare function prepareSuiviErreurs(
  chargeur: () => Promise<unknown>
): Promise<Record<string, unknown> | null>;

/**
 * Avertit en console si l'instance n'a pas pris les extensions — le signe que
 * `__extensionClasses`, option interne de posthog-js, a changé.
 */
export declare function verifieSuiviErreurs(posthog: {
  exceptions?: unknown;
  exceptionObserver?: unknown;
}): void;
