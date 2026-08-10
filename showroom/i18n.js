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

    /* ── Intro ────────────────────────────────────────────────────────── */
    'intro.title': 'The miss-* / mister-* family design system',
    'intro.lede':
      'This package shares a <strong>structure</strong>, not an identity: fluid scales, breakpoints, iOS safe areas, touch targets, and React components shipped <strong>unstyled</strong>. Colour, display type and corner radii belong to each application.',
    'ui.toc.fondations': 'Foundations',
    'ui.toc.couleurs': 'Colours',
    'ui.toc.primitives': 'Primitives',
    'ui.toc.composants': 'Application components',
    'ui.toc.a11y': 'Accessibility checks',
    'ui.toc.stack': 'Stack',
    'ui.toc.integration': 'Integration',

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
    'composants.h46': 'UpdatePromptBanner',
    'composants.p12':
      'Imported through its own subpath (coupled to <code>virtual:pwa-register/react</code>, outside the barrel).',
    'composants.summary6': 'CSS selectors',
    'composants.h47': 'AppFooter',
    'composants.p13': 'Source-code link plus sponsor link, opened safely.',
    'composants.summary7': 'CSS selectors',
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
      '6 apps — carbook, lookhouse, uwh, doc, footcoach, mölkky',
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
  },
};
