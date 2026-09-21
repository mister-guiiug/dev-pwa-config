import { useLabels } from './labels-core.js';
import { createElement as h, useState } from 'react';
import { Icon } from './icons-context.js';
import { readJson, writeJson } from '../storage.js';
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

/**
 * Clé du repli des groupes — une clé FAMILLE, comme `dwc_theme` et
 * `dwc_locale`, et ce n'est pas un raccourci.
 *
 * Les dix-neuf applications partagent UNE origine (`mister-guiiug.github.io`,
 * cf. le socle sur les cookies de ce domaine) : le `localStorage` est donc
 * commun. Replier « Santé » dans une app le replie dans toutes — et c'est le
 * comportement voulu, parce que le catalogue est le MÊME partout. Une clé par
 * app obligerait à refermer dix-neuf fois le même groupe.
 */
const GROUPES_KEY = 'dwc_family_groups';

/**
 * Un groupe est-il déplié ? Un choix MÉMORISÉ l'emporte, sinon OUVERT.
 *
 * Le défaut a changé le 21/09/2026 : les groupes naissaient repliés, ce qui
 * faisait payer un clic pour voir ce que l'écran annonçait déjà (« Nos autres
 * applications »). Replié par défaut, le composant cachait aussi son contenu à
 * `axe` — un audit d'accessibilité ne lit pas un `<details>` fermé.
 *
 * `null` et `undefined` ne sont PAS des choix : seul un booléen compte. C'est ce
 * qui permet à une valeur écrite par une version antérieure, ou à une catégorie
 * disparue du catalogue, de retomber sur le défaut sans cas particulier.
 */
