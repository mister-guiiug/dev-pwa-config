/*
 * Catalogue du design system — pièges, notes d'accessibilité, arbres de
 * décision, et la liste des hooks.
 *
 * POURQUOI CE FICHIER. Le showroom montrait chaque composant isolément et ne
 * disait jamais deux choses : lequel choisir quand plusieurs conviennent, et
 * comment on se trompe avec celui qu'on a choisi. Les deux se répondaient
 * pourtant déjà dans le dépôt — en commentaires de `components.css`, en notes
 * de version — c'est-à-dire partout sauf là où l'erreur se commet.
 *
 * LES PIÈGES NE SONT PAS DES CONSEILS. Chacun décrit un défaut CONSTATÉ, avec
 * son chiffre quand il en a un : 7 apps sur 13 avaient réimplémenté
 * `EmptyState`, les variantes `sm` locales descendaient à 32 px, une variante
 * pleine de `Badge` échouait au contraste dans 11 thèmes sur 14. Un piège sans
 * fait derrière n'a rien à faire ici.
 *
 * `covers` EST LE CONTRAT. Chaque entrée déclare les exports du barrel qu'elle
 * documente. `test/showroom-catalogue.test.mjs` importe `react/index.js` et
 * exige que tout export soit couvert — ou nommément exclu. C'est ce qui a
 * révélé que les neuf hooks du paquet étaient absents de sa propre vitrine.
 *
 * FR ET EN CÔTE À CÔTE, contrairement au reste du showroom où le français est
 * le HTML et l'anglais vit dans `i18n.js`. Ici il n'y a pas de HTML source :
 * mettre les deux langues dans le même objet rend la parité vérifiable par
 * construction (même objet, même longueur de tableau) au lieu de reposer sur
 * une centaine de clés plates.
 *
 * Fichier volontairement SANS import/export : chargeable par un `<script src>`
 * classique ET importable par node:test.
 */
