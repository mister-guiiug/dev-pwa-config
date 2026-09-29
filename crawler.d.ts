/**
 * L'agent utilisateur est-il celui d'un robot connu — moteur de recherche
 * (Googlebot, Google-InspectionTool, bingbot…), moteur de réponse (GPTBot,
 * ClaudeBot, PerplexityBot…), aperçu de lien (facebookexternalhit,
 * Twitterbot, LinkedInBot) — ou un jeton générique en `bot`, `crawler` ou
 * `spider` ?
 *
 * Sert à donner à un robot la langue PAR DÉFAUT de l'app, celle de son HTML
 * statique, plutôt que celle de `navigator.language` : le moteur de rendu de
 * Google se présente en `en-US` (Search Console, 29/09/2026). `false` pour
 * une valeur absente ou vide.
 */
export declare function isCrawlerUserAgent(
  ua: string | null | undefined
): boolean;
