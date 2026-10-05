/**
 * Les démos du showroom, ENGENDRÉES par les vrais composants.
 *
 * POURQUOI. Les démos étaient du balisage recopié à la main : 290 attributs
 * `data-dwc` qui prétendaient montrer « le DOM exact » de chaque composant,
 * comparés à rien. Relevé du 05/10/2026 : la barre d'onglets n'avait pas
 * l'`aria-current` que sa légende promettait, et le titre d'AppHeader était un
 * `<p>` mis en forme à la main au lieu du `h1` que rend le composant.
 *
 * `npm run sync` rend donc chaque démo de la liste avec `renderToStaticMarkup`
 * et l'écrit entre ses marqueurs dans `showroom/index.html`, comme le reste de
 * ce qui est engendré. `test/showroom-demos.test.mjs` refuse un bloc qui
 * diffère d'un rendu frais, et tient la liste des démos encore écrites à la
 * main : elle ne peut que raccourcir.
 *
 * LA TRADUCTION. Le texte d'une démo vient des props ; pour que la bascule de
 * langue le traduise comme avant, le rendu est ANNOTÉ : un attribut
 * `data-i18n` (ou `data-i18n-aria`) posé sur l'élément du composant qui porte
 * ce texte. L'annotation ne change ni la structure ni l'habillage.
 *
 * `identifierPrefix` est propre à chaque démo : sans lui, deux composants qui
 * appellent `useId` recevraient le même identifiant dans la même page.
 *
 * Dépendances : react, react-dom (devDependencies) et jsdom. Non publié.
 */
