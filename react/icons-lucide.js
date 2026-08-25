import { createElement as h } from 'react';

/**
 * Le pont vers `lucide-react`, sans en dépendre.
 *
 * LE CONSTAT, MESURÉ. Dix apps sur seize importent `lucide-react` — **149
 * symboles distincts** au total, de 5 à 57 par app. Les six autres
 * (miss-badminton, miss-carbook, miss-contraction, miss-dice, mister-cim10,
 * mister-quota) n'en ont pas et écrivent leurs `<svg>` à la main : **161 SVG
 * en ligne**, dont 75 pour la seule miss-carbook. La coupure est nette — soit
 * lucide, soit du SVG manuscrit, jamais les deux.
 *
 * CE QUI MANQUAIT. `IconsProvider` prend un rôle à la fois, ce qui est le bon
 * contrat mais ne dit rien à une app qui a déjà cinquante-sept icônes : il lui
 * reste à écrire l'objet, à se souvenir des noms de rôles, et à normaliser les
 * props d'accessibilité. Trois occasions de se tromper pour un branchement qui
 * devrait tenir en une ligne. Adoption d'`IconsProvider` avant ce module :
 * **zéro**.
 *
 *   import { X, Sun, Moon, Monitor } from 'lucide-react';
 *   import { lucideIconSet } from '@mister-guiiug/dev-wpa-config/react/icons-lucide';
 *
 *   <IconsProvider icons={lucideIconSet({ close: X, light: Sun, dark: Moon, system: Monitor })}>
 *
 * AUCUNE DÉPENDANCE N'EST AJOUTÉE. Ce module ne connaît pas `lucide-react` : il
 * reçoit des composants, d'où qu'ils viennent. Les six apps sans lucide ne sont
 * pas concernées et gardent les SVG maison du paquet. Le nom du fichier dit
 * l'usage attendu, pas une dépendance.
 */

/**
 * Le composant lucide qui correspond à chaque rôle du paquet.
 *
 * Ce n'est PAS une table d'import — le paquet ne résout aucun de ces noms.
 * C'est la documentation exécutable de ce qu'il faut passer, pour que le
 * branchement se fasse sans aller chercher dans le catalogue lucide.
 */
export const LUCIDE_NAMES = {
  close: 'X',
  light: 'Sun',
  dark: 'Moon',
  system: 'Monitor',
  repo: 'Github',
  sponsor: 'Coffee',
  external: 'ExternalLink',
};

/**
 * Normalise un jeu de composants d'icônes pour `IconsProvider`.
 *
 * CE QUE LA NORMALISATION FAIT, et pourquoi chaque point compte :
 *
 *  - `aria-hidden` par défaut. Les icônes du paquet sont TOUJOURS accompagnées
 *    d'un texte accessible sur l'élément parent (`aria-label` du bouton
 *    « Fermer »). Une icône qui s'annonce en plus fait entendre le nom deux
 *    fois. Un appelant qui passe un `aria-label` explicite reprend la main.
 *  - `focusable="false"`. Sans ça, un ancien Edge et IE mettent les `<svg>`
 *    dans le parcours de tabulation — un arrêt clavier sur une décoration.
 *  - `strokeWidth` commun, pour que la croix du `Sheet` ait le même poids de
 *    trait que les icônes voisines. C'est tout l'objet de l'exercice : une
 *    seule langue visuelle par écran.
 *
 * @param {Record<string, unknown>} icons Rôle → composant (`{ close: X }`).
 * @param {{ strokeWidth?: number, absoluteStrokeWidth?: boolean }} [options]
 * @returns {Record<string, (props: Record<string, unknown>) => unknown>}
 */
export function lucideIconSet(icons = {}, options = {}) {
  const { strokeWidth, absoluteStrokeWidth } = options;
  /** @type {Record<string, (props: Record<string, unknown>) => unknown>} */
  const out = {};

  for (const [role, Component] of Object.entries(icons)) {
    if (!Component) continue;
    const Wrapped = props => {
      const named =
        props?.['aria-label'] != null || props?.['aria-labelledby'] != null;
      // `aria-hidden` est calculé APRÈS l'étalement : posé avant, l'appelant
      // le réintroduirait à `true` en même temps qu'il fournit un nom, et
      // l'icône serait nommée ET masquée.
      // `Icon` pose `aria-hidden` avant d'appeler : on le retire quand un nom
      // accessible est fourni, sinon l'icône serait nommée ET masquée. Un
      // `aria-hidden` explicite de l'appelant, lui, doit passer.
      const { 'aria-hidden': hidden, ...rest } = props ?? {};
      return h(/** @type {never} */ (Component), {
        focusable: 'false',
        ...(strokeWidth == null ? {} : { strokeWidth }),
        ...(absoluteStrokeWidth == null ? {} : { absoluteStrokeWidth }),
        ...rest,
        ...(named ? {} : { 'aria-hidden': hidden ?? 'true' }),
      });
    };
    // Un nom lisible dans React DevTools et dans les traces : sans ça, dix
    // rôles apparaissent tous comme `Wrapped`.
    Wrapped.displayName = `LucideIcon(${role})`;
    out[role] = Wrapped;
  }

  return out;
}
