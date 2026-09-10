import { createContext, createElement, useContext, useMemo } from 'react';

import { isDev } from './dev-mode.js';
import fr from './labels-fr.js';

/**
 * Le NOYAU des libellés : le contexte, le provider, le lecteur — et une seule
 * langue embarquée, le français.
 *
 * POURQUOI CE FICHIER EXISTE. `labels.js` porte les sept dictionnaires dans un
 * unique objet littéral. Un objet littéral est UNE liaison : aucun bundler ne
 * peut en retirer six langues, quelle que soit la finesse de son élagage. Or
 * quinze modules `react/` appellent `useLabels` — `ErrorBanner`, `Sheet`,
 * `ConfirmDialog`, `AppHeader`, `BottomNav`, `ThemeToggle`… — donc toute
 * application qui monte UN SEUL composant du paquet embarquait les sept
 * langues : **6,2 kB gzip, dont 4,4 morts** pour une app qui n'en parle qu'une.
 *
 * Les composants importent donc ce fichier, pas `labels.js` : ils n'embarquent
 * que le français, qui est de toute façon ce qu'ils affichent hors provider.
 *
 * RIEN N'EST RETIRÉ À PERSONNE. `react/labels` continue d'exporter les sept
 * dictionnaires, `labelsFor` et un provider qui résout n'importe laquelle des
 * sept langues, synchronement, comme avant. Une app multilingue n'a rien à
 * changer ; elle paie ce qu'elle utilise, et c'est nouveau.
 *
 * LA VOIE LÉGÈRE, pour une app qui parle une seule autre langue :
 *
 *   import es from '@mister-guiiug/dev-pwa-config/react/labels-es';
 *   import { LabelsProvider } from '@mister-guiiug/dev-pwa-config/react/labels-core';
 *
 *   <LabelsProvider dictionary={es}>…</LabelsProvider>
 *
 * Deux langues embarquées au lieu de sept, et toujours aucun chargement
 * asynchrone : les libellés d'un bouton ne peuvent pas arriver après lui.
 */

/** @type {import('react').Context<import('./labels-core.js').LabelGroups | null>} */
const LabelsContext = createContext(null);

/** Locale de repli : le français, ce que les composants codaient en dur. */
export const DEFAULT_LOCALE = 'fr';

/** Le dictionnaire embarqué par le noyau. */
export const DEFAULT_LABELS = fr;

/** Fusionne un jeu de libellés avec des surcharges, groupe par groupe. */
export function mergeLabels(base, overrides = {}) {
  const out = {};
  for (const [group, entries] of Object.entries(base)) {
    out[group] = { ...entries, ...(overrides[group] ?? {}) };
  }
  for (const [group, entries] of Object.entries(overrides)) {
    if (!(group in out)) out[group] = { ...entries };
  }
  return out;
}

/** La langue d'une étiquette, régionale ou non : `pt-BR` → `pt`. */
const langue = locale =>
  typeof locale === 'string' ? locale.toLowerCase().split(/[-_]/)[0] : '';

/**
 * Fournit les libellés aux composants du paquet.
 *
 * Le noyau ne connaît qu'une langue : passer `locale="es"` SANS `dictionary`
 * rend donc le français. Ce repli est dit à voix haute en développement — le
 * repli silencieux est précisément le défaut que la version à sept langues
 * avait fermé, et il n'est pas question de le rouvrir par la petite porte.
 *
 * @param {{ locale?: string, dictionary?: object,
 *   overrides?: object, children?: unknown }} props
 */
export function LabelsProvider(props = {}) {
  const { locale = DEFAULT_LOCALE, dictionary, overrides, children } = props;
  const value = useMemo(() => {
    let base = dictionary;
    if (!base) {
      if (langue(locale) !== DEFAULT_LOCALE && isDev()) {
        console.warn(
          `[dwc] LabelsProvider : « ${locale} » n'est pas embarqué par ` +
            '`react/labels-core`, qui ne porte que le français. Passer ' +
            '`dictionary` (p. ex. `react/labels-es`), ou importer le provider ' +
            'de `react/labels`, qui résout les sept langues.'
        );
      }
      base = DEFAULT_LABELS;
    }
    return overrides ? mergeLabels(base, overrides) : base;
  }, [dictionary, locale, overrides]);
  return createElement(LabelsContext.Provider, { value }, children);
}

/**
 * Libellés d'un groupe. Utilisable HORS provider : renvoie alors le français,
 * ce que les composants faisaient déjà en dur.
 *
 * @param {string} group
 */
export function useLabels(group) {
  const ctx = useContext(LabelsContext);
  const source = ctx ?? DEFAULT_LABELS;
  return source[group] ?? DEFAULT_LABELS[group] ?? {};
}
