/*
 * Traductions du showroom.
 *
 * Le FRANÇAIS n'est pas dans ce fichier : c'est le contenu du HTML lui-même,
 * capturé au chargement. Une seule langue à maintenir en double, donc, et la
 * page reste lisible et correcte sans JavaScript.
 *
 * Trois espaces de clés :
 *   <section>.<élément>   blocs du document, portés par `data-i18n`
 *   ui.*                  libellés générés par `showroom.js`
 *   theme.<id>.tagline    accroches des thèmes (le FR vit dans `themes.js`)
 *
 * `test/showroom-i18n.test.mjs` vérifie qu'aucune clé du document n'est
 * absente ici, et qu'aucune clé d'ici ne désigne un bloc disparu.
 *
 * Fichier volontairement SANS import/export : chargeable par un `<script src>`
 * classique ET importable par node:test.
 */
globalThis.SHOWROOM_I18N = {
  en: {
    /* ── Chrome ───────────────────────────────────────────────────────── */
    'topbar.themeLabel': 'Theme',
    'ui.skip': 'Skip to content',
    'ui.scheme.legend': 'Colour scheme',
    'ui.scheme.light': 'Light',
    'ui.scheme.dark': 'Dark',
    'ui.scheme.system': 'System',
    'ui.lang.label': 'Language',
    'ui.settings': 'Settings',

    /* ── Intro ────────────────────────────────────────────────────────── */
    'intro.title': 'The miss-* / mister-* family design system',
    'intro.lede':
      'This package shares a <strong>structure</strong>, not an identity: fluid scales, breakpoints, iOS safe areas, touch targets, and React components shipped <strong>unstyled</strong>. Colour, display type and corner radii belong to each application.',
    'ui.toc.catalogue': 'Catalogue',
    'ui.toc.decisions': 'Which one',
    'ui.toc.hooks': 'Hooks',
    'ui.toc.fondations': 'Foundations',
    'ui.toc.couleurs': 'Colours',
    'ui.toc.primitives': 'Primitives',
    'ui.toc.composants': 'Application components',
    'ui.toc.a11y': 'Accessibility checks',
    'ui.toc.stack': 'Stack',
    'ui.toc.integration': 'Integration',
    'ui.toc.apps': 'Applications',

    /* ── Vitrine des dépôts ───────────────────────────────────────────── */
    'apps.h21': 'The family’s applications',
    'apps.p1':
      'Sixteen public repositories, <strong>fifteen</strong> of which consume this package — the desktop application imports none of it, and the “subpaths” field is what revealed it. This grid is not a list kept by hand in the page: it is generated from <code>apps-catalog.js</code> — the very file the applications import to show one another. Anything wrong here would be wrong in their footers.',
    'apps.note':
      '<strong>Domain and maturity are editorial</strong>, entered by hand: they state an intent, not a published version. <strong>Persistence</strong> and <strong>subpaths</strong> are <strong>surveyed</strong> in each app’s code — the real <code>import</code>s and <code>extends</code>, not an intention — and left blank where they were not: a filter that says “not surveyed” beats invented data. The <em>Consumes</em> filter therefore answers the first question a design system should ask itself: who actually uses what? <code>components.css</code> has a single adopter out of sixteen. The badges are painted with each application’s real primary colour, never with a remote icon: this showroom makes no network request.',
    'ui.apps.search': 'Search',
    'ui.apps.sort': 'Sort',
    'ui.apps.sortBy.curated': 'Catalogue order',
    'ui.apps.sortBy.maturity': 'Maturity',
    'ui.apps.sortBy.name': 'Name',
    'ui.apps.facet.maturity': 'Maturity',
    'ui.apps.facet.backend': 'Persistence',
    'ui.apps.facet.category': 'Domain',
    'ui.apps.all': 'All',
    'ui.apps.open': 'Open the app',
    'ui.apps.releases': 'Downloads',
    'ui.apps.repo': 'Repository',
    'ui.apps.theme': 'Dress the page',
    'ui.apps.total': '{n} applications',
    'ui.apps.shown': '{n} of {total}',
    'ui.apps.none': 'No application matches these criteria.',
    'ui.apps.reset': 'Show them all again',
    'ui.apps.consumes': 'Consumes',
    'ui.apps.consumesNothing': 'Consumes nothing',
    'ui.apps.configs': '{n} subpaths',
    'ui.apps.noConfig': 'Consumes nothing from the package.',
    'ui.apps.permalink': 'Direct link to {app}',
    'ui.apps.share': 'Copy the link to this view',
    'ui.apps.viewLegend': 'Display',
    'ui.apps.viewGrid': 'Grid',
    'ui.apps.viewTable': 'Table',
    'ui.apps.th.app': 'Application',
    'ui.apps.th.configs': 'Subpaths',
    'ui.apps.sortBy.updated': 'Last activity',
    'ui.ago.today': 'today',
    'ui.ago.days': '{n} d ago',
    'ui.ago.months': '{n} months ago',
    'ui.ago.years': '{n} years ago',
    'ui.metrics.pushed': 'code {ago}',
    'ui.metrics.archived': 'archived',
    'ui.metrics.date': 'repository state surveyed {ago}',
    'ui.backend.supabase': 'Supabase',
    'ui.backend.firebase': 'Firebase',
    'ui.backend.local': 'Local-first',
    'ui.backend.api': 'Third-party API',
    'ui.backend.none': 'Not surveyed',
    'ui.category.sante': 'Health',
    'ui.category.sport': 'Sport',
    'ui.category.jeux': 'Games',
    'ui.category.education': 'Education',
    'ui.category.loisirs': 'Leisure',
    'ui.category.outils': 'Tools',
    'ui.category.dev': 'Development',
    'ui.platform.web': 'Web',
    'ui.platform.desktop': 'Desktop',

    /* ── Catalogue ────────────────────────────────────────────────────── */
    'catalogue.h21': 'Catalogue',
    'catalogue.p1':
      'Everything the package exports, on one grid. A test compares this list against the real exports of <code>react/index.js</code>: whatever is not here is either covered by another entry or explicitly excluded — that is how the nine hooks, missing from their own showcase, were spotted.',
    'ui.cat.search': 'Search',
    'ui.cat.filterLegend': 'Filter by category',

    /* ── Which one do I use ───────────────────────────────────────────── */
    'decisions.h21': 'Which one do I use?',
    'decisions.p1':
      'The sections above show each component on its own. They never say which one to pick when two would do — and that is exactly where one hesitates. Each tree holds two to four branches; beyond that, it is not the tree that runs out of room, it is the API that is under-specified.',

    /* ── Hooks ────────────────────────────────────────────────────────── */
    'hooks.h21': 'Hooks and utilities',
    'hooks.p1':
      'Nine barrel exports — close to half the package’s React surface — and not one of them appeared here until now. They have no demo: a hook is not something you look at. They have a signature, a sentence, and the pitfall that comes with it.',
    'hooks.caption': 'Hooks and utilities exported by the package',
    'hooks.p2':
      '<code>useTheme</code> deserves a separate mention: it is the contract the switcher at the top of this page reproduces — <code>light | dark | system</code> persisted under <code>dwc_theme</code>, <code>data-theme</code> set on <code>&lt;html&gt;</code>.',

    /* ── Foundations ──────────────────────────────────────────────────── */
    'fondations.h21': 'Foundations',
    'fondations.p1':
      'Every token below comes from <code>tailwind-preset.css</code>, so it is identical across the whole family. The values shown are <strong>computed live</strong>: resize the window to watch the <code>clamp()</code> functions work.',
    'fondations.h31': 'Fluid type scale',
    'fondations.p2':
      'On the Tailwind side: <code>text-fluid-sm</code>, <code>text-fluid-2xl</code>… The “Rendering” column uses the current theme’s display font.',
    'fondations.h32': 'Font families',
    'fondations.p3':
      'The preset ships only <code>sans</code> and <code>mono</code> (system stacks, zero network requests). Display fonts (Fredoka, Plus Jakarta Sans, DM Sans, Inter…) are loaded by each app; this showroom downloads none of them and falls back to the system stack when they are not installed locally.',
    'fondations.h33': 'Fluid spacing',
    'fondations.h34': 'Breakpoints',
    'fondations.p4':
      'In <code>rem</code>, not <code>px</code>: breakpoints follow the browser’s font size. A larger default font therefore genuinely shifts the layout — otherwise it would be an accessibility regression.',
    'fondations.h35': 'iOS safe areas',
    'fondations.p5':
      'These are 0 everywhere except on a device with a notch or a home bar, and only when the document declares <code>viewport-fit=cover</code>. The <code>*-safe-3</code> variants add 0.75 rem to the system inset.',
    'fondations.h36': 'Touch target &amp; focus',
    'fondations.p6':
      'The preset also sets <code>:focus-visible</code> → <code>outline: 2px solid currentColor</code> with <code>outline-offset: 2px</code>. Walk the page with <kbd>Tab</kbd>: the ring follows the text colour, so it stays legible in every theme.',

    /* ── Colours ──────────────────────────────────────────────────────── */
    'couleurs.h21': 'Colours',
    'couleurs.p1':
      '<strong>The shared preset exposes no colour at all.</strong> That is deliberate: each application declares its palette in its own <code>@theme</code>. The showroom maps those palettes onto a common set of semantic roles — and that set is what the theme switcher rewrites.',
    'couleurs.p2':
      'Palette of the current theme, read through <code>getComputedStyle</code>.',
    'couleurs.compareTitle': 'Light and dark, side by side',
    'couleurs.compareIntro':
      'Validating a palette by toggling between schemes is a poor tool. Here they are simultaneously, for the selected theme.',

    /* ── Primitives ───────────────────────────────────────────────────── */
    'primitives.h21': 'Interface primitives',
    'primitives.p1':
      'These six components were not invented: they were <strong>extracted</strong> from what several apps had each already rewritten. The matrices below show combinations — that is where regressions live, not in the isolated instance.',
    'primitives.h31':
      'Button — variants × sizes × states <span class="sr-computed">(4 apps had the same API)</span>',
    'primitives.caption1': 'Matrix of button variants by size and state',
    'primitives.p2':
      '<code>loading</code> sets <code>aria-busy</code> <strong>and</strong> disables the button: showing a spinner without blocking let double clicks through in two apps.',
    'primitives.h32': 'Badge — semantic tones × variants',
    'primitives.caption2': 'Matrix of badge tones by variant',
    'primitives.p3':
      'A <code>tone</code> states an <em>intent</em>, not a colour — the actual hue comes from the app’s theme.',
    'primitives.h33': 'Field — validation states',
    'primitives.p4': 'Used for membership fee reminders.',
    'primitives.p5': 'In euros, two decimals.',
    'primitives.p6': 'The amount must be positive.',
    'primitives.p7':
      'On error, <code>aria-describedby</code> references the hint <strong>and</strong> the message — local copies replaced one with the other, hiding the instructions at the worst possible moment.',
    'primitives.h34': 'Stat — key figures',
    'primitives.p8':
      'The trend carries an arrow <strong>and</strong> a label read by screen readers: colour alone cannot distinguish a rise from a fall.',
    'primitives.h35': 'Skeleton — loading',
    'primitives.p9':
      'The bars are <code>aria-hidden</code>; only the container is announced (<code>role="status"</code>). Otherwise a screen reader says “loading” once per bar.',
    'primitives.h36': 'Sheet — modal sheet',
    'primitives.p10':
      'Try it with the keyboard: <kbd>Tab</kbd> cycles inside the panel, <kbd>Esc</kbd> closes it, and focus returns to the opening button — the three behaviours no local copy had all at once.',
    'ui.sheet.open': 'Open the sheet',
    'primitives.h37': 'Playground — compose and copy',
    'primitives.p11':
      'The matrices show chosen combinations; the one you need may not be among them. Set the props below: the preview follows, and the React call to copy is rewritten with them — <em>including</em> the accessibility attributes they entail.',
    'primitives.p12':
      'The DOM generated here is hand-written, as everywhere on this page — the showroom does not ship React. It is the <strong>same markup</strong> the component produces, dressed by the package’s real <code>components.css</code>; but it is the code snippet, not the preview, that is authoritative.',
    'primitives.h3card': 'Card — the surface ten apps had',
    'primitives.pcard':
      'A card is a surface, not a control: the action goes into <code>action</code> (a focusable element inside), never on the whole card. <code>CardHeader</code> renders a real heading so the document outline survives the layout.',

    /* ── Application components ───────────────────────────────────────── */
    'composants.h21': 'Application components',
    'composants.p1':
      'The package’s components only set <code>data-dwc</code> attributes: no classes, no imposed styling. Each app dresses them with its own CSS. Below is the exact DOM each component produces, styled by the current theme.',
    'composants.h41': 'EmptyState',
    'composants.p2': 'Empty state with a next action.',
    'composants.p3': 'Nothing here yet',
    'composants.p4': 'Create a first entry to see your statistics appear.',
    'composants.summary1': 'CSS selectors',
    'composants.h42': 'ErrorBanner',
    'composants.p5':
      'Recoverable error. <code>severity</code> separates temporary from permanent; <code>role</code> switches from <code>alert</code> to <code>status</code>.',
    'composants.summary2': 'CSS selectors',
    'composants.h43': 'SyncStatusBadge',
    'composants.p6':
      'Synchronisation state. The counter only appears for <code>pending</code>.',
    'composants.summary3': 'CSS selectors',
    'composants.h44': 'ErrorBoundary',
    'composants.p7':
      'Default fallback UI (avoids the white screen). The “backup” button only appears when <code>onDownloadBackup</code> is provided.',
    'composants.p8': 'Something went wrong.',
    'composants.summary4': 'CSS selectors',
    'composants.h45': 'PwaInstallPrompt',
    'composants.p9':
      'Passive banner (<code>role="region"</code>, not <code>dialog</code>: it does not trap focus).',
    'composants.p10': 'Install the app',
    'composants.p11':
      'Add this app to your home screen: quick access, works offline.',
    'composants.summary5': 'CSS selectors',
    'composants.h411': 'ShareButton',
    'composants.p21':
      'Native share, clipboard fallback. Cancelling shows nothing: dismissing the share sheet is not a failure.',
    'composants.share1': 'Share',
    'composants.share2': 'Link copied',
    'composants.summary14': 'CSS selectors',
    'composants.h46': 'UpdatePromptBanner',
    'composants.p12':
      '<code>registerSW</code> is now a prop instead of a hard import: the module has joined the barrel. The settings-screen <code>UpdateButton</code> does without it entirely.',
    'composants.summary6': 'CSS selectors',
    'composants.h49': 'ConfirmDialog',
    'composants.p16':
      'Seven apps out of sixteen had one, all different. Focus opens on <em>Cancel</em> — never on the confirmation.',
    'composants.summary9': 'CSS selectors',
    'composants.h50': 'Toast',
    'composants.p17':
      'Two live regions mounted at all times, and no role on the message: that is what avoids the double announcement found in two apps.',
    'composants.summary10': 'CSS selectors',
    'composants.h51': 'BottomNav',
    'composants.p18':
      'Seven apps out of sixteen have one. The current tab is never told apart by colour alone: <code>aria-current</code>, a rule, and a “Current page” that is read but not seen.',
    'composants.summary11': 'CSS selectors',
    'composants.h53': 'AppHeader',
    'composants.p22':
      'Nine apps have a header. The title IS the page’s <code>h1</code>; the back control is a link when it has a destination, a button when it only has an action — named “Back” in seven languages.',
    'composants.summary15': 'CSS selectors',
    'composants.h54': 'PageContainer',
    'composants.p23':
      'Centred, capped at a width tier, iOS safe areas included — the bottom one above all, without which the last button of a view sticks to the tab bar. Promoted from badminton and molkky.',
    'composants.summary16': 'CSS selectors',
    'composants.h55': 'LoginForm',
    'composants.p24':
      'Four apps had the same screen: two fields, one button, one translated error. The form is presentational — the caller signs in and passes back <code>busy</code> and <code>error</code>; <code>children</code> and <code>footer</code> hold the rest (sign-up, passkey, forgotten password).',
    'composants.summary17': 'CSS selectors',
    'composants.h56': 'MfaChallenge',
    'composants.p25':
      'The TOTP step at sign-in, promoted from mister-doc and miss-uwh: numeric keyboard, the received code offered by the OS, a recovery path and a sign-out only when the caller provides them.',
    'composants.summary18': 'CSS selectors',
    'composants.h52': 'ThemeToggle',
    'composants.p19':
      'Five apps have one. This one cycles through the <em>three</em> states of <code>useTheme</code>: a two-state toggle makes “system” unreachable.',
    'composants.summary12': 'CSS selectors',
    'composants.h47': 'AppFooter',
    'composants.p13': 'Source-code link plus sponsor link, opened safely.',
    'composants.summary7': 'CSS selectors',
    'composants.h410': 'AppVersion',
    'composants.p20':
      'The version number, injected at build time by <code>vite-version</code>: what is running, what was just installed, what is online.',
    'composants.version1': 'Version',
    'composants.version2': 'Built on 26 August 2026 · 104c944',
    'composants.version3': 'Version 3.14.0 available',
    'composants.summary13': 'CSS selectors',
    'composants.h48': 'FamilyApps',
    'composants.p14':
      'The “our other apps” grid, fed by <code>apps-catalog.js</code>, with a maturity badge.',
    'composants.h31': 'Our other apps',
    'composants.summary8': 'CSS selectors',
    'composants.p15':
      'The real icons are loaded from each app’s GitHub Pages. This showroom stays offline: it exercises the component’s fallback path (first letter of the name).',

    /* ── Accessibility ────────────────────────────────────────────────── */
    'a11y.h21': 'Accessibility checks',
    'a11y.p1':
      'Measured <strong>on this page</strong>, in the current theme, on every theme change and every resize. These are not copied values: they come out of <code>getBoundingClientRect</code> and <code>getComputedStyle</code>.',
    'a11y.h31': 'Touch target',
    'a11y.caption1': 'Measured height of interactive controls',
    'a11y.p2':
      'Threshold of 2.75 rem (≈ 44 px), per WCAG 2.5.5 and iOS guidance. The shared <code>Button</code> holds it even at size <code>sm</code> — the apps’ local variants went down to 32 px.',
    'a11y.h32': 'Text contrast',
    'a11y.caption2':
      'Contrast ratios computed per foreground / background pair',
    'a11y.p3':
      'AA thresholds: 4.5:1 for body text, 3:1 for large text and user-interface elements. An app theme that fails here fails inside the app too.',
    'a11y.fc.title': 'Forced colours',
    'a11y.fc.intro':
      'Under Windows high contrast, the browser <strong>overrides</strong> text, background and border colours, and drops shadows. Since all of <code>components.css</code> rests on custom properties and <code>color-mix()</code>, that rendering cannot be reasoned about — it has to be looked at.',
    'a11y.fc.before': 'Without the fixes',
    'a11y.fc.after': 'With the shipped fixes',
    'a11y.fc.sim':
      '<strong>These two panels are an emulation</strong>, not the real mode: the page reproduces by hand what the browser does — colours reduced to the Windows “Aquatic” system palette, shadows removed, and <code>transparent</code> <strong>left untouched</strong>, because forcing does not affect it. That last point is exactly what empties the primary button on the left. The authentic rendering comes from switching on a contrast theme in the operating system, or from <code>Rendering › Emulate CSS media (forced-colors)</code> in the developer tools.',
    'a11y.fc.caption': 'Forced-colours regressions and the fixes shipped',

    /* ── Accessibility tooling ────────────────────────────────────────── */
    'a11y.toolsTitle': 'The tool chain',
    'a11y.toolsIntro':
      'Four successive nets, from the developer’s keyboard to the user’s browser. None is sufficient alone — that is why there are four.',
    'a11y.tools.th.tool': 'Tool',
    'a11y.tools.th.when': 'When',
    'a11y.tools.th.scope': 'What it catches',
    'a11y.tools.th.shared': 'Shared config',
    'a11y.tools.lint.when': 'While writing',
    'a11y.tools.lint.scope':
      'Mistakes visible in the JSX: image without alt, click handler on a <code>&lt;div&gt;</code>, orphan label. <code>recommended</code> rules as <code>warn</code>.',
    'a11y.tools.axe.when': 'In CI, real browser',
    'a11y.tools.axe.scope':
      'WCAG violations on the rendered DOM, tags <code>wcag2a</code>, <code>wcag2aa</code>, <code>wcag21a</code>, <code>wcag21aa</code>. Suite present in <strong>11 apps</strong>.',
    'a11y.tools.lh.when': 'In CI, on the build',
    'a11y.tools.lh.scope':
      'Overall accessibility score, set to <strong><code>error</code></strong> below <strong>0.9</strong> — the PR is blocked. Configured in <strong>12 apps</strong>.',
    'a11y.tools.ds.name': 'The design system',
    'a11y.tools.ds.when': 'At runtime',
    'a11y.tools.ds.scope':
      'What an audit cannot catch because it is decided at design time: 2.75 rem touch target enforced, <code>:focus-visible</code> following the text colour, breakpoints in <code>rem</code>, <code>prefers-reduced-motion</code>, severities never carried by colour alone.',
    'a11y.tools.note':
      '<strong>axe-core catches only 30 to 50 % of defects</strong>, and Lighthouse fewer still. A score of 100 does not mean an app is usable with a keyboard, nor that a screen reader announces it correctly — hence the last two rows of the table, and the measurements below.',

    /* ── Demo gallery ─────────────────────────────────────────────────── */
    'demo.title': 'Demo by application',
    'demo.intro':
      'The <em>Dress the page</em> button on a <a href="#apps">showcase</a> card switches the whole showroom into that application’s universe; the preview below then shows the shared components wearing its colours. Same page, same CSS — only the thirteen contract variables change. This section used to carry its own application menu: two selectors for one switch was one too many.',
    'ui.demo.current': 'Preview dressed by {app}.',
    'ui.demo.generic': 'Generic preview: no application selected.',
    'demo.note':
      '<strong>These are generated previews, not screenshots.</strong> They are painted live with each app’s real palette and the package’s real components — so they show the design system faithfully in each universe, but not the applications’ own screens. A real capture dropped into <code>showroom/screenshots/</code> and declared in <code>screenshots.js</code> automatically takes the preview’s place.',
    'ui.demo.season': 'Season',
    'ui.demo.members': 'Members',
    'ui.demo.paid': 'Paid up',
    'ui.demo.pending': 'Pending',
    'ui.demo.search': 'Search',
    'ui.demo.searchValue': 'Membership fee…',
    'ui.demo.validate': 'Confirm',
    'ui.demo.later': 'Later',
    'ui.toc.demo': 'Demo',

    /* ── Stack ────────────────────────────────────────────────────────── */
    'stack.title': 'Family stack',
    'stack.intro':
      'Taken from the applications’ <code>package.json</code> and source code, not from a statement of intent. What follows describes what is <strong>actually installed and called</strong>.',
    'stack.db.title': 'Databases',
    'stack.db.intro':
      'Three persistence families coexist, and that is deliberate: an app that needs no user account ships no backend.',
    'stack.db.th.backend': 'Persistence',
    'stack.db.th.apps': 'Applications',
    'stack.db.th.features': 'Features in use',
    'stack.db.supabase.apps':
      '7 apps — carbook, lookhouse, uwh, doc, footcoach, mölkky, family-map',
    'stack.db.supabase.features':
      'Postgres + <strong>RLS</strong> (deny-by-default), Auth, Realtime (<code>.channel()</code>), SQL functions (<code>.rpc()</code>), Storage, Edge Functions (<code>functions.invoke</code>), versioned migrations — from 3 (footcoach) to 26 (doc).',
    'stack.db.firebase.apps': '3 apps — miss-ticket, puzzle, qowa',
    'stack.db.firebase.features':
      'Realtime Database for low-latency live data (puzzle, qowa), Firestore for structured data (miss-ticket, qowa), Auth, Storage, Cloud Functions.',
    'stack.db.local.name': 'Local-first',
    'stack.db.local.apps':
      '5 apps — badminton, contraction, dice, genius, cim10',
    'stack.db.local.features':
      '<code>localStorage</code> / IndexedDB only. No account, no data leaving the phone — often the right call, and the best GDPR answer.',
    'stack.db.notes':
      '<strong>miss-supaboss</strong> is the odd one out: it <em>drives</em> other Supabase accounts through a Node backend and a personal token, with no Supabase client in the browser. The package also ships a <strong>keep-alive</strong> (reusable workflow + <code>templates/supabase/keep-alive.sql</code>) against the free plan’s automatic pausing.',
    'stack.icons.title': 'Icons',
    'stack.icons.body':
      '<code>lucide-react</code> is the family standard: <strong>10 apps out of 15</strong> use it. Tree-shaken SVG icons (only the imported ones ship), adjustable <code>strokeWidth</code> and <code>size</code>, and <code>currentColor</code> that follows the theme tokens.',
    'stack.icons.note':
      'Two caveats learned the hard way: lucide 1.x <strong>dropped brand icons</strong> — the GitHub mark in the shared components is an inline SVG; and a decorative icon must carry <code>aria-hidden</code>, the accessible label living on the button that contains it. The 5 apps without lucide use hand-written inline SVG.',
    'stack.maps.title': 'Maps and geography',
    'stack.maps.body':
      'Only one app needs them: <strong>miss-lookhouse</strong> (property watch), with <strong>Leaflet 1.9</strong> — listing display and a polygon zone editor. <strong>OpenStreetMap</strong> tiles, with attribution and <strong>no API key</strong>: no third-party account, no quota, no tracker.',
    'stack.maps.note':
      'No family-wide standard here — a single use case does not justify a rule. If a second app needs mapping, Leaflet + OSM is the starting point to reuse.',
    'stack.rive.title': 'Animation — Rive',
    'stack.rive.body':
      '<strong>3 apps out of 15</strong> integrate <a href="https://rive.app" rel="noopener noreferrer" target="_blank">Rive</a> — vector animation driven by <em>state machines</em> rather than Lottie/GIF loops. And on two different runtimes: <code>@rive-app/react-canvas</code> for miss-badminton and mister-mölkky, <code>@rive-app/react-webgl2</code> for miss-genius.',
    'stack.rive.th.app': 'Application',
    'stack.rive.th.runtime': 'Runtime',
    'stack.rive.th.guard': 'Guard before loading the engine',
    'stack.rive.badminton':
      '<code>import.meta.glob</code> at build time: no file means no <code>fetch</code>, hence no 404. Then a check of the <strong>4 header bytes</strong> (<code>RIVE</code>) before mounting the canvas.',
    'stack.rive.molkky':
      'The same header probe, plus a <code>React.lazy</code> on the canvas module: the WASM (~200 kB) only comes down if a valid file exists.',
    'stack.rive.genius':
      'Three exits towards the static visual: no <code>src</code>, a <code>loaderror</code> event, or <code>prefers-reduced-motion</code>. The WebGL engine is then never loaded at all.',
    'stack.rive.note':
      'Two findings a <code>package.json</code> does not show. <strong>No <code>.riv</code> file is shipped</strong> — the three folders hold nothing but a README: in production all three apps currently display their static fallback, which is also the best-tested path. And <strong>none of them uses the package’s wrapper</strong> (<code>RiveAnimation</code>, subpath <code>/react/rive</code>): it wraps the <code>&lt;Rive&gt;</code> <em>component</em>, whereas all three need the <code>useRive</code> <em>hook</em> to reach the instance — state-machine inputs, error events, <code>cleanup()</code>. A wrapper that hides the instance is useless here; that is an API mismatch, not an oversight.',
    'stack.tests.title': 'Testing tools',
    'stack.tests.th.tool': 'Tool',
    'stack.tests.th.scope': 'Scope',
    'stack.tests.th.shared': 'Shared config',
    'stack.tests.vitest':
      'Unit and component tests, in jsdom. Present in <strong>all 13 apps</strong>, from 2 to 54 test files.',
    'stack.tests.playwright':
      'Critical end-to-end journeys, in a real browser. 11 apps.',
    'stack.tests.axe':
      'Automated accessibility audit, wired into Playwright. 10 apps.',
    'stack.tests.browser.name': 'Vitest Browser Mode',
    'stack.tests.browser':
      'Components in a real browser rather than jsdom. Available, <strong>used by no app</strong> so far.',
    'stack.tests.note':
      'axe-core catches only part of the accessibility defects — typically 30 to 50 %. It replaces neither the keyboard walkthrough nor the contrast checks in the previous section.',

    /* ── Integration ──────────────────────────────────────────────────── */
    'integration.h21': 'Integration',
    'integration.p1':
      'Two lines in the app’s main CSS are enough to inherit everything above. The palette is then declared in the project’s own <code>@theme</code>.',
    'integration.p2':
      'A reminder about priority: a <code>@theme</code> placed <strong>after</strong> the import overrides the preset; unlayered CSS beats the <code>base</code> layer.',
    'integration.p3':
      "The light/dark scheme is driven by the <code>useTheme()</code> hook (<code>light | dark | system</code>), which sets <code>data-theme</code> on <code>&lt;html&gt;</code> — or the <code>.dark</code> class with the <code>attribute: 'class'</code> option. The switcher at the top of this page reproduces that contract exactly.",

    /* ── Sheet demo &amp; footer ──────────────────────────────────────── */
    'sheet.title': 'Add an expense',
    'sheet.save': 'Save',
    'sheet.cancel': 'Cancel',
    'sheet.note':
      'The panel keeps focus: <kbd>Tab</kbd> returns to the first element after the last one.',
    'footer.text':
      'Static showroom — no dependency, no build, no network request. Palettes are taken from each application’s CSS; the source of truth for tokens remains <code>tailwind-preset.css</code>, and <code>test/showroom.test.mjs</code> checks that no drift creeps in.',

    /* ── Libellés générés par showroom.js ─────────────────────────────── */
    'ui.role.bg': 'Background',
    'ui.role.bg.desc': 'Page background',
    'ui.role.surface': 'Surface',
    'ui.role.surface.desc': 'Cards, panels, bars',
    'ui.role.surface2': 'Surface 2',
    'ui.role.surface2.desc': 'Recessed areas, table headers',
    'ui.role.border': 'Border',
    'ui.role.border.desc': 'Dividers, field outlines',
    'ui.role.text': 'Text',
    'ui.role.text.desc': 'Main content',
    'ui.role.textSoft': 'Muted text',
    'ui.role.textSoft.desc': 'Captions, hints',
    'ui.role.primary': 'Primary',
    'ui.role.primary.desc': 'Main action, selection',
    'ui.role.primaryContrast': 'On primary',
    'ui.role.primaryContrast.desc': 'Text sitting on the primary colour',
    'ui.role.primarySoft': 'Soft primary',
    'ui.role.primarySoft.desc': 'Tinted backgrounds, pills',
    'ui.role.accent': 'Accent',
    'ui.role.accent.desc': 'Secondary brand colour',
    'ui.role.success': 'Success',
    'ui.role.success.desc': 'Confirmed, credit, online',
    'ui.role.warning': 'Warning',
    'ui.role.warning.desc': 'Pending, degraded',
    'ui.role.danger': 'Danger',
    'ui.role.danger.desc': 'Error, deletion, debit',
    'ui.role.info': 'Information',
    'ui.role.info.desc': 'Neutral, contextual, help',

    'ui.contrast': 'contrast',
    'ui.contrast.aa': 'AA ✓',
    'ui.contrast.aaLarge': 'AA (large text)',
    'ui.groups.reference': 'Reference',
    'ui.groups.apps': 'Consuming applications',
    'ui.maturity.alpha': 'Alpha',
    'ui.maturity.beta': 'Beta',
    'ui.maturity.stable': 'Stable',
    'ui.newTab': 'new tab',
    'ui.font.none': 'Display — system stack (no dedicated font)',
    'ui.font.some': 'Display —',
    'ui.hint.darkOnly': 'dark-only app: the light scheme is disabled',
    'ui.hint.classAttr': 'theme driven by the .dark class on the app side',

    'ui.matrix.variant': 'Variant',
    'ui.matrix.tone': 'Tone',
    'ui.button.primary': 'Primary',
    'ui.button.secondary': 'Secondary',
    'ui.button.outline': 'Outline',
    'ui.button.ghost': 'Ghost',
    'ui.button.danger': 'Danger',
    'ui.button.small': 'Small',
    'ui.button.medium': 'Medium',
    'ui.button.large': 'Large',
    'ui.button.sending': 'Sending…',
    'ui.button.inactive': 'Inactive',
    'ui.button.add': 'Add',

    'ui.a11y.control': 'Control',
    'ui.a11y.measured': 'Measured',
    'ui.a11y.minHeight': 'Min. height',
    'ui.a11y.verdict': 'Verdict',
    'ui.a11y.pass': '✓ ≥ 44 px',
    'ui.a11y.fail': '✗ below threshold',
    'ui.a11y.pair': 'Pair',
    'ui.a11y.ratio': 'Ratio',
    'ui.a11y.threshold': 'AA threshold',
    'ui.a11y.ok': '✓ compliant',
    'ui.a11y.ko': '✗ insufficient',
    'ui.a11y.group.buttons': 'Button — all sizes',
    'ui.a11y.group.fields': 'Form controls',
    'ui.a11y.group.sheetClose': 'Sheet close button',
    'ui.a11y.group.bannerActions': 'Banner actions',
    'ui.a11y.group.familyCards': 'Family cards',
    'ui.a11y.group.footerLinks': 'Footer links',
    'ui.a11y.mutedOnSurface': 'Muted text on surface',
    'ui.a11y.suggestText': 'text',
    'ui.a11y.suggestBg': 'background',
    'ui.a11y.copyFix': 'Copy the suggested colour',
    'ui.a11y.locate': 'Locate on the page',
    /* ── Catalogue, pièges, hooks ─────────────────────────────────────── */
    'ui.pitfalls': 'Pitfalls',
    'ui.a11yNote': 'Accessibility',
    'ui.hooks.th.name': 'Signature',
    'ui.hooks.th.what': 'What it does',
    'ui.hooks.th.dont': 'Pitfall',
    'ui.cat.all': 'All',
    'ui.cat.primitive': 'Primitive',
    'ui.cat.feedback': 'Feedback',
    'ui.cat.pwa': 'PWA',
    'ui.cat.shell': 'Shell',
    'ui.cat.hook': 'Hook',
    'ui.cat.total': '{n} entries',
    'ui.cat.shown': '{n} of {total}',

    /* ── Bac à sable ──────────────────────────────────────────────────── */
    'ui.pg.component': 'Component',
    'ui.pg.preview': 'Preview',
    'ui.pg.save': 'Save',
    'ui.pg.badge': 'Up to date',
    'ui.pg.amount': 'Amount',
    'ui.pg.hint': 'In euros, two decimals.',
    'ui.pg.error': 'The amount must be positive.',
    'ui.pg.members': 'Members',
    'ui.pg.up': 'rising',
    'ui.pg.down': 'falling',
    'ui.pg.loading': 'Loading entries',
    'ui.pg.note.iconOnly':
      '`iconOnly` requires `aria-label` — it is added to the snippet above: without it the button would have no accessible name.',
    'ui.pg.note.loading':
      '`loading` sets `aria-busy` AND disables: that is what prevents double submission.',
    'ui.pg.note.badge':
      'The tone states an INTENT; the hue comes from the application’s theme.',
    'ui.pg.note.field':
      'aria-describedby references the hint AND the error — local copies replaced one with the other.',
    'ui.pg.note.stat':
      '`trendLabel` is read by screen readers: the arrow and the colour are not enough.',
    'ui.pg.note.skeleton':
      'The label is announced ONCE, by the container — not once per bar.',

    /* ── Contraste forcé ──────────────────────────────────────────────── */
    'ui.fc.synced': 'Synced',
    'ui.fc.panel': 'Modal panel',
    'ui.fc.th.what': 'What breaks',
    'ui.fc.th.why': 'Why',
    'ui.fc.th.fix': 'Fix shipped',
    'ui.fc.on':
      'Your browser is in forced colours: this whole page, emulation included, is already rendered by the real mode.',
    'ui.fc.off':
      'Your browser is not in forced colours — the two panels below are therefore a reconstruction.',
    'fc.row.button': 'Primary button, soft badge',
    'fc.cause.transparent':
      '`transparent` is not replaced: the fill disappears, the border stays invisible.',
    'fc.row.sheet': 'Modal panel',
    'fc.cause.shadow':
      '`box-shadow` is dropped and the backdrop turns opaque: the two merge.',
    'fc.row.skeleton': 'Loading skeleton',
    'fc.cause.fill':
      'It only ever existed through its background colour, reduced to `Canvas`.',
    'fc.row.sync': 'Sync badge',
    'fc.cause.dot':
      'Same cause. Tones no longer differ — at no cost: the state is spelled out next to it.',
    'fc.row.hover': 'Hover',
    'fc.cause.filter':
      '`filter` is not forced: `brightness()` washes out the palette the user chose.',
    'fc.row.disabled': 'Disabled button',
    'fc.cause.opacity':
      '`opacity` is not forced either: the button stays legible, hence misleading.',
    'fc.row.nav': 'Current tab of the bottom bar',
    'fc.cause.tint':
      'Primary and soft text collapse onto the SAME system ink: telling the active tab apart by colour stops working.',
    'ui.fc.toast': 'Saved',
    'ui.fc.theme': 'Theme: dark',
    'ui.fc.nav': 'Main navigation',
    'ui.fc.tab.home': 'Home',
    'ui.fc.tab.settings': 'Settings',

    'ui.usage': 'Usage',
    'ui.copySnippet': 'Copy the snippet',
    'ui.copyToken': 'Copy',
    'ui.copied': 'Copied',
    'ui.copyFailed': 'Copy unavailable — select the text',

    /* ── Accroches des thèmes (le FR vit dans themes.js) ──────────────── */
    'theme.generic.name': 'Generic — preset only',
    'theme.generic.tagline':
      'What the preset actually provides: structure, not colour. Monochrome reference palette.',
    'theme.miss-badminton.tagline':
      'Slate neutrals plus indigo, violet glows in the background.',
    'theme.miss-carbook.tagline':
      'Deep teal and amber, dense tables and status badges.',
    'theme.miss-contraction.tagline':
      'Soft magenta over pastel gradients, a calm maternity mood.',
    'theme.miss-genius.tagline':
      'Deep violet plus coral, modern and scholarly, generous radii.',
    'theme.miss-lookhouse.tagline':
      'Light teal and cyan, readable and sober property watch.',
    'theme.miss-supaboss.tagline':
      'Supabase green on midnight blues, an ops tool designed dark-first.',
    'theme.miss-uwh.tagline':
      'The club’s cobalt blue and gold, over blue-tinted neutrals.',
    'theme.mister-cim10.tagline':
      'Clinical teal on midnight blue, high information density.',
    'theme.mister-doc.tagline':
      'Teal on very dark slate, a readable on-call schedule.',
    'theme.mister-footcoach.tagline':
      'Pitch green on gray neutrals, theme driven by the .dark class.',
    'theme.mister-molkky.tagline':
      'Meadow green and warm wood on cream paper, an outdoor-game mood.',
    'theme.mister-puzzle.tagline':
      'Indigo on zinc neutrals, calm and contrasted real-time.',
    'theme.mister-qowa.tagline':
      'TV quiz stage: midnight violet, vivid accents. Dark-only app.',
    'theme.miss-dice.tagline':
      'Indigo night and electric violet, a single brand tone.',
    'theme.miss-ticket-pwa.tagline':
      'Near-black zinc neutrals and raspberry pink, one single scale.',
    'theme.mister-quota.tagline':
      'Cold slate and sky blue — desktop application, dark-only.',
  },
};
