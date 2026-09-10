/**
 * Libellés des composants du paquet, en sept langues : `fr`, `en`, `es`,
 * `de`, `it`, `pt`, `nl`.
 *
 * DEUX LANGUES NE SUFFISAIENT PAS, et le repli était SILENCIEUX. Jusqu'au
 * 02/09/2026 ce fichier ne portait que `fr` et `en`, et toute autre locale
 * retombait sur le français sans erreur ni avertissement. Or la famille en
 * parle sept : `miss-contraction` (7), `miss-dice` (6), `mister-qowa` (5),
 * `miss-badminton` (3). Huit fichiers-pont dans sept apps — `AppUpdatesProvider`
 * × 2, `AppLabelsProvider`, `SocleLabels`, `SocleProviders`,
 * `SocleLabelsBridge`, `useNetworkGuard` × 2 — n'existaient que pour surcharger
 * ce que le socle ne savait pas dire. Les cinq dictionnaires ci-dessous sont
 * rapatriés de ces apps : ce n'était pas un chantier de traduction.
 *
 * LE PROBLÈME D'ORIGINE. Onze libellés étaient codés en dur en français dans six
 * composants (`'Fermer'`, `'Réessayer'`, `'Plus tard'`…). Tous étaient
 * surchargeables par prop — mais aucun pont n'existait avec `createI18n`, que
 * huit apps utilisent : chacune recâblait donc les mêmes onze chaînes, à la
 * main, dans chaque écran qui monte un composant.
 *
 * POURQUOI UN CONTEXTE À PART, et pas celui de `createI18n`. `createI18n`
 * fabrique un contexte ISOLÉ par app, avec son propre dictionnaire métier : le
 * paquet ne peut pas le lire, et n'a pas à imposer ses clés dedans. Ce contexte
 * n'est donc chargé que des libellés des composants — une quinzaine de chaînes,
 * rien d'autre.
 *
 * TROIS NIVEAUX, dans cet ordre : la **prop** l'emporte toujours, puis le
 * **contexte**, puis le **français par défaut**. Une app qui ne fait rien
 * obtient exactement ce qu'elle avait avant — aucune rupture.
 *
 *   import { LabelsProvider } from '@mister-guiiug/dev-pwa-config/react/labels';
 *
 *   const { locale } = useI18n();          // le i18n de l'app
 *   <LabelsProvider locale={locale}>…</LabelsProvider>
 *
 * Pour changer un mot sans changer de langue :
 *
 *   <LabelsProvider locale="fr" overrides={{ sheet: { close: 'Retour' } }}>
 *
 * DEPUIS LA 4.10, CE FICHIER EST L'ENTRÉE COMPLÈTE, PAS LE NOYAU. Les sept
 * dictionnaires sont sept modules (`react/labels-fr` … `react/labels-nl`), et
 * le contexte vit dans `react/labels-core`, qui n'embarque que le français.
 * Rien ne change pour qui importe d'ici : `LABELS`, `labelsFor`,
 * `LabelsProvider`, `useLabels` et `mergeLabels` ont le même sens et le même
 * comportement. Ce qui change est ce qu'une app PAIE — les composants du
 * paquet n'atteignent plus que le français, au lieu de tirer les sept langues
 * derrière le moindre `<ErrorBanner>`.
 */

import { createElement } from 'react';

import {
  DEFAULT_LOCALE,
  LabelsProvider as ProviderNoyau,
  mergeLabels,
  useLabels,
} from './labels-core.js';
import fr from './labels-fr.js';
import en from './labels-en.js';
import es from './labels-es.js';
import de from './labels-de.js';
import it from './labels-it.js';
import pt from './labels-pt.js';
import nl from './labels-nl.js';

export { DEFAULT_LOCALE, mergeLabels, useLabels };

/**
 * Les sept dictionnaires, indexés par locale — inchangé.
 *
 * DEPUIS LE 10/09/2026, ILS VIVENT DANS SEPT MODULES. Ce qui était un unique
 * objet littéral l'est resté ici, à l'octet près ; mais chaque langue est
 * désormais un module à part, donc une application qui n'importe de ce fichier
 * que `useLabels` n'embarque plus aucune des sept — l'élagage peut enfin les
 * atteindre. Celle qui lit `LABELS` ou appelle `labelsFor` les embarque toutes,
 * comme avant : c'est ce qu'elle demande.
 *
 * @type {Record<string, import('./labels-core.js').LabelGroups>}
 */
export const LABELS = { fr, en, es, de, it, pt, nl };

/**
 * Le dictionnaire d'une locale, ou `null`.
 *
 * `pt-BR`, `de-CH`, `es-419` : une étiquette régionale retombe sur sa langue
 * avant de retomber sur le français — `createI18n` passe parfois l'étiquette
 * complète, et « pt-BR → français » serait le même repli silencieux que ce
 * fichier a fermé.
 */
export function labelsFor(locale) {
  if (typeof locale !== 'string' || !locale) return null;
  const exact = LABELS[locale] ?? LABELS[locale.toLowerCase()];
  if (exact) return exact;
  const language = locale.toLowerCase().split(/[-_]/)[0];
  return LABELS[language] ?? null;
}

/**
 * Fournit les libellés aux composants du paquet, dans les sept langues.
 *
 * C'est le provider HISTORIQUE, au comportement inchangé : la locale est
 * résolue ici, synchronement, contre les sept dictionnaires, puis le
 * dictionnaire retenu est passé au noyau. Aucun chargement différé n'a été
 * introduit — les libellés d'un bouton ne peuvent pas arriver après lui.
 *
 * @param {{ locale?: string, dictionary?: object, overrides?: object,
 *   children?: unknown }} props
 */
export function LabelsProvider(props = {}) {
  const { locale = DEFAULT_LOCALE, dictionary, ...reste } = props;
  return createElement(ProviderNoyau, {
    ...reste,
    locale,
    // Une locale inconnue retombe sur le français plutôt que sur un objet vide :
    // un libellé manquant est un bouton sans nom accessible.
    dictionary: dictionary ?? labelsFor(locale) ?? LABELS[DEFAULT_LOCALE],
  });
}
