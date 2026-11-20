/**
 * i18n minimal partagé — zéro dépendance runtime (pas de react-i18next), typé
 * par dérivation des clés du dictionnaire de messages.
 *
 * `createI18n(config)` construit un contexte isolé et renvoie `{ I18nProvider,
 * useI18n }`. Chaque app fournit son propre dictionnaire `messages` (une entrée
 * par locale, même forme) et appelle `createI18n` une fois au niveau module.
 *
 * - Locale initiale : localStorage[storageKey] si valide, sinon `fallbackLocale`
 *   pour un ROBOT connu (voir plus bas), sinon `navigator.language` (2 lettres)
 *   si connue, sinon `fallbackLocale`.
 * - `setLocale` persiste dans localStorage et met à jour `lang`/`dir` sur `<html>`.
 *
 * `storageKey` EST DÉSORMAIS OPTIONNEL (défaut : `'dwc_locale'`, même famille
 * que `dwc_theme` et `dwc_app_version`). C'était le SEUL écart entre deux
 * copies locales mesurées (mister-cim10, miss-ticket-pwa : trois lignes de
 * diff, dont la clé) — et une raison de moins de copier le module. Les apps de
 * la famille partagent une même origine GitHub Pages, donc un même
 * `localStorage` : avec la clé par défaut, la langue choisie SUIT l'utilisateur
 * d'une app à l'autre (une valeur inconnue de `locales` est simplement
 * ignorée). Pour isoler une app — ou pour REPRENDRE une copie locale sans
 * perdre le choix déjà stocké — passer sa clé : le motif de la famille est
 * `'<app>_locale'`.
 * - `t(path, params)` (voir i18n-core) : dot-notation, repli, interpolation `{nom}`.
 * - `fmt.*` : nombres, dates, monnaie, pluriel — DÉJÀ liés à la locale courante.
 *
 * `fmt` REFERME LE DÉFAUT LE PLUS RÉPANDU DU DOMAINE. Mesure sur les seize
 * apps : **78 sites de formatage à locale figée** — 27 `Intl.*('xx-XX', …)` et
 * 51 `toLocale*('fr-FR')`. Le contexte rendait `{ locale, setLocale, t, m,
 * locales }` : la langue, mais aucun formateur. Le pont entre « la langue
 * choisie » et « comment on écrit les nombres » n'existait pas, donc chaque
 * écran le refaisait — ou, 78 fois, l'oubliait. `fmt.number(v)` ne nomme
 * aucune locale et suit `setLocale` sans que rien d'autre change.
 *
 * LE PROVIDER POSE AUSSI `LabelsProvider`. Les libellés des composants du
 * paquet (`Fermer`, `Réessayer`…) vivent dans un contexte séparé, qu'il
 * fallait câbler à la main (`<LabelsProvider locale={locale}>`) — un geste que
 * rien ne rappelait, et que personne ne faisait. Il est fait ici, sauf
 * `labels: false`.
 *
 * CE MODULE EMBARQUE LES SEPT LANGUES DE LIBELLÉS — `react/i18n-lite`, celles
 * qu'on lui passe. Ici, le provider résout la locale de l'app contre les sept
 * dictionnaires du paquet : une app qui parle espagnol obtient des boutons
 * espagnols sans rien déclarer. Le prix est un import STATIQUE de
 * `./labels.js` : sept dictionnaires dans l'accueil, quelles que soient les
 * `locales`, et même avec `labels: false` — le bundler ne peut pas retirer ce
 * qu'une branche pourrait atteindre. Mesuré le 20/11/2026 sur
 * `mister-uwh-tactic` : environ 48 kB bruts de libellés dans son morceau
 * `i18n` de 83, pour une app fr et en. `react/i18n-lite` porte la même
 * fonction, au même contrat, sans cet import ; on lui passe les langues
 * qu'on parle (`labels: { en }`). L'implémentation vit là-bas, ce module n'y
 * ajoute que les sept dictionnaires — les deux entrées ne peuvent donc pas
 * diverger.
 *
 * UN ROBOT REÇOIT LA LANGUE PAR DÉFAUT. Le 29/09/2026, le test en direct de la
 * Search Console a rendu `miss-contraction` EN ANGLAIS — « Start contraction »,
 * consentement en anglais — alors que la page est française (`lang="fr"`,
 * contenu servi en français) : le moteur de rendu de Google se présente en
 * `en-US`, et la détection suivait `navigator.language`. Un robot connu
 * (`isCrawlerUserAgent`, module `crawler`) reçoit donc `fallbackLocale`, la
 * langue du HTML statique. Ce n'est pas un habillage pour robots : c'est ce
 * que reçoit tout visiteur sans préférence. Une préférence STOCKÉE garde la
 * priorité — elle a été choisie, pas devinée.
 *
 * Le provider est écrit en `createElement` (pas de JSX) dans `i18n-lite.js` :
 * le package est servi tel quel, sans étape de build. La logique pure de
 * traduction vit dans `i18n-core.js`.
 *
 * @example
 *   // src/i18n/index.ts — les sept langues de libellés, sans rien déclarer
 *   import { createI18n } from '@mister-guiiug/dev-pwa-config/react/i18n';
 *   import { messages } from './messages';
 *   export const { I18nProvider, useI18n } = createI18n({
 *     messages, locales: ['fr', 'en'], fallbackLocale: 'fr',
 *   });
 *
 * @example
 *   // …ou seulement celles qu'on parle : le français, plus une ligne par langue
 *   import { createI18n } from '@mister-guiiug/dev-pwa-config/react/i18n-lite';
 *   import en from '@mister-guiiug/dev-pwa-config/react/labels-en';
 *   export const { I18nProvider, useI18n } = createI18n({
 *     messages, locales: ['fr', 'en'], fallbackLocale: 'fr', labels: { en },
 *   });
 */
import { LABELS } from './labels.js';
import { createI18n as createI18nLite } from './i18n-lite.js';

export { createTranslator, plural } from './i18n-core.js';
export { directionOf } from './i18n-lite.js';

/**
 * @param {import('./i18n.js').I18nConfig<any, string>} config
 * @returns {{ I18nProvider: (props: { children: unknown }) => unknown, useI18n: () => any }}
 */
export function createI18n(config) {
  const { labels = true } = config;
  // `true` (le défaut) : les sept langues du paquet, comme avant. Un objet de
  // dictionnaires ou `false` passent tels quels — mais les sept langues
  // restent dans le bundle, puisque ce module les importe : c'est
  // `react/i18n-lite` qui ne paie que ce qu'on lui passe.
  return createI18nLite({
    ...config,
    labels: labels === true ? LABELS : labels,
  });
}
