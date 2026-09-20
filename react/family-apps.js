import { useLabels } from './labels-core.js';
import { createElement as h, useState } from 'react';
import { Icon } from './icons-context.js';
import {
  CATEGORIES,
  FAMILY_APPS,
  MATURITIES,
  otherApps,
  sortApps,
} from '../apps-catalog.js';
import { useSponsorUrl } from './sponsor.js';

// Liens externes sécurisés.
const EXT = { target: '_blank', rel: 'noopener noreferrer' };

// Carte d'une application : icône (ou initiale en repli si l'icône échoue),
// nom + badge de maturité, description, flèche « lien externe ». Le lien entier
// est cliquable.
function AppCard({ item, maturityLabels }) {
  const [iconFailed, setIconFailed] = useState(false);

  const icon =
    item.iconUrl && !iconFailed
      ? h('img', {
          src: item.iconUrl,
          alt: '',
          width: 40,
          height: 40,
          loading: 'lazy',
          onError: () => setIconFailed(true),
          'data-dwc': 'family-app-icon',
        })
      : h(
          'span',
          { 'aria-hidden': 'true', 'data-dwc': 'family-app-icon' },
          item.name.charAt(0)
        );

  return h(
    'a',
    {
      href: item.appUrl,
      ...EXT,
      'data-dwc': 'family-app',
      'aria-label': `${item.name} (${maturityLabels[item.maturity]}) — nouvel onglet`,
    },
    icon,
    h(
      'span',
      { 'data-dwc': 'family-app-body' },
      h(
        'span',
        { 'data-dwc': 'family-app-head' },
        h('span', { 'data-dwc': 'family-app-name' }, item.name),
        h(
          'span',
          { 'data-dwc': 'maturity', 'data-maturity': item.maturity },
          maturityLabels[item.maturity]
        )
      ),
      h('span', { 'data-dwc': 'family-app-desc' }, item.description)
    ),
    h(
      'span',
      { 'aria-hidden': 'true', 'data-dwc': 'family-app-arrow' },
      h(Icon, { role: 'external' })
    )
  );
}

/**
 * Met en avant, depuis une app de la famille : son code source (GitHub), le
 * sponsor (Buy Me a Coffee) et les AUTRES applications de la famille avec leur
 * badge de maturité. Non stylé : cibler les sélecteurs `[data-dwc="…"]`
 * (`family-apps`, `family-links`, `family-source`, `family-sponsor`,
 * `family-app-list`, `family-app-item`, `family-app`, `family-app-repo`,
 * `maturity[data-maturity]`) en CSS du projet.
 *
 * Chaque `<li>` porte les facettes du catalogue
 * (`data-maturity`, `data-category`, `data-backend`, `data-platform`) : une app
 * peut ainsi teinter ses cartes par domaine ou masquer une facette en CSS,
 * sans réimplémenter la grille.
 *
 * REGROUPEMENT REPLIABLE — `groupBy`. Au-delà d'une quinzaine de cartes, la
 * grille devient un mur : dix-neuf applications à faire défiler pour en
 * trouver une. `groupBy: 'category'` rend un `<details>` par catégorie du
 * catalogue, tous REPLIÉS, chacun annonçant son compte — dix-neuf lignes en
 * deviennent sept. `'maturity'` groupe de la même façon, pour une app qui
 * préfère séparer ce qui est stable de ce qui ne l'est pas.
 *
 * Trois choix qui méritent d'être dits :
 *
 * - `<details>`/`<summary>` NATIFS, pas un bouton et un `aria-expanded`
 *   maison. Le clavier, l'annonce « replié / déplié » et la recherche dans la
 *   page viennent avec, sans une ligne de JavaScript ni un état à
 *   synchroniser.
 * - LES GROUPES D'UN SEUL ÉLÉMENT RESTENT DÉPLIÉS. Le catalogue en compte —
 *   `education` n'a qu'une app. Un repli qui cache une ligne coûte un clic
 *   pour ne rien gagner ; il ajoute du décor là où il prétendait en retirer.
 * - LA LISTE INTERNE GARDE `data-dwc="family-app-list"`. Le CSS que les apps
 *   ont déjà écrit pour la grille continue donc de s'appliquer à
 *   l'identique : adopter le regroupement ne demande QUE d'habiller
 *   `family-app-group`.
 *
 * L'ordre des groupes suit le catalogue, pas leur taille : il ne bouge donc
 * pas quand une app naît.
 *
 * @param {{
 *   currentAppId: string,
 *   apps?: import('../apps-catalog').FamilyApp[],
 *   repoUrl?: string,
 *   sponsorUrl?: string|null,
 *   showSource?: boolean,
 *   showSponsor?: boolean,
 *   showRepoLinks?: boolean,
 *   sort?: 'curated'|'maturity'|'name',
 *   groupBy?: 'category'|'maturity',
 *   max?: number,
 *   labels?: {
 *     source?: string, sponsor?: string, otherApps?: string, repo?: string,
 *     maturity?: Partial<Record<'alpha'|'beta'|'stable', string>>
 *   },
 *   className?: string,
 * }} props
 */
