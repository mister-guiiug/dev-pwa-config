import { createElement as h, Fragment } from 'react';
import { AppHeader } from './app-header.js';
import { PageContainer } from './page-container.js';
import { BottomNav } from './bottom-nav.js';
import { ThemeToggle } from './theme-toggle.js';
import { useLabels } from './labels-core.js';

/**
 * La coquille d'application : en-tête, contenu borné, barre basse.
 *
 * PROMU, PAS INVENTÉ. Le squelette (`pwa-starter-kit/src/App.tsx`, fonction
 * `Shell`) assemblait déjà `AppHeader` + `PageContainer` + `BottomNav` +
 * `ThemeToggle`. Trois apps avaient une coquille maison sous d'autres noms
 * (footcoach, carbook, lookhouse). Ce composant ne décide rien du contenu des
 * routes : il pose le cadre.
 *
 * LE PIED DE PAGE N'EST PAS ICI. La règle famille du 06/09/2026 le veut sur
 * l'accueil et À propos seulement — `FamilyAbout` / `AppFooter` y pourvoient.
 * `pwa-doctor` (`liens-famille`) refuse un footer dans la coquille.
 *
 * `navCurrentPath` EST OBLIGATOIRE SOUS UN `basename`, pour la même raison que
 * le `currentPath` de `BottomNav`, à qui il est transmis : sans lui, la barre
 * lit `location.pathname` (`/miss-devises/` une fois déployé) là où ses
 * entrées valent `/`, et aucun onglet n'est actif. Jamais en développement ni
 * en e2e, servis sous `/`. La coquille ne le transmettait pas et n'avait
 * aucune prop pour le recevoir : le squelette et miss-devises étaient touchés
 * en ligne (relevé le 03/10/2026). Passer `useLocation().pathname`.
 *
 * @param {{
 *   title?: import('react').ReactNode,
 *   actions?: import('react').ReactNode,
 *   backHref?: string,
 *   onBack?: () => void,
 *   linkComponent?: unknown,
 *   hrefProp?: string,
 *   navItems?: import('./bottom-nav.js').BottomNavItem[],
 *   navCurrentPath?: string,
 *   navPlacement?: 'static'|'fixed',
 *   navLabel?: string,
 *   width?: 'sm'|'md'|'lg'|'xl'|'full',
 *   reserve?: 'bottom-nav'|undefined,
 *   skipHref?: string,
 *   skipLabel?: string,
 *   mainId?: string,
 *   beforeMain?: import('react').ReactNode,
 *   afterMain?: import('react').ReactNode,
 *   headerChildren?: import('react').ReactNode,
 *   className?: string,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function AppShell(props = {}) {
  const {
    title,
    actions,
    backHref,
    onBack,
    linkComponent = 'a',
    hrefProp = 'href',
    navItems,
    navCurrentPath,
    navPlacement = 'fixed',
    navLabel,
    width = 'md',
    reserve = navPlacement === 'fixed' ? 'bottom-nav' : undefined,
    skipHref = '#contenu',
    skipLabel,
    mainId = 'contenu',
    beforeMain,
    afterMain,
    headerChildren,
    className,
    children,
  } = props;

  const labels = useLabels('nav');
  const skip = skipLabel ?? labels.skip ?? 'Aller au contenu';
  const headerActions = actions === undefined ? h(ThemeToggle) : actions;

  return h(
    Fragment,
    null,
    h(
      'a',
      {
        href: skipHref,
        className: 'sr-only focus:not-sr-only',
        'data-dwc': 'app-shell-skip',
      },
      skip
    ),
    h(
      'div',
      { 'data-dwc': 'app-shell', className },
      h(AppHeader, {
        title,
        actions: headerActions,
        backHref,
        onBack,
        linkComponent,
        hrefProp,
        children: headerChildren,
      }),
      beforeMain ?? null,
      h(
        PageContainer,
        {
          as: 'main',
          id: mainId,
          width,
          reserve,
        },
        children,
        afterMain ?? null
      ),
      navItems?.length
        ? h(BottomNav, {
            items: navItems,
            currentPath: navCurrentPath,
            linkComponent,
            hrefProp,
            placement: navPlacement,
            label: navLabel,
          })
        : null
    )
  );
}
