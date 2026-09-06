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
      id: 'Card',
      category: 'primitive',
      covers: ['Card', 'CardHeader'],
      donts: {
        fr: [
          'Ne pas recoder la surface avec des couleurs en dur : les copies de miss-genius et miss-uwh ne différaient que par `--mg-surface` contre `--uwh-surface` — c’est exactement la variable que `--dwc-surface` unifie.',
          'Ne pas rendre toute la carte cliquable par un `onClick` sur le `div` : sans rôle ni focus, seule la souris y accède. L’action se pose sur un élément focusable à l’intérieur (`CardHeader` `action`), ou la carte devient un vrai lien avec `as="a"`.',
        ],
        en: [
          'Don’t re-code the surface with hard-coded colours: the miss-genius and miss-uwh copies differed only by `--mg-surface` versus `--uwh-surface` — exactly the variable `--dwc-surface` unifies.',
          'Don’t make the whole card clickable with an `onClick` on the `div`: with no role and no focus, only the mouse reaches it. The action goes on a focusable element inside (`CardHeader` `action`), or the card becomes a real link with `as="a"`.',
        ],
      },
      a11y: {
        fr: 'Une carte n’a pas de rôle : c’est une surface. `CardHeader` rend un vrai titre (`h3` par défaut, `as` pour le niveau) pour que la structure du document survive à la mise en page — un lecteur d’écran navigue de carte en carte par les titres.',
        en: 'A card has no role: it is a surface. `CardHeader` renders a real heading (`h3` by default, `as` for the level) so the document outline survives the layout — a screen reader moves from card to card by headings.',
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
          'Ne pas demander « êtes-vous sûr ? » là où `action` suffit : `ConfirmDialog` est posé sur quatorze apps, `useUndoableState` sur aucune. Supprimer puis proposer d’annuler coûte un geste au lieu de deux, et ne coûte rien quand on ne s’est pas trompé.',
          'Ne pas raccourcir un toast porteur d’une action avec `duration` : elle vit huit secondes au minimum, le temps de lire, de décider et d’atteindre le bouton. Une durée explicite l’emporte — et redevient votre responsabilité.',
        ],
        en: [
          'Don’t put a role on the message: the live region is the CONTAINER. miss-supaboss and mister-footcoach do both, and the message is announced twice.',
          'Don’t show only one at a time: miss-carbook replaces the previous one, which vanishes unread. The stack is bounded, and the oldest is the one that goes.',
          'Don’t make an error a fleeting notice: by default `tone="error"` does not clear itself. A message nobody had time to read served no purpose.',
          'Don’t ask “are you sure?” where `action` is enough: `ConfirmDialog` is used by fourteen apps, `useUndoableState` by none. Delete then offer to undo costs one gesture instead of two, and costs nothing when nobody made a mistake.',
          'Don’t shorten an action-bearing toast with `duration`: it lives at least eight seconds — time to read, decide and reach the button. An explicit duration wins, and becomes your responsibility.',
        ],
      },
      a11y: {
        fr: 'Deux régions montées en permanence — polie pour l’ordinaire, assertive pour l’erreur — parce qu’une région créée en même temps que son contenu n’est pas annoncée. Le compte à rebours est suspendu au survol et au focus (WCAG 2.2.1) : le focus qui se pose sur l’action l’arrête, sinon le message s’effacerait sous les doigts de qui vient l’atteindre. Chaque message est clé sur son identifiant : le rendu déclenché par cette suspension ne réinsère rien, donc rien n’est relu.',
        en: 'Two regions mounted at all times — polite for the ordinary, assertive for errors — because a region created together with its content is not announced. The countdown pauses on hover and focus (WCAG 2.2.1): focus landing on the action stops it, otherwise the message would clear under the fingers of whoever was reaching for it. Each message is keyed on its id: the render triggered by that pause re-inserts nothing, so nothing is announced twice.',
      },
    },
    {
      id: 'AppHeader',
      category: 'shell',
      covers: ['AppHeader'],
      donts: {
        fr: [
          'Ne pas rendre le titre dans un `<p>` hors de l’accueil pour ne garder qu’un `h1` par app : c’est ce que faisait `mister-cim10`, et la page perdait son titre pour un lecteur d’écran. Le titre de l’en-tête EST le titre de la page ; `as` sert quand elle en a déjà un.',
          'Ne pas brancher `NavLink` sur `linkComponent` : il redéclare `aria-current` après l’étalement des props. `Link`, avec `hrefProp="to"` — le piège payé deux fois sur `BottomNav`.',
        ],
        en: [
          'Don’t render the title in a `<p>` outside the home page to keep a single `h1` per app: that is what `mister-cim10` did, and the page lost its title for a screen reader. The header title IS the page title; `as` is for when it already has one.',
          'Don’t plug `NavLink` into `linkComponent`: it redeclares `aria-current` after the props are spread. `Link`, with `hrefProp="to"` — the pitfall paid twice on `BottomNav`.',
        ],
      },
      a11y: {
        fr: 'Le retour porte son nom (« Retour », sept langues) et une cible de 2,75 rem ; il est un lien quand il a une destination, un bouton quand il n’a qu’une action. La zone sûre iOS est prise sur le `padding-top` du `<header>`, pas volée au titre.',
        en: 'The back control carries its name (“Back”, seven languages) and a 2.75 rem target; it is a link when it has a destination, a button when it only has an action. The iOS safe area is taken on the `<header>`’s `padding-top`, not stolen from the title.',
      },
    },
    {
      id: 'PageContainer',
      category: 'shell',
      covers: ['PageContainer'],
      donts: {
        fr: [
          'Ne pas recopier `calc(env(safe-area-inset-bottom) + …)` dans chaque vue : `miss-badminton` et `mister-molkky` portaient chacune un `PageContainer` pour ça, et les vues qui l’oubliaient collaient à la barre du bas.',
        ],
        en: [
          'Don’t copy `calc(env(safe-area-inset-bottom) + …)` into every view: `miss-badminton` and `mister-molkky` each carried a `PageContainer` for that, and the views that forgot it stuck to the bottom bar.',
        ],
      },
      a11y: {
        fr: 'Aucun rôle, aucune sémantique : une largeur et des marges. `as="main"` quand il est la région principale — une seule par page.',
        en: 'No role, no semantics: a width and margins. `as="main"` when it is the main region — one per page.',
      },
    },
    {
      id: 'LoginForm',
      category: 'shell',
      covers: ['LoginForm'],
      donts: {
        fr: [
          'Ne pas accrocher « identifiants invalides » au champ mot de passe : l’erreur concerne les deux champs, et `miss-uwh` la posait sur le seul mot de passe. Elle est rendue à part, dans un `role="alert"`.',
          'Ne pas mettre `autocomplete="email"` sur l’identifiant : un gestionnaire de mots de passe cherche `username` pour proposer le compte enregistré.',
        ],
        en: [
          'Don’t attach “invalid credentials” to the password field: the error concerns both fields, and `miss-uwh` put it on the password alone. It is rendered apart, in a `role="alert"`.',
          'Don’t set `autocomplete="email"` on the identifier: a password manager looks for `username` to offer the saved account.',
        ],
      },
      a11y: {
        fr: 'Deux champs labellisés par `TextField`, une erreur annoncée par `role="alert"`, un bouton qui dit `aria-busy` pendant la connexion et ignore la seconde soumission. Le titre est un vrai `h1` : c’est la page.',
        en: 'Two fields labelled by `TextField`, an error announced by `role="alert"`, a button that says `aria-busy` while signing in and ignores the second submission. The title is a real `h1`: it is the page.',
      },
    },
    {
      id: 'MfaChallenge',
      category: 'shell',
      covers: ['MfaChallenge'],
      donts: {
        fr: [
          'Ne pas laisser l’utilisateur sans sortie : sans téléphone ni codes de secours, il doit pouvoir se déconnecter plutôt que rester devant un champ. `onSignOut` rend le bouton ; `mister-doc` l’avait compris.',
          'Ne pas proposer la voie de secours sans la fournir : les codes de secours sont des RPC applicatives, pas une API Supabase Auth. Le bouton n’existe que si `onRecover` est là.',
        ],
        en: [
          'Don’t leave the user without an exit: with neither phone nor recovery codes, they must be able to sign out rather than sit in front of a field. `onSignOut` renders the button; `mister-doc` had understood that.',
          'Don’t offer the recovery path without providing it: recovery codes are application RPCs, not a Supabase Auth API. The button only exists when `onRecover` is given.',
        ],
      },
      a11y: {
        fr: '`inputmode="numeric"` ouvre le bon clavier, `autocomplete="one-time-code"` fait proposer le code reçu par iOS et Android, et la longueur attendue est déclarée (`minlength`, `maxlength`).',
        en: '`inputmode="numeric"` opens the right keyboard, `autocomplete="one-time-code"` lets iOS and Android offer the received code, and the expected length is declared (`minlength`, `maxlength`).',
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
          'Ne pas recopier `position: fixed` dans l’app pour coller la barre : huit dépôts portaient la même règle le 05/09/2026. `placement="fixed"`, et `<PageContainer reserve="bottom-nav">` pour la place qu’elle occupe.',
        ],
        en: [
          'Don’t leave the `<nav>` unnamed: three of the seven copies set none, and two anonymous landmarks are indistinguishable in a screen reader’s list.',
          'Don’t signal the current tab by colour alone: four copies out of seven change only the ink. Under forced colours the two hues become one.',
          'Don’t name a badge with `aria-label` on a `<span>`: miss-lookhouse does, and nothing is conveyed. Pass `badgeLabel`.',
          'Don’t copy `position: fixed` into the app to pin the bar: eight repositories carried the same rule on 05/09/2026. `placement="fixed"`, and `<PageContainer reserve="bottom-nav">` for the room it takes.',
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
          'Ne pas écrire soi-même le lien de signalement : `issues` ouvre le gabarit `bug.yml` du compte avec la version, le commit, l’écran et le navigateur préremplis — ce que l’utilisateur ne sait jamais dire.',
        ],
        en: [
          'Don’t hand-copy the links: the component already sets `rel="noopener noreferrer"` and the 2.75 rem touch target.',
          'Don’t write the report link yourself: `issues` opens the account’s `bug.yml` form with version, commit, screen and browser prefilled — what users never manage to say.',
        ],
      },
      a11y: {
        fr: 'Les liens sortants annoncent leur destination ; l’icône qui les accompagne est décorative.',
        en: 'Outbound links announce their destination; the accompanying icon is decorative.',
      },
    },
    {
      id: 'ShareButton',
      category: 'pwa',
      covers: ['ShareButton'],
      donts: {
        fr: [
          'Ne pas traiter l’annulation comme un échec : `navigator.share` lève AUSSI quand l’utilisateur ferme la feuille de partage. Une app du relevé affichait « échec » à quelqu’un qui avait simplement changé d’avis — ici `cancelled` n’affiche rien.',
          'Ne pas recopier dans le presse-papiers après une annulation : copier ce qu’on vient de refuser de partager est une surprise. Les trois copies mesurées s’accordent là-dessus.',
          'Ne pas insérer le message de retour en même temps que sa région vivante : elle ne serait pas lue. Elle est ici présente dès le premier rendu, vide tant qu’il n’y a rien à dire.',
          'Ne pas laisser « Lien copié » à l’écran indéfiniment : sans `resetAfterMs`, le bouton ment au prochain regard.',
        ],
        en: [
          'Don’t treat cancellation as failure: `navigator.share` ALSO throws when the user dismisses the share sheet. One surveyed app showed “failed” to someone who simply changed their mind — here `cancelled` shows nothing.',
          'Don’t fall back to the clipboard after a cancellation: copying what someone just declined to share is a surprise. The three surveyed copies agree on this.',
          'Don’t insert the feedback message together with its live region: it would go unread. Here the region is present from the first render, empty until there is something to say.',
          'Don’t leave “Link copied” on screen forever: without `resetAfterMs`, the button lies at the next glance.',
        ],
      },
      a11y: {
        fr: 'Le retour est une région `status` posée dès le premier rendu, donc annoncée quand elle se remplit ; c’est un TEXTE, jamais une couleur seule. La cible tactile de 2,75 rem est celle des autres boutons du paquet.',
        en: 'Feedback is a `status` region present from the first render, so it is announced when filled; it is TEXT, never colour alone. The 2.75 rem touch target matches the package’s other buttons.',
      },
    },
    {
      id: 'Sparkline',
      category: 'primitive',
      covers: ['Sparkline', 'BarChart', 'Gauge'],
      donts: {
        fr: [
          'Ne pas laisser le tracé parler seul : le `<svg>` est `aria-hidden`, et c’est le texte à côté qui porte la donnée. Retirer `label` ou `unit` ne casse aucun rendu — la mesure disparaît simplement pour qui ne la voit pas.',
          'Ne pas boucher les trous d’une série : une valeur manquante COUPE le trait. Une ligne qui traverse le trou raconte une mesure qui n’a jamais été prise.',
          'Ne pas remplacer `Gauge` par une barre colorée maison : sans `aria-valuenow/min/max`, le niveau n’existe que pour l’œil.',
          'Ne pas croire qu’une valeur hors bornes est refusée : le remplissage est borné à 0–100 %, mais la valeur ANNONCÉE reste la vraie. Borner le dessin ne doit pas mentir sur la mesure.',
        ],
        en: [
          'Don’t let the plot speak alone: the `<svg>` is `aria-hidden`, and the text beside it carries the data. Dropping `label` or `unit` breaks no rendering — the measurement simply disappears for anyone who cannot see it.',
          'Don’t bridge gaps in a series: a missing value BREAKS the line. A line crossing the gap tells of a measurement that was never taken.',
          'Don’t replace `Gauge` with a hand-rolled coloured bar: without `aria-valuenow/min/max`, the level exists for the eye only.',
          'Don’t assume an out-of-range value is rejected: the fill is clamped to 0–100 %, but the ANNOUNCED value stays the real one. Clamping the drawing must not lie about the measurement.',
        ],
      },
      a11y: {
        fr: 'Le dessin est masqué (`aria-hidden`, `focusable="false"`) et la donnée est dite en toutes lettres dans un texte voisin. `Gauge` est un vrai `meter` : `aria-valuenow`, `min`, `max`, `valuetext` avec l’unité, et un nom.',
        en: 'The drawing is hidden (`aria-hidden`, `focusable="false"`) and the data is spelled out in an adjacent text. `Gauge` is a real `meter`: `aria-valuenow`, `min`, `max`, `valuetext` with the unit, and a name.',
      },
    },
    {
      id: 'AppVersion',
      category: 'shell',
      covers: ['AppVersion'],
      donts: {
        fr: [
          'Ne pas recopier la version dans un `define` maison : `versionPlugin` la pose sur `globalThis.__DWC_BUILD__`, seul chemin que lit un module de `node_modules`. Un `define` seul ne peut pas atteindre le paquet.',
          'Ne pas afficher le SHA complet : le composant montre les sept caractères de la forme courte, ceux qu’un rapport de bug recopie sans se tromper.',
          'Ne pas attendre « mise à jour disponible » sans `VersionProvider` : hors fournisseur, le composant affiche la version et ne surveille rien.',
          'Ne pas activer `checkEvery` sur un écran monté en permanence sans y réfléchir : c’est une requête réseau récurrente, et le service worker couvre déjà le cas des apps qui en ont un.',
        ],
        en: [
          'Don’t re-create the version in a hand-written `define`: `versionPlugin` puts it on `globalThis.__DWC_BUILD__`, the only path a module inside `node_modules` can read. A `define` alone cannot reach the package.',
          'Don’t print the full SHA: the component shows the seven-character short form, the one a bug report copies without a mistake.',
          'Don’t expect “update available” without `VersionProvider`: outside the provider the component shows the version and watches nothing.',
          'Don’t switch `checkEvery` on for a permanently mounted screen without thinking: it is a recurring network request, and the service worker already covers apps that have one.',
        ],
      },
      a11y: {
        fr: 'Chaque état porte son TEXTE, jamais une couleur seule ; l’annonce « version disponible » est une région `status`, sans quoi elle apparaîtrait après coup sans être annoncée. Sans version injectée, le composant rend `null` plutôt qu’un libellé vide.',
        en: 'Every state carries its own TEXT, never colour alone; the “version available” notice is a `status` region, without which it would appear after the fact and never be announced. With no version injected, the component renders `null` rather than an empty label.',
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
    {
      id: 'SegmentedControl',
      category: 'primitive',
      covers: ['SegmentedControl'],
      donts: {
        fr: [
          'Ne pas le réécrire à la main : mister-doc en portait CINQ variantes locales avant promotion — login, congé, thème, période, calendrier.',
          'Ne pas s’en servir pour un choix de VALEUR de formulaire : il change une vue (`role="tablist"`). Une valeur se choisit avec des boutons radio.',
        ],
        en: [
          'Don’t rewrite it by hand: mister-doc carried FIVE local variants before promotion — login, leave, theme, period, calendar.',
          'Don’t use it to pick a form VALUE: it switches a view (`role="tablist"`). A value is picked with radio buttons.',
        ],
      },
      a11y: {
        fr: 'L’état actif est porté par `aria-selected`, pas par une classe : l’état accessible EST l’état visuel. Chaque segment est un vrai `<button>`, donc atteignable au clavier.',
        en: 'The active state is carried by `aria-selected`, not a class: the accessible state IS the visual state. Each segment is a real `<button>`, hence keyboard-reachable.',
      },
    },
    {
      id: 'ConnectionBanner',
      category: 'pwa',
      covers: ['ConnectionBanner'],
      donts: {
        fr: [
          'Ne pas retirer le délai : sans le débounce de 1,5 s, chaque micro-coupure fait clignoter le bandeau — c’est le défaut constaté avant la version de mister-qowa.',
          'Ne pas lui faire dire plus que `navigator.onLine` : une interface active ne prouve pas que le serveur répond. Une connectivité applicative se passe via la prop `online`.',
        ],
        en: [
          'Don’t remove the delay: without the 1.5 s debounce, every micro-drop makes the banner flash — the defect observed before mister-qowa’s version.',
          'Don’t let it claim more than `navigator.onLine`: an active interface doesn’t prove the server answers. App-level connectivity goes through the `online` prop.',
        ],
      },
      a11y: {
        fr: '`role="status"` : l’apparition est annoncée sans interrompre — être hors ligne est un état, pas une alerte.',
        en: '`role="status"`: its appearance is announced without interrupting — being offline is a state, not an alert.',
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
      id: 'VersionProvider',
      covers: ['VersionProvider', 'useAppVersion'],
      signature:
        'VersionProvider({ checkEvery?, checkUrl? }) → useAppVersion() → { version, justUpdated, latest, updateAvailable, checkNow }',
      summary: {
        fr: 'La version qui tourne, celle du démarrage précédent, celle qui est en ligne. Le pendant de `AppUpdates` : celui-ci sait qu’une bascule est possible, celui-là sait vers quoi.',
        en: 'The running version, the one from the previous start, the one that is online. The counterpart of `AppUpdates`: that one knows a switch is possible, this one knows what to.',
      },
      dont: {
        fr: 'Ne pas en attendre un rechargement : poser la question et appliquer la réponse sont deux gestes, et `applyUpdate` fait déjà le second.',
        en: 'Don’t expect it to reload: asking the question and applying the answer are two gestures, and `applyUpdate` already does the second.',
      },
    },
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
      id: 'Sparkline',
      covers: ['Sparkline', 'BarChart', 'Gauge'],
      signature: 'Sparkline({ values, label, unit }) · BarChart · Gauge',
      summary: {
        fr: 'Courbe, barres et jauge en SVG calculé — sans librairie, avec l’alternative textuelle produite d’office.',
        en: 'Sparkline, bars and gauge as computed SVG — no library, with the text alternative produced by default.',
      },
      dont: {
        fr: 'Ne pas confondre un trou (`null`) avec un zéro : le second fait plonger la courbe et raconte une panne qui n’a pas eu lieu.',
        en: 'Don’t treat a gap (`null`) as a zero: it dips the line and tells of an outage that never happened.',
      },
    },
    {
      id: 'useActionGuard',
      covers: ['useActionGuard', 'resolveGuard'],
      signature:
        'useActionGuard({ online, checks }) → { allowed, reason, reasonCode, disabledProps, wrap }',
      summary: {
        fr: 'Un bouton bloqué qui dit POURQUOI : codes stables (offline, readonly, …), texte traduit, props prêtes à étaler.',
        en: 'A blocked button that says WHY: stable codes (offline, readonly, …), translated text, spreadable props.',
      },
      dont: {
        fr: 'Ne pas remplacer `aria-disabled` par `disabled` : le bouton sortirait du focus, et l’utilisateur ne pourrait plus découvrir le motif.',
        en: 'Don’t swap `aria-disabled` for `disabled`: the button leaves the focus order and the user can no longer discover the reason.',
      },
    },
    {
      id: 'usePrefetch',
      covers: ['usePrefetch', 'useVisiblePrefetch', 'useIdlePrefetch'],
      signature: 'usePrefetch(loader) → { prefetch, linkProps }',
      summary: {
        fr: 'Précharge le morceau d’une route découpée à l’approche du pointeur ou du focus — avant le clic, pas pendant.',
        en: 'Warms a code-split route’s chunk on pointer or focus intent — before the click, not during.',
      },
      dont: {
        fr: 'Ne pas tout précharger au démarrage : cela annule le découpage. Le préchargement se coupe seul sur `saveData` et en 2G.',
        en: 'Don’t prefetch everything on boot: that undoes code splitting. Prefetching stops itself on `saveData` and 2G.',
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
      id: 'useAuthContext',
      covers: ['AuthProvider', 'useAuthContext'],
      signature:
        '<AuthProvider adapter onEvent> · useAuthContext() → { status, user, session, ready, signIn, signUp, signOut, … }',
      summary: {
        fr: "Le contexte qui tient le client du port `auth` et expose les actions — ce qui manquait entre le port et les écrans, et que quatre apps recopiaient. Sans adaptateur : mode local, `signed-out`, chaque action rend `{ ok: false, error: { code: 'local-mode' } }`.",
        en: "The context that holds the `auth` port client and exposes the actions — what was missing between the port and the screens, and what four apps copied. Without an adapter: local mode, `signed-out`, every action returns `{ ok: false, error: { code: 'local-mode' } }`.",
      },
      dont: {
        fr: 'Ne pas recréer l’adaptateur à chaque rendu : le client est construit une fois par adaptateur. Le mémoriser au niveau module, ou dans un `useMemo`.',
        en: 'Don’t re-create the adapter on every render: the client is built once per adapter. Memoise it at module level, or in a `useMemo`.',
      },
    },
    {
      id: 'useFullscreen',
      covers: ['useFullscreen'],
      signature:
        'useFullscreen() → { supported, active, enter(), exit(), toggle() }',
      summary: {
        fr: 'Le plein écran natif : l’état (suit `fullscreenchange`) et les gestes, qui ne lèvent jamais. Promu des boutons de badminton et molkky — le bouton, lui, reste à l’app.',
        en: 'Native fullscreen: the state (follows `fullscreenchange`) and the gestures, which never throw. Promoted from the badminton and molkky buttons — the button itself stays in the app.',
      },
      dont: {
        fr: 'Ne pas rendre un bouton quand `supported` est faux : un bouton qui ne peut rien faire n’a rien à faire à l’écran — badminton le masquait, molkky le rendait `null`.',
        en: 'Don’t render a button when `supported` is false: a button that cannot do anything has no business on screen — badminton hid it, molkky rendered `null`.',
      },
    },
    {
      id: 'useLabels',
      covers: [
        'useLabels',
        'LabelsProvider',
        'mergeLabels',
        'labelsFor',
        'LABELS',
      ],
      signature:
        'useLabels(groupe) → Record<string, string> · <LabelsProvider locale overrides> · labelsFor(locale)',
      summary: {
        fr: 'Les libellés des composants du paquet, en sept langues (fr, en, es, de, it, pt, nl — `pt-BR` retombe sur `pt`). Trois niveaux : la prop l’emporte, puis le contexte, puis le français.',
        en: 'The package components’ labels, in seven languages (fr, en, es, de, it, pt, nl — `pt-BR` falls back to `pt`). Three levels: the prop wins, then the context, then French.',
      },
      dont: {
        fr: 'Ne pas y verser le dictionnaire métier de l’app : `createI18n` fabrique un contexte ISOLÉ, et celui-ci ne porte que la quinzaine de chaînes des composants.',
        en: 'Don’t pour the app’s domain dictionary into it: `createI18n` builds an ISOLATED context, and this one carries only the components’ fifteen-odd strings.',
      },
    },
    {
      id: 'useSponsorUrl',
      covers: ['useSponsorUrl', 'SponsorProvider'],
      signature:
        'useSponsorUrl(prop?) → string | null · <SponsorProvider handle | url | url={null}>',
      summary: {
        fr: 'Le lien de soutien déclaré une fois pour toute l’app : `handle` pour un autre pseudo Buy Me a Coffee, `url` pour une autre plateforme, `url={null}` pour n’en afficher aucun. Trois niveaux : la prop l’emporte, puis le contexte, puis la famille.',
        en: 'The support link declared once for the whole app: `handle` for another Buy Me a Coffee handle, `url` for another platform, `url={null}` for none at all. Three levels: the prop wins, then the context, then the family.',
      },
      dont: {
        fr: 'Ne pas confondre `null` et `undefined` : `undefined` laisse le niveau suivant répondre, `null` retire le lien. Et `.github/FUNDING.yml` reste à changer à part — GitHub le lit, l’app non.',
        en: 'Don’t confuse `null` with `undefined`: `undefined` lets the next level answer, `null` removes the link. And `.github/FUNDING.yml` still has to be changed separately — GitHub reads it, the app doesn’t.',
      },
    },
    {
      id: 'useLongPress',
      covers: ['useLongPress'],
      signature:
        'useLongPress(onLongPress, { onTap?, delayMs?, moveTolerancePx? }) → { isPressing, handlers }',
      summary: {
        fr: 'Appui long ET tap distingués, au doigt comme au clavier. Fusion de trois copies (miss-badminton, miss-lookhouse, mister-molkky).',
        en: 'Long press AND tap told apart, by touch and by keyboard. Merges three copies (miss-badminton, miss-lookhouse, mister-molkky).',
      },
      dont: {
        fr: 'Ne pas ajouter un `onClick` à côté : les `handlers` en posent déjà un, qui neutralise le clic né d’un appui long.',
        en: 'Don’t add your own `onClick` next to it: the `handlers` already set one, which neutralises the click born of a long press.',
      },
    },
    {
      id: 'useFeedback',
      covers: ['useFeedback'],
      signature: 'useFeedback(events, { sound?, haptic? }) → trigger(event)',
      summary: {
        fr: 'Son et vibration groupés par ÉVÉNEMENT métier : la table est une prop, le socle ne connaît pas les noms de l’app.',
        en: 'Sound and vibration grouped by app-level EVENT: the table is a prop, the base doesn’t know the app’s names.',
      },
      dont: {
        fr: 'Ne pas jouer un son hors d’un geste utilisateur : iOS garde l’AudioContext suspendu tant qu’aucune interaction ne l’a repris.',
        en: 'Don’t play a sound outside a user gesture: iOS keeps the AudioContext suspended until an interaction resumes it.',
      },
    },
    {
      id: 'useWakeLock',
      covers: ['useWakeLock'],
      signature: 'useWakeLock(active?) → void',
      summary: {
        fr: 'Écran maintenu allumé pendant une activité (match, partie), re-acquis au retour d’onglet, silencieux si l’API manque.',
        en: 'Keeps the screen awake during an activity (match, game), re-acquired on tab return, silent when the API is missing.',
      },
      dont: {
        fr: 'Ne pas le laisser actif en permanence : le verrou vide la batterie. `active` doit suivre l’activité réelle.',
        en: 'Don’t leave it permanently on: the lock drains the battery. `active` must follow the actual activity.',
      },
    },
    {
      id: 'usePullToRefresh',
      covers: ['usePullToRefresh'],
      signature:
        'usePullToRefresh({ onRefresh, enabled?, threshold? }) → { pulling, progress, refreshing }',
      summary: {
        fr: 'Tirer-pour-rafraîchir amorti, avec progression à afficher. Promu de mister-molkky, la version la plus complète du parc.',
        en: 'Damped pull-to-refresh with a progress value to display. Promoted from mister-molkky, the most complete version in the fleet.',
      },
      dont: {
        fr: 'Ne pas l’activer sur une page qui scrolle déjà nativement vers le haut : le geste entre en conflit avec celui du navigateur.',
        en: 'Don’t enable it on a page that already overscrolls natively: the gesture conflicts with the browser’s own.',
      },
    },
    {
      id: 'useKeyboardShortcuts',
      covers: ['useKeyboardShortcuts'],
      signature: 'useKeyboardShortcuts(shortcuts, enabled?) → void',
      summary: {
        fr: 'Raccourcis globaux, inertes quand l’utilisateur écrit (champs, `contenteditable`, composition IME).',
        en: 'Global shortcuts, inert while the user is typing (fields, `contenteditable`, IME composition).',
      },
      dont: {
        fr: 'Ne pas y câbler des actions destructrices sans confirmation : un raccourci d’une touche part vite, et sans geste de rattrapage.',
        en: 'Don’t wire destructive actions to it without confirmation: a one-key shortcut fires fast, with no recovery gesture.',
      },
    },
    {
      id: 'useShake',
      covers: ['useShake', 'requestMotionPermission'],
      signature:
        'useShake(onShake, { enabled?, threshold?, cooldownMs? }) · requestMotionPermission()',
      summary: {
        fr: 'Détection de secousse (accéléromètre), promue de miss-dice. Sur iOS 13+, l’accès exige `requestMotionPermission` DANS un geste utilisateur.',
        en: 'Shake detection (accelerometer), promoted from miss-dice. On iOS 13+, access requires `requestMotionPermission` INSIDE a user gesture.',
      },
      dont: {
        fr: 'Ne pas en faire le seul déclencheur : tous les appareils n’ont pas de capteur, et l’utilisateur doit avoir un bouton équivalent.',
        en: 'Don’t make it the only trigger: not every device has a sensor, and the user must have an equivalent button.',
      },
    },
    {
      id: 'useAsync',
      covers: ['useAsync'],
      signature: 'useAsync(fn, key) → { data, loading, error, reload }',
      summary: {
        fr: 'Chargement asynchrone minimal : erreur normalisée en `Error`, protection contre les mises à jour après démontage, `reload` manuel.',
        en: 'Minimal async loading: error normalised to `Error`, protected against post-unmount updates, manual `reload`.',
      },
      dont: {
        fr: 'Ne pas oublier `key` quand la requête dépend d’un identifiant : c’est son changement qui recharge, pas celui de `fn` (lue via une ref).',
        en: 'Don’t forget `key` when the request depends on an id: its change is what reloads, not `fn`’s (read through a ref).',
      },
    },
    {
      id: 'useUndoableState',
      covers: ['useUndoableState'],
      signature:
        'useUndoableState({ load?, save?, clear?, isFinal?, maxHistory? }) → { state, canUndo, start, apply, undo, reset }',
      summary: {
        fr: 'État avec annulation et persistance par ports injectés, promu du `useUndoableGame` de miss-dice. Un état final efface sa sauvegarde.',
        en: 'State with undo and persistence through injected ports, promoted from miss-dice’s `useUndoableGame`. A final state erases its save.',
      },
      dont: {
        fr: 'Ne pas attendre un historique persisté : seul l’état courant survit au rechargement, l’historique repart propre — c’est voulu.',
        en: 'Don’t expect a persisted history: only the current state survives a reload, the history starts clean — by design.',
      },
    },
    {
      id: 'usePrefersHighContrast',
      covers: ['usePrefersHighContrast'],
      signature: 'usePrefersHighContrast() → boolean',
      summary: {
        fr: 'Respect de `prefers-contrast: more`, pour ce que le CSS ne peut pas ajuster seul.',
        en: 'Honours `prefers-contrast: more`, for what CSS cannot adjust on its own.',
      },
      dont: {
        fr: 'Ne pas confondre avec le contraste FORCÉ : `forced-colors` remplace les couleurs d’autorité, et `components.css` le rattrape déjà.',
        en: 'Don’t confuse it with FORCED colours: `forced-colors` replaces colours outright, and `components.css` already handles that.',
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