export function FamilyApps(props) {
  const {
    currentAppId,
    apps = FAMILY_APPS,
    repoUrl,
    sponsorUrl: sponsorUrlProp,
    showSource = !!repoUrl,
    showSponsor = true,
    showRepoLinks = false,
    sort = 'curated',
    groupBy,
    max,
    labels = {},
    className,
  } = props;

  // Prop, puis contexte, puis famille — le même hook qu'`AppFooter`, pour que
  // les deux liens de la même app ne puissent pas pointer ailleurs.
  const sponsorUrl = useSponsorUrl(sponsorUrlProp);
  const maturityDictionary = useLabels('maturity');
  const appsDictionary = useLabels('apps');
  const categoryDictionary = useLabels('categories');

  const maturityLabels = {
    ...maturityDictionary,
    ...(labels.maturity || {}),
  };
  const sourceLabel = labels.source ?? appsDictionary.source;
  const sponsorLabel = labels.sponsor ?? appsDictionary.sponsor;
  const otherAppsLabel = labels.otherApps ?? appsDictionary.otherApps;
  // `{app}` est remplacé par le nom : un lecteur d'écran qui parcourt la grille
  // entend seize fois « Code source » sans cela.
  const repoLabel = labels.repo ?? appsDictionary.repo;

  // Réutilise le helper si on travaille sur le catalogue par défaut, sinon
  // filtre la liste fournie.
  const selected =
    apps === FAMILY_APPS
      ? otherApps(currentAppId)
      : apps.filter(a => a.id !== currentAppId);
  const ordered = sort === 'curated' ? selected : sortApps(selected, sort);
  // `max` coupe APRÈS le tri : « les trois plus mûres » n'aurait aucun sens si
  // la coupe précédait l'ordre demandé.
  const list =
    typeof max === 'number' && max >= 0 ? ordered.slice(0, max) : ordered;

  const links = [];
  if (showSource && repoUrl) {
    links.push(
      h(
        'a',
        { key: 'source', href: repoUrl, ...EXT, 'data-dwc': 'family-source' },
        h(Icon, { role: 'repo' }),
        h('span', null, sourceLabel)
      )
    );
  }
  if (showSponsor && sponsorUrl) {
    links.push(
      h(
        'a',
        {
          key: 'sponsor',
          href: sponsorUrl,
          ...EXT,
          'data-dwc': 'family-sponsor',
        },
        h(Icon, { role: 'sponsor' }),
        h('span', null, sponsorLabel)
      )
    );
  }

  const carte = item =>
    h(
      'li',
      {
        key: item.id,
        'data-dwc': 'family-app-item',
        // Facettes exposées au CSS de l'app consommatrice. Les valeurs
        // absentes ne sont pas rendues : `[data-backend]` reste alors un
        // sélecteur honnête (« persistance relevée »).
        'data-maturity': item.maturity,
        'data-category': item.category,
        'data-backend': item.backend,
        'data-platform': item.platform,
        'data-with-repo': showRepoLinks ? '' : undefined,
      },
      h(AppCard, { item, maturityLabels }),
      showRepoLinks
        ? h(
            'a',
            {
              href: item.repoUrl,
              ...EXT,
              'data-dwc': 'family-app-repo',
              'aria-label': repoLabel.replace('{app}', item.name),
            },
            h(Icon, { role: 'repo' })
          )
        : null
    );

  const grille = (items, key) =>
    h('ul', { key, 'data-dwc': 'family-app-list' }, items.map(carte));

  const groupes = groupBy ? repartir(list, groupBy) : null;

  return h(
    'section',
    { className, 'data-dwc': 'family-apps', 'aria-label': otherAppsLabel },
    links.length ? h('div', { 'data-dwc': 'family-links' }, links) : null,
    h('h3', { 'data-dwc': 'family-apps-title' }, otherAppsLabel),
    groupes
      ? h(
          'div',
          { 'data-dwc': 'family-app-groups' },
          groupes.map(([valeur, items]) =>
            h(
              'details',
              {
                key: valeur,
                // Un groupe d'UN élément s'ouvre d'office : le replier
                // coûterait un clic pour cacher une ligne.
                open: items.length < 2 || undefined,
                'data-dwc': 'family-app-group',
                [`data-${groupBy}`]: valeur,
              },
              h(
                'summary',
                { 'data-dwc': 'family-app-group-summary' },
                h(
                  'span',
                  { 'data-dwc': 'family-app-group-name' },
                  (groupBy === 'maturity'
                    ? maturityLabels
                    : categoryDictionary)[valeur] ?? valeur
                ),
                h(
                  'span',
                  { 'data-dwc': 'family-app-group-count' },
                  String(items.length)
                )
              ),
              grille(items, `${valeur}-liste`)
            )
          )
        )
      : grille(list)
  );
}

/**
 * Répartit les apps par facette, dans l'ORDRE DU CATALOGUE — jamais celui
 * d'apparition dans la liste, qui dépendrait du tri demandé et ferait sauter
 * les groupes d'un rendu à l'autre. Une valeur hors catalogue (facette absente
 * ou inventée) est rendue après les autres, sous son propre nom, plutôt que
 * d'être avalée en silence.
 *
 * @param {import('../apps-catalog').FamilyApp[]} items
 * @param {'category'|'maturity'} facette
 * @returns {[string, import('../apps-catalog').FamilyApp[]][]}
 */
function repartir(items, facette) {
  const connues = facette === 'maturity' ? MATURITIES : CATEGORIES;
  const seaux = new Map(connues.map(v => [v, []]));
  for (const item of items) {
    const valeur = item[facette] ?? 'autres';
    if (!seaux.has(valeur)) seaux.set(valeur, []);
    seaux.get(valeur).push(item);
  }
  return [...seaux].filter(([, liste]) => liste.length > 0);
}
