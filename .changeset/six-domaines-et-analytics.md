---
'@mister-guiiug/dev-wpa-config': minor
---

Six domaines montent d'un cran, et la mesure d'audience existe enfin.

Tout ce qui suit part d'une mesure sur les seize apps consommatrices, pas d'une
intuition. Aucun changement de rupture : chaque ajout est facultatif, et une app
qui ne touche à rien obtient exactement ce qu'elle avait — à une exception près,
signalée en fin de note.

**Internationalisation — 78 formatages ignoraient la langue choisie.** 27
constructions `Intl.*('xx-XX', …)` et 51 appels `toLocale*('fr-FR')` dans la
famille : l'utilisateur bascule en anglais, les libellés changent, les nombres
et les dates restent français. La cause n'était pas la négligence — le contexte
de `createI18n` rendait la langue mais aucun formateur. Il rend désormais `fmt`
(`number`, `currency`, `percent`, `date`, `dateTime`, `relative`, `bytes`,
`list`, `plural`), déjà lié à la locale courante ; il pose `<html dir>`, absent
partout ; il appelle `setDefaultLocale`, si bien que `format.js` suit la langue
**même appelé sans locale** ; et il pose lui-même `LabelsProvider`, câblage que
rien ne rappelait. Nouvelles options : `localeTags`, `currency`, `labels`.

**Accessibilité — 38 dialogues, 3 pièges de focus.** Le comportement existait,
enfermé dans `Sheet` via un hook interne, donc inatteignable pour les
trente-cinq dialogues que les apps écrivent elles-mêmes. `react/a11y` l'expose :
`useFocusTrap`, `useEscape`, `useScrollLock`, `AnnouncerProvider` /
`useAnnouncer` (une seule région vivante, contre 66 attributs `aria-live`
dispersés), `SkipLink` (trois apps en ont un), `VisuallyHidden`. `tokens.css`
gagne `.dwc-sr-only` — redéfini dans cinq feuilles de style, absent des onze
autres — `.dwc-skip-link` et un bloc `prefers-reduced-motion`. `Sheet` et
`ConfirmDialog` reposent maintenant sur ces primitives, à comportement égal.

**Thèmes — six clés de stockage, dix barres système figées.** `'theme'` (quatre
apps), `'lh_theme'`, `'mc-theme'`, `'mister-doc:theme'`, `'mister_puzzle_theme'`
face au `'dwc_theme'` du paquet : adopter le socle perdait la préférence de
chaque utilisateur, une fois, en silence. `legacyKeys` (sur `themeBootSource`,
`useTheme` et `ThemeProvider`) lit l'ancienne clé et réécrit sous la neuve.
`pwaSeoPlugin({ themeColor })` remplace la balise `theme-color` de l'index par
deux balises `media` qui suivent le thème système dès le premier rendu, et
`ThemeProvider` en pose une sans `media` pour le choix explicite contraire.

**Observabilité — le transport était là, le contexte manquait.** Treize apps
initialisent Sentry, six seulement renseignent un contexte, et 59
`console.error`/`warn` ne quittent jamais le navigateur. Ajoutés :
`setSessionContext`, `breadcrumb` / `getBreadcrumbs` (tampon de vingt entrées,
**en mémoire seulement**), `captureConsole` (enveloppe la console, ne la
remplace pas), et le hook `useRouteBreadcrumbs`. Tout est masqué avant d'être
écrit — y compris les arguments objets d'un `console.warn`. Le relais Sentry
reçoit désormais le contexte **masqué** ; il recevait le contexte brut.

**Icônes — 149 symboles, zéro adoption.** `lucideIconSet` branche un jeu
complet en une ligne (`aria-hidden` sauf nom explicite, `focusable="false"`,
poids de trait commun), sans que le paquet dépende de `lucide-react`. Corrigé
au passage : `<Icon aria-label="…">` rendait une icône à la fois nommée et
masquée, donc muette.

**Rive — aucun `.riv` n'existe.** `find -name '*.riv'` renvoie zéro fichier sur
les seize dépôts, alors que trois apps déclarent un runtime. Le repli est donc
le cas nominal : `RiveAnimation` affiche son `fallback` si le runtime manque, si
le fichier manque ou si le rendu échoue, au lieu de faire disparaître l'écran ;
`onError` permet de le remonter ; un `src` neuf redonne sa chance au chargement.

**Mesure d'audience — le tag était posé, la mesure n'existait pas.** Neuf apps
portent les marqueurs `__ANALYTICS_*__`, trois ont recopié un extrait `gtag` en
dur, sept n'ont rien — et aucune n'envoie d'événement ni de vue de page après le
chargement initial. Nouveau module `analytics` : `initAnalytics`,
`setAnalyticsConsent`, `trackEvent`, `trackPageView`, `setUserProperties`, plus
le hook `usePageViews`. **Rien n'est injecté avant le consentement** : ni
script, ni requête, ni cookie. Les fragments de build sont désormais précédés
d'un `gtag('consent', 'default', …)` où tous les signaux sont `denied` — seule
position où le mode consentement en tient compte (`consent: false` restaure
l'ancien comportement). GA4 est configuré avec `send_page_view: false`, pour que
la page d'entrée ne soit pas comptée deux fois.

**Le seul changement de sortie visible.** `formatBytes` traduit son unité
(`1.4 MB` en anglais, au lieu du `1,4 Mo` figé par un tableau écrit en dur) et
sépare le nombre de l'unité par une espace fine insécable — le séparateur que
`formatNumber` produit déjà pour les milliers, et dont cette fonction était la
seule à s'écarter parce qu'elle assemblait sa chaîne à la main. Une comparaison
de chaînes écrite avec une espace ordinaire échoue donc et doit être ajustée.