function groupeDeplie(memorise, valeur) {
  return typeof memorise?.[valeur] === 'boolean' ? memorise[valeur] : true;
}

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
 * catalogue, chacun annonçant son compte — dix-neuf lignes en deviennent sept.
 * `'maturity'` groupe de la même façon, pour une app qui préfère séparer ce qui
 * est stable de ce qui ne l'est pas.
 *
 * LES GROUPES NAISSENT DÉPLIÉS, ET LE REPLI SE SOUVIENT (21/09/2026). Ils
 * naissaient REPLIÉS, et c'était deux défauts pour un :
 *
 * - l'écran qui accueille la grille annonce déjà « Nos autres applications » ;
 *   arriver sur sept lignes fermées faisait payer un clic pour voir ce qu'on
 *   venait de demander ;
 * - `axe` NE LIT PAS un `<details>` fermé. Un audit d'accessibilité passait
 *   donc sans avoir rien analysé de la grille — le même piège qu'une assertion
 *   qu'on relâche au lieu de la corriger.
 *
 * Le geste de l'utilisateur est retenu sous `dwc_family_groups`, clé FAMILLE
 * comme `dwc_theme` : les apps partageant une origine, replier un groupe le
 * replie partout, et le catalogue étant le même c'est bien ce qu'on veut.
 * `groupStorageKey: null` renonce à la mémoire sans renoncer au regroupement.
 *
 * Trois choix qui méritent d'être dits :
 *
 * - `<details>`/`<summary>` NATIFS, pas un bouton et un `aria-expanded`
 *   maison. Le clavier, l'annonce « replié / déplié » et la recherche dans la
 *   page viennent avec. La mémoire n'ajoute qu'un `onToggle` : l'élément reste
 *   celui du navigateur, rien n'est réimplémenté.
 * - LA MÉMOIRE NE S'ÉCRIT QUE SUR UN GESTE. Poser `open` au montage peut
 *   déclencher `toggle` ; sans garde, le composant graverait son propre défaut
 *   et aucun changement de défaut n'atteindrait plus personne.
 * - LA LISTE INTERNE GARDE `data-dwc="family-app-list"`. Le CSS que les apps
 *   ont déjà écrit pour la grille continue donc de s'appliquer à
 *   l'identique : adopter le regroupement ne demande QUE d'habiller
 *   `family-app-group`.
 *
 * L'ordre des groupes suit le catalogue, pas leur taille : il ne bouge donc
 * pas quand une app naît.
 *
 * DEUX RÉGLAGES QUE LES APPS ÉCRIVAIENT EN CSS. Un relevé des treize apps qui
 * habillaient cette grille à la main a montré deux corrections unanimes ou
 * presque, que le paquet ne savait pas exprimer :
 *
 * - `layout`. TREIZE sur treize remplaçaient la grille responsive par une
 *   colonne unique (`display: flex; flex-direction: column`). Ces grilles
 *   vivent dans un tiroir de réglages ou une carte étroite, où deux colonnes
 *   ne tiennent pas. `layout: 'list'` pose ce choix sans une règle.
 * - `showTitle`. NEUF sur treize masquaient le `<h3>` en `display: none`,
 *   parce que l'écran qui accueille la grille annonce déjà sa section. Le
 *   titre partait donc quand même — mais après avoir été rendu, et chaque app
 *   payait la règle. Le `aria-label` de la `<section>` porte le même texte :
 *   le retirer ne coûte rien au lecteur d'écran.
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
 *   groupStorageKey?: string|null,
 *   layout?: 'grid'|'list',
 *   showTitle?: boolean,
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
    groupStorageKey = GROUPES_KEY,
    layout = 'grid',
    showTitle = true,
    max,
    labels = {},
    className,
  } = props;

  /**
   * Le repli mémorisé, lu UNE FOIS au montage.
   *
   * Lu dans l'initialiseur de `useState` et non à chaque rendu : `readJson`
   * touche le stockage, et le relire à chaque rendu ferait dépendre l'affichage
   * d'un accès synchrone répété pour une valeur qui ne change qu'ici.
   *
   * Sans DOM (rendu serveur, tests du paquet), `readJson` rend le défaut sans
   * lever — la grille sort dépliée, ce qui est bien l'état voulu.
   */
  const [replis, setReplis] = useState(() =>
    groupStorageKey ? readJson(groupStorageKey, {}) : {}
  );

  /**
   * Retient le geste de l'utilisateur.
   *
   * LE GARDE EN TÊTE N'EST PAS DÉCORATIF : poser l'attribut `open` au montage
   * peut déclencher `toggle`. Sans lui, le composant écrirait l'état PAR DÉFAUT
   * dans le stockage au premier rendu — et une clé pleine de valeurs que
   * personne n'a choisies empêcherait tout futur changement de défaut
   * d'atteindre qui que ce soit.
   */
  const memoriser = (valeur, ouvert) => {
    if (groupeDeplie(replis, valeur) === ouvert) return;
    const suivant = { ...replis, [valeur]: ouvert };
    setReplis(suivant);
    // Le retour de `writeJson` est ignoré À DESSEIN : en mode privé le repli ne
    // survit pas au rechargement, et il n'y a rien à annoncer pour ça.
    if (groupStorageKey) writeJson(groupStorageKey, suivant);
  };

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
    {
      className,
      'data-dwc': 'family-apps',
      // Posé seulement en mode liste : le DOM par défaut ne bouge pas, et
      // `[data-layout]` reste un sélecteur honnête.
      'data-layout': layout === 'list' ? 'list' : undefined,
      'aria-label': otherAppsLabel,
    },
    links.length ? h('div', { 'data-dwc': 'family-links' }, links) : null,
    showTitle
      ? h('h3', { 'data-dwc': 'family-apps-title' }, otherAppsLabel)
      : null,
    groupes
      ? h(
          'div',
          { 'data-dwc': 'family-app-groups' },
          groupes.map(([valeur, items]) =>
            h(
              'details',
              {
                key: valeur,
                // DÉPLIÉ par défaut, replié si l'utilisateur l'a demandé. Le
                // cas « un seul élément s'ouvre d'office » a disparu avec le
                // défaut : tout s'ouvre, la règle n'avait plus d'objet.
                open: groupeDeplie(replis, valeur),
                onToggle: evenement => {
                  memoriser(valeur, evenement.currentTarget.open);
                },
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