globalThis.SHOWROOM_CATALOGUE = {
  /* ── Composants ────────────────────────────────────────────────────────── */
  components: [
    {
      id: 'Button',
      category: 'primitive',
      covers: ['Button'],
      donts: {
        fr: [
          'Ne pas refaire une taille `sm` locale : celles des apps descendaient à 32 px, sous le seuil de 44. Le paquet joue sur le padding et ne passe jamais sous 2,75 rem.',
          'Ne pas montrer un spinner sans désactiver. `loading` pose `aria-busy` ET bloque le bouton — c’est ce qui a laissé passer la double soumission dans deux apps.',
          'Ne pas poser `iconOnly` sans `aria-label` : le bouton n’a alors plus aucun nom accessible.',
        ],
        en: [
          'Don’t re-create a local `sm` size: the apps’ own went down to 32 px, below the 44 threshold. The package plays with padding and never drops under 2.75 rem.',
          'Don’t show a spinner without disabling. `loading` sets `aria-busy` AND blocks the button — that is what let double submission through in two apps.',
          'Don’t set `iconOnly` without `aria-label`: the button then has no accessible name at all.',
        ],
      },
      a11y: {
        fr: 'La cible tactile de 2,75 rem tient à toutes les tailles. `loading` implique `disabled` : un bouton occupé n’est pas seulement décoré, il est inactionnable.',
        en: 'The 2.75 rem touch target holds at every size. `loading` implies `disabled`: a busy button is not merely decorated, it is unactionable.',
      },
    },
    {
      id: 'Badge',
      category: 'primitive',
      covers: ['Badge'],
      donts: {
        fr: [
          'Ne pas attendre une variante pleine : elle a été essayée puis retirée. Avec une seule couleur par ton, le texte posé dessus échouait au contraste dans 11 thèmes sur 14.',
          'Ne pas peindre le texte avec le ton brut : un ambre ou un vert de marque tombent à 2:1 sur fond clair. Le composant dérive son encre du ton mélangé à `--dwc-text`.',
          'Ne pas choisir un ton pour sa couleur. `tone` dit une intention ; la teinte, elle, appartient au thème de l’app.',
        ],
        en: [
          'Don’t expect a solid variant: it was tried, then dropped. With one colour per tone, text on top failed contrast in 11 themes out of 14.',
          'Don’t paint the text with the raw tone: a brand amber or green falls to 2:1 on a light background. The component derives its ink from the tone mixed with `--dwc-text`.',
          'Don’t pick a tone for its colour. `tone` states an intent; the hue belongs to the app’s theme.',
        ],
      },
      a11y: {
        fr: 'Le libellé porte le sens ; la couleur ne fait que le renforcer. En contraste forcé, la teinte disparaît et le texte reste.',
        en: 'The label carries the meaning; colour only reinforces it. Under forced colours the hue goes and the text remains.',
      },
    },
    {
      id: 'Field',
      category: 'primitive',
      covers: ['TextField', 'SelectField', 'TextAreaField'],
      donts: {
        fr: [
          'Ne pas remplacer l’aide par l’erreur dans `aria-describedby` : les copies locales le faisaient, et masquaient la consigne au pire moment. Le composant cumule les deux.',
          'Ne pas écrire un `<label>` et un paragraphe rouge à la main : rien ne relie les deux pour un lecteur d’écran.',
          'Ne pas descendre la police du contrôle sous 16 px — iOS zoome au focus, et la page se retrouve décalée.',
        ],
        en: [
          'Don’t replace the hint with the error in `aria-describedby`: local copies did, hiding the instruction at the worst moment. The component keeps both.',
          'Don’t hand-write a `<label>` plus a red paragraph: nothing connects the two for a screen reader.',
          'Don’t drop the control’s font below 16 px — iOS zooms on focus and the page shifts.',
        ],
      },
      a11y: {
        fr: 'La paire `id`/`for`, `aria-describedby` sur l’aide ET l’erreur, `aria-invalid` tant que l’erreur tient : câblé une fois ici, jamais à refaire.',
        en: 'The `id`/`for` pair, `aria-describedby` on hint AND error, `aria-invalid` while the error stands: wired once here, never again.',
      },
    },
    {
      id: 'Stat',
      category: 'primitive',
      covers: ['Stat'],
      donts: {
        fr: [
          'Ne pas se reposer sur la flèche et la couleur : `trendLabel` est la seule chose qu’un lecteur d’écran entend d’une tendance.',
          'Ne pas aligner les chiffres à la main — la valeur est déjà en `tabular-nums`, les colonnes tombent juste.',
        ],
        en: [
          'Don’t rely on the arrow and the colour: `trendLabel` is the only thing a screen reader hears of a trend.',
          'Don’t align the figures by hand — the value already uses `tabular-nums`, so columns line up.',
        ],
      },
      a11y: {
        fr: 'Le libellé de tendance est lu et non vu : il vit dans un bloc masqué visuellement, pas dans un `title`.',
        en: 'The trend label is read, not seen: it lives in a visually hidden block, not in a `title`.',
      },
    },
    {
      id: 'Skeleton',
      category: 'primitive',
      covers: ['Skeleton', 'SkeletonGroup'],
      donts: {
        fr: [
          'Ne pas mettre un libellé par barre : le conteneur annonce une fois. Sinon un lecteur d’écran dit « chargement » autant de fois qu’il y a de lignes.',
          'Ne pas cumuler un spinner et des squelettes — deux signaux pour la même attente.',
          'Ne pas laisser des squelettes au-delà de deux secondes : passer à un bandeau d’erreur, la requête est bloquée.',
        ],
        en: [
          'Don’t put a label on each bar: the container announces once. Otherwise a screen reader says “loading” as many times as there are rows.',
          'Don’t stack a spinner and skeletons — two signals for one wait.',
          'Don’t leave skeletons up beyond two seconds: switch to an error banner, the request is stuck.',
        ],
      },
      a11y: {
        fr: 'Les barres sont `aria-hidden` ; seul le conteneur est annoncé, en `role="status"`.',
        en: 'The bars are `aria-hidden`; only the container is announced, as `role="status"`.',
      },
    },
    {
      id: 'Sheet',
      category: 'primitive',
      covers: ['Sheet'],
      donts: {
        fr: [
          'Ne pas la réimplémenter : aucune copie locale n’avait les trois comportements au complet — Échap, piège de focus, focus restitué à la fermeture.',
          'Ne pas oublier le verrou de défilement du fond : sans lui, la page derrière glisse sous les doigts sur mobile.',
          'Ne pas poser un `display` d’auteur sur `[data-dwc="sheet"]` — il neutralise l’attribut `hidden` et la feuille s’affiche au chargement.',
          'Ne pas mettre la barre d’actions dans `children` : elle défilerait avec le corps. `footer` l’épingle — quinze des vingt-trois feuilles de miss-uwh en dépendent.',
        ],
        en: [
          'Don’t re-implement it: no local copy had all three behaviours at once — Esc, focus trap, focus restored on close.',
          'Don’t forget the background scroll lock: without it the page behind slides under the fingers on mobile.',
          'Don’t set an author `display` on `[data-dwc="sheet"]` — it neutralises the `hidden` attribute and the sheet shows on load.',
          'Don’t put the action bar in `children`: it would scroll away with the body. `footer` pins it — fifteen of miss-uwh’s twenty-three sheets depend on it.',
        ],
      },
      a11y: {
        fr: '`role="dialog"` + `aria-modal`, Échap et clic sur le fond ferment, et le focus revient sur l’élément d’origine.',
        en: '`role="dialog"` + `aria-modal`, Esc and backdrop click close, and focus returns to the opening element.',
      },
    },
    {
      id: 'EmptyState',
      category: 'feedback',
      covers: ['EmptyState'],
      donts: {
        fr: [
          'Ne pas la réimplémenter : 7 apps sur 13 l’ont fait alors que le paquet la livre. C’est le composant le plus recopié de la famille.',
          'Ne pas confondre « rien pour l’instant » et « rien ne correspond au filtre » : les deux appellent des actions opposées.',
        ],
        en: [
          'Don’t re-implement it: 7 apps out of 13 did, while the package ships it. It is the family’s most re-written component.',
          'Don’t conflate “nothing yet” with “nothing matches the filter”: the two call for opposite actions.',
        ],
      },
      a11y: {
        fr: 'L’icône est décorative (`aria-hidden`) ; le titre et la description portent seuls l’information.',
        en: 'The icon is decorative (`aria-hidden`); the title and description carry the information alone.',
      },
    },
    {
      id: 'ErrorBanner',
      category: 'feedback',
      covers: ['ErrorBanner'],
      donts: {
        fr: [
          'Ne pas choisir la sévérité pour sa couleur : `error` pose `role="alert"` et interrompt le lecteur d’écran ; `warning` et `info` posent `role="status"` et restent discrets.',
          'Ne pas doubler d’un toast pour la même erreur — l’utilisateur l’entend deux fois et n’agit pas plus.',
        ],
        en: [
          'Don’t pick severity for its colour: `error` sets `role="alert"` and interrupts the screen reader; `warning` and `info` set `role="status"` and stay quiet.',
          'Don’t double it with a toast for the same error — the user hears it twice and acts no faster.',
        ],
      },
      a11y: {
        fr: 'La sévérité n’est jamais portée par la seule couleur : elle change aussi le rôle ARIA, et le message reste explicite.',
        en: 'Severity is never carried by colour alone: it also changes the ARIA role, and the message stays explicit.',
      },
    },
    {
      id: 'ErrorBoundary',
      category: 'feedback',
      covers: ['ErrorBoundary', 'ObservabilityBoundary'],
      donts: {
        fr: [
          'Ne pas s’en servir pour une erreur réseau : elle attrape le rendu qui plante, pas la requête qui échoue. Pour celle-ci, `ErrorBanner`.',
          'Ne pas omettre `onDownloadBackup` dans une app local-first : quand React est cassé, c’est la seule voie de sortie pour les données de l’utilisateur.',
        ],
        en: [
          'Don’t use it for a network error: it catches a crashing render, not a failing request. For that one, `ErrorBanner`.',
          'Don’t omit `onDownloadBackup` in a local-first app: when React is broken, it is the user’s only way out with their data.',
        ],
      },
      a11y: {
        fr: 'L’UI de repli reste navigable au clavier — c’est le moment où l’app ne répond plus, pas celui où on l’enferme.',
        en: 'The fallback UI stays keyboard-navigable — this is the moment the app stops responding, not the moment to lock it.',
      },
    },
    {
      id: 'SyncStatusBadge',
      category: 'feedback',
      covers: ['SyncStatusBadge'],
      donts: {
        fr: [
          'Ne pas se reposer sur la pastille de couleur : elle double le libellé, elle ne le remplace pas. En contraste forcé, les quatre tons deviennent identiques.',
          'Ne pas afficher `pending` sans le compteur — « en attente » sans nombre n’aide personne à décider.',
        ],
        en: [
          'Don’t rely on the coloured dot: it doubles the label, it does not replace it. Under forced colours the four tones become identical.',
          'Don’t show `pending` without the counter — “pending” with no number helps nobody decide.',
        ],
      },
      a11y: {
        fr: 'L’état est écrit en toutes lettres à côté de la pastille, ce qui le rend indépendant de la couleur.',
        en: 'The state is spelled out next to the dot, which makes it independent of colour.',
      },
    },
    {
      id: 'PwaInstallPrompt',
      category: 'pwa',
      covers: ['PwaInstallPrompt'],
      donts: {
        fr: [
          'Ne pas l’afficher sous condition à la main : il ne se montre déjà que si l’installation est possible et n’a pas été refusée.',
          'Ne pas compter dessus sur iOS — `beforeinstallprompt` n’y existe pas ; l’ajout à l’écran d’accueil y passe par le menu de partage.',
        ],
        en: [
          'Don’t gate it by hand: it already shows only when installation is possible and has not been declined.',
          'Don’t count on it on iOS — `beforeinstallprompt` does not exist there; add-to-home-screen goes through the share menu.',
        ],
      },
      a11y: {
        fr: 'C’est une région passive, pas une modale : elle n’attrape pas le focus et ne bloque pas la page.',
        en: 'It is a passive region, not a modal: it does not grab focus and does not block the page.',
      },
    },
    {
      id: 'UpdatePromptBanner',
      category: 'pwa',
      covers: ['UpdatePromptBanner', 'UpdateButton'],
      donts: {
        fr: [
          'Ne pas oublier la prop `registerSW` : sans elle le bandeau ne s’affiche jamais, faute de savoir qu’une version attend. Le bouton `UpdateButton`, lui, n’en a pas besoin.',
          'Ne pas compter sur `updateServiceWorker(true)` pour un bouton manuel : sans worker EN ATTENTE il ne fait rien — c’est le bouton mort constaté sur mobile. `applyUpdate` bascule sur la purge.',
          'Ne pas régler `snoozeHours` à zéro : une bannière de mise à jour qui revient à chaque rendu se fait fermer sans être lue.',
        ],
        en: [
          'Don’t forget the `registerSW` prop: without it the banner never shows, having no way to know a version is waiting. `UpdateButton` needs none.',
          'Don’t rely on `updateServiceWorker(true)` for a manual button: with no WAITING worker it does nothing — the dead button seen on mobile. `applyUpdate` falls through to a purge.',
          'Don’t set `snoozeHours` to zero: an update banner that returns on every render gets dismissed unread.',
        ],
      },
      a11y: {
        fr: 'Annoncé en `role="status"` : la mise à jour est une information, pas une interruption. Pendant l’opération, le bouton porte `aria-disabled` et non `disabled`, pour ne pas éjecter le focus.',
        en: 'Announced as `role="status"`: an update is information, not an interruption. While it runs, the button carries `aria-disabled` rather than `disabled`, so focus is not thrown out.',
      },
    },
    {
      id: 'ConfirmDialog',
      category: 'feedback',
      covers: ['ConfirmDialog'],
      donts: {
        fr: [
          'Ne pas mettre le focus initial sur la confirmation : mister-quota posait `autoFocus` dessus, si bien qu’une frappe sur Entrée supprimait. Le focus va sur `Annuler`, toujours.',
          'Ne pas fermer soi-même après `onConfirm` : miss-uwh enchaînait les deux, ce qui interdit toute confirmation asynchrone. Utiliser `loading`, la boîte reste ouverte.',
          'Ne pas se contenter de `role="dialog"` sans nom : mister-quota le posait sur le fond, sans `aria-label` ni titre — la boîte n’avait aucun nom accessible.',
        ],
        en: [
          'Don’t put initial focus on the confirmation: mister-quota set `autoFocus` on it, so pressing Enter deleted. Focus goes to `Cancel`, always.',
          'Don’t close it yourself after `onConfirm`: miss-uwh chained both, which rules out any asynchronous confirmation. Use `loading` — the box stays open.',
          'Don’t settle for a nameless `role="dialog"`: mister-quota put it on the backdrop, with neither `aria-label` nor title — the box had no accessible name.',
        ],
      },
      a11y: {
        fr: '`role="alertdialog"` étiqueté par le titre et décrit par le message. Échap annule, Tab boucle dans la boîte, et le focus revient d’où il venait.',
        en: '`role="alertdialog"`, labelled by the title and described by the message. Escape cancels, Tab loops inside, and focus returns where it came from.',
      },
    },
    {
      id: 'Toast',
      category: 'feedback',
      covers: ['ToastProvider', 'ToastViewport', 'useToast'],
      donts: {
        fr: [
          'Ne pas poser un rôle sur le message : la région vivante est le CONTENEUR. miss-supaboss et mister-footcoach font les deux, et le message est annoncé deux fois.',
          'Ne pas n’en afficher qu’un à la fois : miss-carbook remplace le précédent, qui disparaît sans avoir été lu. La pile est bornée, et c’est le plus ancien qui cède.',
          'Ne pas faire d’une erreur une notification fugace : par défaut `tone="error"` ne s’efface pas tout seul. Un message qu’on n’a pas eu le temps de lire n’a servi à rien.',
        ],
        en: [
          'Don’t put a role on the message: the live region is the CONTAINER. miss-supaboss and mister-footcoach do both, and the message is announced twice.',
          'Don’t show only one at a time: miss-carbook replaces the previous one, which vanishes unread. The stack is bounded, and the oldest is the one that goes.',
          'Don’t make an error a fleeting notice: by default `tone="error"` does not clear itself. A message nobody had time to read served no purpose.',
        ],
      },
      a11y: {
        fr: 'Deux régions montées en permanence — polie pour l’ordinaire, assertive pour l’erreur — parce qu’une région créée en même temps que son contenu n’est pas annoncée. Le compte à rebours est suspendu au survol et au focus (WCAG 2.2.1).',
        en: 'Two regions mounted at all times — polite for the ordinary, assertive for errors — because a region created together with its content is not announced. The countdown pauses on hover and focus (WCAG 2.2.1).',
      },
    },
    {
      id: 'BottomNav',
      category: 'shell',
      covers: ['BottomNav'],
      donts: {
        fr: [
          'Ne pas laisser le `<nav>` sans nom : trois des sept copies n’en posent aucun, et deux repères anonymes sont indiscernables dans la liste d’un lecteur d’écran.',
          'Ne pas distinguer l’onglet courant par la seule couleur : quatre copies sur sept ne changent que l’encre. En contraste forcé, les deux teintes deviennent la même.',
          'Ne pas nommer une pastille par `aria-label` sur un `<span>` : miss-lookhouse le fait, et rien n’est restitué. Passer `badgeLabel`.',
        ],
        en: [
          'Don’t leave the `<nav>` unnamed: three of the seven copies set none, and two anonymous landmarks are indistinguishable in a screen reader’s list.',
          'Don’t signal the current tab by colour alone: four copies out of seven change only the ink. Under forced colours the two hues become one.',
          'Don’t name a badge with `aria-label` on a `<span>`: miss-lookhouse does, and nothing is conveyed. Pass `badgeLabel`.',
        ],
      },
      a11y: {
        fr: '`aria-current="page"` sur l’onglet courant, doublé d’un « Page actuelle » lu mais non vu, et d’un trait qui survit au contraste forcé. Le bouton « Plus » porte `aria-expanded` et `aria-controls`.',
        en: '`aria-current="page"` on the current tab, doubled by a “Current page” that is read but not seen, and by a rule that survives forced colours. The “More” button carries `aria-expanded` and `aria-controls`.',
      },
    },
    {
      id: 'ThemeToggle',
      category: 'shell',
      covers: ['ThemeToggle'],
      donts: {
        fr: [
          'Ne pas omettre `type="button"` : mister-doc et miss-lookhouse l’oublient, et le bouton soumet alors le formulaire qui l’entoure.',
          'Ne pas se contenter d’un `aria-label` figé : quatre copies sur cinq ne disent jamais QUEL thème est actif. Le nom accessible est recalculé à chaque rendu.',
          'Ne pas réduire le thème à deux états : les cinq copies basculent clair / sombre, et l’app ne peut plus jamais revenir à « système ». Restreindre par `states` est une décision, pas un défaut.',
        ],
        en: [
          'Don’t omit `type="button"`: mister-doc and miss-lookhouse forget it, and the button then submits the surrounding form.',
          'Don’t settle for a fixed `aria-label`: four copies out of five never say WHICH theme is active. The accessible name is recomputed on every render.',
          'Don’t reduce the theme to two states: all five copies toggle light / dark, and the app can then never return to “system”. Restricting via `states` is a decision, not a defect.',
        ],
      },
      a11y: {
        fr: 'Le nom accessible porte l’état courant et le suivant. À deux états seulement, `aria-pressed` s’y ajoute — à trois, « appuyé » ne décrirait rien.',
        en: 'The accessible name carries the current state and the next. With two states only, `aria-pressed` is added — with three, “pressed” would describe nothing.',
      },
    },
    {
      id: 'AppFooter',
      category: 'shell',
      covers: ['AppFooter'],
      donts: {
        fr: [
          'Ne pas recopier les liens à la main : le composant pose déjà `rel="noopener noreferrer"` et la cible tactile de 2,75 rem.',
        ],
        en: [
          'Don’t hand-copy the links: the component already sets `rel="noopener noreferrer"` and the 2.75 rem touch target.',
        ],
      },
      a11y: {
        fr: 'Les liens sortants annoncent leur destination ; l’icône qui les accompagne est décorative.',
        en: 'Outbound links announce their destination; the accompanying icon is decorative.',
      },
    },
    {
      id: 'FamilyApps',
      category: 'shell',
      covers: ['FamilyApps'],
      donts: {
        fr: [
          'Ne pas filtrer l’app courante soi-même : la grille l’exclut déjà à partir de `currentAppId`.',
          'Ne pas coder la liste en dur — elle vient d’`apps-catalog.js`, qui est la seule source de vérité du parc.',
        ],
        en: [
          'Don’t filter the current app yourself: the grid already excludes it from `currentAppId`.',
          'Don’t hardcode the list — it comes from `apps-catalog.js`, the single source of truth for the fleet.',
        ],
      },
      a11y: {
        fr: 'Chaque carte est un lien complet, pas une `div` cliquable : navigation au clavier et ouverture en nouvel onglet fonctionnent.',
        en: 'Each card is a full link, not a clickable `div`: keyboard navigation and open-in-new-tab both work.',
      },
    },
  ],

  /* ── Hooks et utilitaires ──────────────────────────────────────────────── *
   * Neuf exports du barrel, et pas un seul n'apparaissait dans la vitrine du
   * paquet — la moitié de sa surface React. Ils n'ont pas de démo : un hook ne
   * se regarde pas. Ils ont une signature, une phrase, et le piège qui va avec.
   * ────────────────────────────────────────────────────────────────────── */
  hooks: [
    {
      id: 'useTheme',
      covers: ['useTheme'],
      signature: 'useTheme(options?) → { theme, resolved, setTheme, toggle }',
      summary: {
        fr: 'Thème clair / sombre / système, persisté, qui suit l’OS. Pose `data-theme` sur `<html>`, ou la classe `.dark` avec `attribute: "class"`.',
        en: 'Light / dark / system theme, persisted, following the OS. Sets `data-theme` on `<html>`, or the `.dark` class with `attribute: "class"`.',
      },
      dont: {
        fr: 'Ne pas poser `data-theme` en parallèle depuis l’app : deux écritures sur le même attribut et la dernière gagne, au hasard du rendu.',
        en: 'Don’t also set `data-theme` from the app: two writers on one attribute, and the last one wins at render’s mercy.',
      },
    },
    {
      id: 'useLocalStorage',
      covers: ['useLocalStorage'],
      signature: 'useLocalStorage<T>(key, initial) → [value, setValue, remove]',
      summary: {
        fr: 'État persistant typé, synchronisé entre les onglets ouverts.',
        en: 'Typed persistent state, synchronised across open tabs.',
      },
      dont: {
        fr: 'Ne rien y mettre de secret : `localStorage` est lisible par tout script de la page, et survit à la fermeture.',
        en: 'Put nothing secret in it: `localStorage` is readable by any script on the page, and outlives the session.',
      },
    },
    {
      id: 'useOfflineMutationQueue',
      covers: ['useOfflineMutationQueue'],
      signature:
        'useOfflineMutationQueue<P>(options?) → { queue, pending, online, enqueue, flush }',
      summary: {
        fr: 'File de mutations persistante, rejouée au retour en ligne avec le backoff de `retryableQuery`.',
        en: 'Persistent mutation queue, replayed on reconnect with `retryableQuery`’s backoff.',
      },
      dont: {
        fr: 'Ne pas y mettre une opération non idempotente sans clé : une file rejouée peut envoyer deux fois.',
        en: 'Don’t enqueue a non-idempotent operation without a key: a replayed queue can send twice.',
      },
    },
    {
      id: 'retryableQuery',
      covers: ['retryableQuery'],
      signature: 'retryableQuery<T>(fn, options?) → Promise<T>',
      summary: {
        fr: 'Backoff exponentiel plafonné ; relance la dernière erreur si les tentatives sont épuisées.',
        en: 'Capped exponential backoff; re-throws the last error once attempts run out.',
      },
      dont: {
        fr: 'Ne pas réessayer un 4xx : une requête mal formée le restera. Filtrer avec `shouldRetry`.',
        en: 'Don’t retry a 4xx: a malformed request stays malformed. Filter with `shouldRetry`.',
      },
    },
    {
      id: 'useOnline',
      covers: ['useOnline'],
      signature: 'useOnline() → boolean',
      summary: {
        fr: 'Réactif aux événements `online` / `offline` du navigateur.',
        en: 'Reactive to the browser’s `online` / `offline` events.',
      },
      dont: {
        fr: 'Ne pas en faire une garantie : `navigator.onLine` dit qu’une interface réseau est active, pas que le serveur répond.',
        en: 'Don’t treat it as a guarantee: `navigator.onLine` says a network interface is up, not that the server answers.',
      },
    },
    {
      id: 'useInstallPrompt',
      covers: ['useInstallPrompt'],
      signature:
        'useInstallPrompt() → { canInstall, installed, promptInstall }',
      summary: {
        fr: 'Capture `beforeinstallprompt` et expose un déclencheur d’ajout à l’écran d’accueil.',
        en: 'Captures `beforeinstallprompt` and exposes an add-to-home-screen trigger.',
      },
      dont: {
        fr: 'Ne pas appeler `promptInstall()` hors d’un geste utilisateur : le navigateur refuse et la promesse résout à `null`.',
        en: 'Don’t call `promptInstall()` outside a user gesture: the browser refuses and the promise resolves to `null`.',
      },
    },
    {
      id: 'useMediaQuery',
      covers: ['useMediaQuery'],
      signature: 'useMediaQuery(query) → boolean',
      summary: {
        fr: 'Brique commune, sûre au rendu serveur, dont dérivent les deux suivants.',
        en: 'Shared, SSR-safe primitive the next two are built on.',
      },
      dont: {
        fr: 'Ne pas s’en servir pour choisir une mise en page : les points de rupture du preset sont en CSS, et en `rem`.',
        en: 'Don’t use it to pick a layout: the preset’s breakpoints live in CSS, and in `rem`.',
      },
    },
    {
      id: 'usePrefersDark',
      covers: ['usePrefersDark'],
      signature: 'usePrefersDark() → boolean',
      summary: {
        fr: 'Préférence système brute, sans le choix explicite de l’utilisateur.',
        en: 'Raw system preference, without the user’s explicit choice.',
      },
      dont: {
        fr: 'Ne pas l’utiliser pour peindre l’app : `useTheme().resolved` tient compte du réglage manuel, pas celui-ci.',
        en: 'Don’t paint the app with it: `useTheme().resolved` accounts for the manual setting, this one does not.',
      },
    },
    {
      id: 'useReducedMotion',
      covers: ['useReducedMotion'],
      signature: 'useReducedMotion() → boolean',
      summary: {
        fr: 'Respect de `prefers-reduced-motion`, pour les animations que le CSS ne peut pas couper seul.',
        en: 'Honours `prefers-reduced-motion`, for animation the CSS cannot switch off on its own.',
      },
      dont: {
        fr: 'Ne pas doubler ce que `components.css` fait déjà : les animations du paquet se coupent toutes seules.',
        en: 'Don’t duplicate what `components.css` already does: the package’s animations switch themselves off.',
      },
    },
    {
      id: 'useUpdatePrompt',
      covers: ['useUpdatePrompt', 'applyUpdate'],
      signature:
        'useUpdatePrompt({ registerSW?, snoozeHours? }) → { visible, updating, update, forceUpdate, dismiss, snooze }',
      summary: {
        fr: 'État du bandeau de mise à jour et application effective. `registerSW` est INJECTÉ : le module ne dépend plus de Vite et vit dans le barrel.',
        en: 'Update-banner state plus the actual application. `registerSW` is INJECTED: the module no longer depends on Vite and lives in the barrel.',
      },
      dont: {
        fr: 'Ne pas appeler `registerSW` de son côté en plus : il pose des écouteurs, et deux appels les doublent. Le hook mémorise la connexion.',
        en: 'Don’t also call `registerSW` yourself: it installs listeners, and two calls double them. The hook memoises the connection.',
      },
    },
    {
      id: 'useThemeContext',
      covers: ['ThemeProvider', 'useThemeContext'],
      signature:
        '<ThemeProvider appId storageKey> · useThemeContext() → { theme, resolved, setTheme, palette }',
      summary: {
        fr: 'Palette du catalogue, état du thème et variables `--dwc-*`, en un seul endroit. Sans `appId`, rien n’est peint : seul l’état est partagé.',
        en: 'Catalogue palette, theme state and `--dwc-*` variables in one place. Without `appId` nothing is painted: only the state is shared.',
      },
      dont: {
        fr: 'Ne pas appeler `useTheme()` en parallèle sous le fournisseur : deux instances écrivent `data-theme`, et la dernière rendue gagne. `useThemeContext()` lit celle qui existe déjà.',
        en: 'Don’t also call `useTheme()` under the provider: two instances write `data-theme`, and the last render wins. `useThemeContext()` reads the one already there.',
      },
    },
    {
      id: 'useAppUpdates',
      covers: ['AppUpdates', 'useAppUpdates'],
      signature:
        '<AppUpdates registerSW checkEvery="1h"> · useAppUpdates() → { visible, updating, update, forceUpdate }',
      summary: {
        fr: '`registerSW` donné une seule fois : le bandeau se pose seul, et `UpdateButton` posé n’importe où partage le même état.',
        en: '`registerSW` given once: the banner places itself, and `UpdateButton` anywhere shares the same state.',
      },
      dont: {
        fr: 'Ne pas omettre `checkEvery` sur une app installée : sans vérification périodique, une PWA ouverte plusieurs jours ne découvre une version qu’au prochain démarrage à froid.',
        en: 'Don’t omit `checkEvery` on an installed app: without a periodic check, a PWA left open for days only discovers a version on its next cold start.',
      },
    },
    {
      id: 'useIcon',
      covers: ['IconsProvider', 'Icon', 'useIcon', 'DEFAULT_ICONS'],
      signature:
        '<IconsProvider icons={{ close: X }}> · <Icon role="close" /> · useIcon(role)',
      summary: {
        fr: 'Le paquet demande un RÔLE (`close`, `light`, `repo`…), l’app fournit le dessin. Dix apps sur seize utilisent `lucide-react` ; les SVG maison restent le repli.',
        en: 'The package asks for a ROLE (`close`, `light`, `repo`…), the app supplies the drawing. Ten apps out of sixteen use `lucide-react`; the in-house SVGs remain the fallback.',
      },
      dont: {
        fr: 'Ne pas y placer une icône porteuse de sens : `Icon` est décorative (`aria-hidden`). Une icône qui informe se pose à la main, avec son nom accessible.',
        en: 'Don’t put a meaningful icon in it: `Icon` is decorative (`aria-hidden`). An informative icon is placed by hand, with its own accessible name.',
      },
    },
    {
      id: 'useLabels',
      covers: ['useLabels', 'LabelsProvider', 'mergeLabels', 'LABELS'],
      signature:
        'useLabels(groupe) → Record<string, string> · <LabelsProvider locale overrides>',
      summary: {
        fr: 'Les libellés des composants du paquet, en français et en anglais. Trois niveaux : la prop l’emporte, puis le contexte, puis le français.',
        en: 'The package components’ labels, in French and English. Three levels: the prop wins, then the context, then French.',
      },
      dont: {
        fr: 'Ne pas y verser le dictionnaire métier de l’app : `createI18n` fabrique un contexte ISOLÉ, et celui-ci ne porte que la quinzaine de chaînes des composants.',
        en: 'Don’t pour the app’s domain dictionary into it: `createI18n` builds an ISOLATED context, and this one carries only the components’ fifteen-odd strings.',
      },
    },
  ],

  /* ── Arbres de décision ────────────────────────────────────────────────── *
   * Deux à quatre branches, jamais plus. Au-delà, ce n'est pas l'arbre qui
   * manque de place — c'est l'API qui est sous-spécifiée.
   *
   * `when` et `why` sont bilingues ; `use` NE L'EST PAS — c'est un fragment de
   * code, donc une balise, éventuellement deux séparées par ` + `. Toute
   * qualification (« en ligne », « à deux actions ») appartient à `when` ou à
   * `why`, sans quoi elle reste en français dans la version anglaise. Le test
   * impose cette forme, parce que c'est exactement l'erreur qui a été commise.
   * ────────────────────────────────────────────────────────────────────── */
  decisions: [
    {
      id: 'signaler',
      question: {
        fr: 'Quelque chose s’est mal passé — comment le dire ?',
        en: 'Something went wrong — how do I say so?',
      },
      branches: [
        {
          target: 'ErrorBanner',
          use: '<ErrorBanner severity="error">',
          when: {
            fr: 'L’action a échoué, l’utilisateur peut réessayer',
            en: 'The action failed, the user can retry',
          },
          why: {
            fr: '`role="alert"` : le lecteur d’écran est interrompu, parce qu’il y a quelque chose à faire.',
            en: '`role="alert"`: the screen reader is interrupted, because there is something to do.',
          },
        },
        {
          target: 'ErrorBanner',
          use: '<ErrorBanner severity="warning">',
          when: {
            fr: 'C’est dégradé mais utilisable',
            en: 'Degraded but usable',
          },
          why: {
            fr: '`role="status"` : annoncé sans couper, parce que rien n’est bloqué.',
            en: '`role="status"`: announced without cutting in, because nothing is blocked.',
          },
        },
        {
          target: 'Field',
          use: '<TextField error="…">',
          when: {
            fr: 'C’est une saisie qui ne va pas',
            en: 'It is an input that is wrong',
          },
          why: {
            fr: 'L’erreur appartient au champ : elle reste à côté de lui, et `aria-describedby` la relie sans effacer l’aide.',
            en: 'The error belongs to the field: it stays next to it, and `aria-describedby` links it without erasing the hint.',
          },
        },
        {
          target: 'ErrorBoundary',
          use: '<ErrorBoundary>',
          when: {
            fr: 'Le rendu a planté, l’écran est blanc',
            en: 'The render crashed, the screen is blank',
          },
          why: {
            fr: 'Seule sortie quand React ne rend plus. En local-first, brancher `onDownloadBackup` pour sauver les données.',
            en: 'The only way out once React stops rendering. Local-first: wire `onDownloadBackup` to rescue the data.',
          },
        },
      ],
    },
    {
      id: 'attente',
      question: {
        fr: 'Ça charge — que met-on à la place ?',
        en: 'It is loading — what goes there meanwhile?',
      },
      branches: [
        {
          target: 'Skeleton',
          use: '<SkeletonGroup lines={n} />',
          when: {
            fr: 'On connaît la forme du résultat',
            en: 'The shape of the result is known',
          },
          why: {
            fr: 'Le squelette occupe la place finale : rien ne saute quand les données arrivent.',
            en: 'The skeleton holds the final space: nothing jumps when the data lands.',
          },
        },
        {
          target: 'Button',
          use: '<Button loading>',
          when: {
            fr: 'Une seule action est en cours',
            en: 'A single action is in flight',
          },
          why: {
            fr: 'L’attente est locale au bouton, et `loading` le désactive — pas de double soumission.',
            en: 'The wait is local to the button, and `loading` disables it — no double submission.',
          },
        },
        {
          target: 'EmptyState',
          use: '<EmptyState>',
          when: {
            fr: 'Ça a chargé, et il n’y a rien',
            en: 'It loaded, and there is nothing',
          },
          why: {
            fr: 'Ce n’est plus une attente. Laisser un squelette tourner sur un jeu vide, c’est mentir.',
            en: 'That is no longer a wait. Leaving a skeleton spinning on an empty set is a lie.',
          },
        },
      ],
    },
    {
      id: 'saisie',
      question: {
        fr: 'Où demander une saisie ?',
        en: 'Where do I ask for input?',
      },
      branches: [
        {
          target: 'Field',
          use: '<TextField>',
          when: {
            fr: 'Un à trois champs, le contexte compte',
            en: 'One to three fields, context matters',
          },
          why: {
            fr: 'Rien à ouvrir, rien à fermer : l’utilisateur garde sous les yeux ce qu’il modifie.',
            en: 'Nothing to open, nothing to close: the user keeps what they are editing in sight.',
          },
        },
        {
          target: 'Sheet',
          use: '<Sheet>',
          when: {
            fr: 'Un formulaire qui mérite le plein écran mobile',
            en: 'A form that deserves the mobile full screen',
          },
          why: {
            fr: 'Le clavier virtuel mange la moitié de l’écran ; la feuille remonte et garde le focus dedans.',
            en: 'The virtual keyboard eats half the screen; the sheet rises and keeps focus inside.',
          },
        },
        {
          target: 'Sheet',
          use: '<Sheet> + <Button variant="danger">',
          when: {
            fr: 'Une confirmation destructive',
            en: 'A destructive confirmation',
          },
          why: {
            fr: 'Le paquet ne livre pas de composant de confirmation dédié : une feuille avec « Annuler » et une action `danger` fait le travail, et reste au clavier.',
            en: 'The package ships no dedicated confirm component: a sheet with “Cancel” and a `danger` action does the job, and stays keyboard-operable.',
          },
        },
      ],
    },
    {
      id: 'etat',
      question: {
        fr: 'Comment afficher un état ?',
        en: 'How do I display a state?',
      },
      branches: [
        {
          target: 'Badge',
          use: '<Badge tone="…">',
          when: {
            fr: 'Une intention métier : à jour, en attente, en retard',
            en: 'A domain intent: up to date, pending, overdue',
          },
          why: {
            fr: '`tone` dit ce que ça veut dire ; la couleur vient du thème et suit l’app.',
            en: '`tone` says what it means; the colour comes from the theme and follows the app.',
          },
        },
        {
          target: 'SyncStatusBadge',
          use: '<SyncStatusBadge status="…" pending={n} />',
          when: {
            fr: 'L’état de la synchronisation, avec une file',
            en: 'Sync state, with a queue',
          },
          why: {
            fr: 'Il connaît les quatre états et affiche le compteur en attente — un `Badge` générique ne le ferait qu’à moitié.',
            en: 'It knows the four states and shows the pending counter — a generic `Badge` would only do half.',
          },
        },
        {
          target: 'Stat',
          use: '<Stat trend="…" trendLabel="…" />',
          when: {
            fr: 'Un chiffre clé, avec sa tendance',
            en: 'A key figure, with its trend',
          },
          why: {
            fr: 'La tendance porte un libellé lu par les lecteurs d’écran : la flèche et la couleur ne suffisent pas.',
            en: 'The trend carries a label read by screen readers: the arrow and the colour are not enough.',
          },
        },
      ],
    },
  ],
};
