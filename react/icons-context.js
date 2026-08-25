import { createContext, createElement as h, useContext } from 'react';
import {
  CloseIcon,
  CoffeeIcon,
  ExternalLinkIcon,
  GithubIcon,
  MoonIcon,
  SunIcon,
  SystemIcon,
} from './icons.js';

/**
 * Un contrat d'icônes, pas un jeu d'icônes.
 *
 * LE CONSTAT. **Dix apps sur seize** dépendent de `lucide-react` — c'est une
 * règle famille, écrite dans le README. Le paquet, lui, dessine ses propres
 * SVG. Dans ces dix apps, la croix du `Sheet` et celle du `Toast` ne
 * ressemblent donc à aucune autre croix de l'écran : deux langages visuels dans
 * la même interface, sans que personne l'ait décidé.
 *
 * IMPOSER UN RÔLE, PAS UN DESSIN. Le paquet a besoin d'une croix « fermer »,
 * d'un soleil « clair », d'une lune « sombre » — pas de CES croix-là. L'app
 * fournit les siennes une fois ; les SVG maison restent le repli, donc une app
 * sans lucide ne change de rien.
 *
 *   import { X, Sun, Moon, Monitor } from 'lucide-react';
 *   <IconsProvider icons={{ close: X, light: Sun, dark: Moon, system: Monitor }}>
 *
 * POURQUOI PAS UNE PEER `lucide-react`. Six apps n'en dépendent pas, et une
 * peer requise les obligerait à l'installer pour afficher une feuille modale.
 * L'injection laisse le choix là où il est pris.
 */

/** Rôles attendus par les composants du paquet, et leur repli maison. */
export const DEFAULT_ICONS = {
  close: CloseIcon,
  light: SunIcon,
  dark: MoonIcon,
  system: SystemIcon,
  repo: GithubIcon,
  sponsor: CoffeeIcon,
  external: ExternalLinkIcon,
};

const IconsContext = createContext(DEFAULT_ICONS);

/**
 * @param {{ icons?: Record<string, unknown>, children?: import('react').ReactNode }} props
 */
export function IconsProvider(props = {}) {
  const { icons, children } = props;
  // Fusion et non remplacement : une app qui ne fournit que `close` garde les
  // replis pour les six autres rôles.
  const value = icons ? { ...DEFAULT_ICONS, ...icons } : DEFAULT_ICONS;
  return h(IconsContext.Provider, { value }, children);
}

/**
 * Le composant d'icône d'un rôle. Utilisable HORS fournisseur : rend alors le
 * SVG maison, ce que les composants faisaient déjà en dur.
 *
 * @param {string} role
 */
export function useIcon(role) {
  const icons = useContext(IconsContext);
  return icons[role] ?? DEFAULT_ICONS[role] ?? null;
}

/**
 * Rend l'icône d'un rôle, décorative par défaut.
 *
 * `aria-hidden` est posé ici plutôt que laissé à l'app : ces icônes accompagnent
 * toujours un texte ou un bouton déjà nommé. Une icône porteuse de sens se pose
 * à la main, avec son propre nom accessible.
 *
 * @param {{ role: string, size?: number }} props
 */
export function Icon(props = {}) {
  const { role, size = 18, ...rest } = props;
  const Component = useIcon(role);
  if (!Component) return null;
  return h(Component, { 'aria-hidden': 'true', size, ...rest });
}