import { createElement as h, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import {
  AppFooter,
  AppHeader,
  BottomNav,
  Button,
  ChromePrefs,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  LoginForm,
  MfaChallenge,
  PageContainer,
  SyncStatusBadge,
  ThemeProvider,
  ThemeToggle,
} from '../react/index.js';

const rien = () => {};

/** Une icône SVG décorative, comme celles que passent les apps. */
const icone = (...chemins) =>
  h(
    'svg',
    {
      width: 20,
      height: 20,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    ...chemins.map((d, i) => h('path', { key: i, d }))
  );

/**
 * Les démos engendrées : un rendu, et les annotations de traduction.
 *
 * @type {Record<string, { rendre: () => import('react').ReactElement,
 *   annotations?: Array<[selecteur: string, attribut: string, cle: string]> }>}
 */
export const DEMOS = {
  EmptyState: {
    rendre: () =>
      h(EmptyState, {
        icon: h(
          'svg',
          {
            width: 32,
            height: 32,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.5,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
          h('path', { d: 'M3 7l9-4 9 4v10l-9 4-9-4V7z' }),
          h('path', { d: 'M3 7l9 4 9-4M12 11v10' })
        ),
        title: 'Aucune donnée pour l’instant',
        description:
          'Créez une première entrée pour voir apparaître vos statistiques.',
        action: h(
          'button',
          { type: 'button', className: 'sr-btn' },
          'Créer une entrée'
        ),
      }),
    annotations: [
      ['[data-dwc="empty-state-title"]', 'data-i18n', 'composants.p3'],
      ['[data-dwc="empty-state-desc"]', 'data-i18n', 'composants.p4'],
    ],
  },

  ErrorBanner: {
    rendre: () =>
      h(
        Fragment,
        null,
        h(ErrorBanner, {
          message: 'Impossible d’enregistrer la saison.',
          severity: 'error',
          onRetry: rien,
          onDismiss: rien,
        }),
        h(ErrorBanner, {
          message: 'Connexion instable : les données peuvent être en retard.',
          severity: 'warning',
          onRetry: rien,
        }),
        h(ErrorBanner, {
          message: 'Sauvegarde locale effectuée.',
          severity: 'info',
        })
      ),
  },

  SyncStatusBadge: {
    rendre: () =>
      h(
        'div',
        { className: 'sr-row' },
        h(SyncStatusBadge, { status: 'synced' }),
        h(SyncStatusBadge, { status: 'pending', pending: 3 }),
        h(SyncStatusBadge, { status: 'offline' }),
        h(SyncStatusBadge, { status: 'error' })
      ),
  },

  BottomNav: {
    rendre: () =>
      h(BottomNav, {
        label: 'Exemple : barre d’onglets',
        currentPath: '#composants',
        items: [
          { href: '#composants', label: 'Accueil' },
          { href: '#composants-historique', label: 'Historique' },
          {
            href: '#composants-reglages',
            label: 'Réglages',
            badge: 3,
            badgeLabel: '3 non lues',
          },
        ],
      }),
    annotations: [['nav', 'data-i18n-aria', 'composants.aria.bottomNav']],
  },

  ConfirmDialog: {
    // Rendu OUVERT : la page le garde dans un hôte masqué et l'ouvre sur
    // demande (voir setupConfirmDemo). C'est le balisage réel, voile compris.
    rendre: () =>
      h(ConfirmDialog, {
        open: true,
        destructive: true,
        title: 'Supprimer la partie ?',
        message: 'Cette action est définitive.',
        confirmLabel: 'Supprimer',
        onConfirm: rien,
        onCancel: rien,
      }),
    annotations: [
      ['[data-dwc="confirm-title"]', 'data-i18n', 'composants.confirmTitle'],
      ['[data-dwc="confirm-body"]', 'data-i18n', 'composants.confirmBody'],
      ['[data-dwc="confirm-cancel"]', 'data-i18n', 'composants.confirmCancel'],
      ['[data-dwc="confirm-confirm"]', 'data-i18n', 'composants.confirmOk'],
    ],
  },

  PageContainer: {
    rendre: () =>
      h(
        PageContainer,
        // Le pointillé matérialise la boîte du conteneur, pour la démo.
        { width: 'sm', style: { outline: '1px dashed var(--dwc-border)' } },
        h(
          'p',
          { style: { margin: 0 } },
          h('code', null, 'width="sm"'),
          ' — 28 rem, centré, marges sûres.'
        )
      ),
  },

  LoginForm: {
    // `titleAs` : le titre du formulaire se range sous le h3 de la démo, au
    // lieu du h1 qu'il serait seul dans sa page. Le mot de passe reste vide,
    // comme au premier rendu d'une app.
    rendre: () =>
      h(
        'div',
        { style: { maxWidth: '24rem' } },
        h(LoginForm, {
          titleAs: 'h4',
          initialEmail: 'tresorier@club.fr',
          error: 'Identifiants invalides.',
          footer: h('a', { href: '#composants' }, 'Mot de passe oublié ?'),
          onSubmit: rien,
        })
      ),
  },

  MfaChallenge: {
    // Les deux boutons secondaires n'existent que si l'appelant fournit leur
    // action : la démo les fournit, pour les montrer.
    rendre: () =>
      h(
        'div',
        { style: { maxWidth: '24rem' } },
        h(MfaChallenge, {
          titleAs: 'h4',
          onVerify: rien,
          onRecover: rien,
          onSignOut: rien,
        })
      ),
  },

  ThemeToggle: {
    // Deux des trois états : celui d'un premier passage (« système »), que
    // `useTheme` lit au rendu, et « sombre », fixé par un fournisseur.
    rendre: () =>
      h(
        Fragment,
        null,
        h(ThemeToggle),
        h(ThemeProvider, { defaultTheme: 'dark' }, h(ThemeToggle))
      ),
  },

  ChromePrefs: {
    // Le bouton de thème rend l'état d'un premier passage (« système ») :
    // c'est `useTheme` qui le lit, côté navigateur, dans le stockage.
    rendre: () =>
      h(
        ChromePrefs,
        { label: 'Apparence' },
        h(Button, { variant: 'ghost', size: 'sm' }, 'FR'),
        h(Button, { variant: 'outline', size: 'sm' }, 'EN')
      ),
  },

  AppFooter: {
    rendre: () =>
      h(AppFooter, {
        repoUrl: 'https://github.com/mister-guiiug/dev-pwa-config',
        sponsorUrl: 'https://buymeacoffee.com/mister.guiiug',
      }),
  },

  AppHeader: {
    rendre: () =>
      h(
        AppHeader,
        {
          title: 'Trésorerie',
          // Le titre est le h1 de l'app ; `as` sert « quand la page en a
          // déjà un », dit le composant, et c'est le cas ici. Rendu en h1,
          // il faisait un second titre de premier niveau au milieu de la
          // page, et un saut h1 → h3 que relevait axe.
          as: 'h4',
          backHref: '#composants',
          // Pas collant dans une page qui fait défiler quarante écrans : c'est
          // une prop du composant, pas un style ajouté à la main.
          sticky: false,
          actions: h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              iconOnly: true,
              'aria-label': 'Thème',
            },
            icone('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z')
          ),
        },
        h(
          'p',
          { className: 'sr-note', style: { margin: 0 } },
          'Saison 2025 – 2026 · 128 adhérents'
        )
      ),
  },
};

/** Le marqueur d'ouverture d'une démo engendrée. */
export const debutDemo = id =>
  `<!-- DÉMO:${id}:DÉBUT, engendrée par npm run sync depuis react/ : ne pas éditer -->`;
/** Le marqueur de fermeture. */
export const finDemo = id => `<!-- DÉMO:${id}:FIN -->`;

/** Le balisage d'une démo : rendu du composant, puis annotations. */
export function rendreDemo(id) {
  const demo = DEMOS[id];
  if (!demo) throw new Error(`showroom : démo inconnue « ${id} »`);
  const brut = renderToStaticMarkup(demo.rendre(), {
    identifierPrefix: `demo-${id.toLowerCase()}-`,
  });
  if (!demo.annotations?.length) return brut;
  const doc = new JSDOM(`<div id="hote">${brut}</div>`).window.document;
  const hote = doc.getElementById('hote');
  for (const [selecteur, attribut, cle] of demo.annotations) {
    const cible = hote.querySelector(selecteur);
    if (!cible) {
      throw new Error(`showroom : ${id}, « ${selecteur} » absent du rendu`);
    }
    cible.setAttribute(attribut, cle);
  }
  return hote.innerHTML;
}

/** La page, chaque démo engendrée réécrite entre ses marqueurs. */
export function avecDemos(html) {
  let out = html;
  for (const id of Object.keys(DEMOS)) {
    const debut = out.indexOf(debutDemo(id));
    const fin = out.indexOf(finDemo(id));
    if (debut === -1 || fin === -1 || fin < debut) {
      throw new Error(`showroom : marqueurs de la démo ${id} introuvables`);
    }
    // Les retours à la ligne gardent chaque marqueur sur sa ligne : collé à
    // un élément en ligne (un bouton), Prettier le laisserait sur la même.
    out =
      out.slice(0, debut + debutDemo(id).length) +
      '\n' +
      rendreDemo(id) +
      '\n' +
      out.slice(fin);
  }
  return out;
}

/**
 * Une signature comparable d'un fragment : balises, attributs triés, texte aux
 * blancs réduits. Prettier remet la page en forme (retours à la ligne, style
 * en ligne) : seule la structure compte.
 */
export function signature(html) {
  const doc = new JSDOM(`<div id="hote">${html}</div>`).window.document;
  const valeur = (nom, v) =>
    nom === 'style'
      ? v
          .replace(/\s*([:;])\s*/g, '$1')
          .replace(/;$/, '')
          .trim()
      : v.replace(/\s+/g, ' ').trim();
  const lire = noeud => {
    if (noeud.nodeType === 3) {
      const texte = noeud.textContent.replace(/\s+/g, ' ').trim();
      return texte ? JSON.stringify(texte) : '';
    }
    if (noeud.nodeType !== 1) return '';
    const attributs = [...noeud.attributes]
      .map(a => `${a.name}=${valeur(a.name, a.value)}`)
      .sort()
      .join(' ');
    const enfants = [...noeud.childNodes].map(lire).filter(Boolean).join(',');
    return `<${noeud.localName} ${attributs}>[${enfants}]`;
  };
  return [...doc.getElementById('hote').childNodes]
    .map(lire)
    .filter(Boolean)
    .join(',');
}
