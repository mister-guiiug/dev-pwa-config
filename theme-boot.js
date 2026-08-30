/**
 * Le script anti-FOUC, engendré au lieu d'être recopié.
 *
 * PROMU, PAS INVENTÉ — et c'est la plus grosse duplication du domaine.
 * **Treize apps sur seize** portent un script de thème EN LIGNE dans leur
 * `index.html`, de dix à trente-trois lignes, tous différents. Il doit être
 * inline et synchrone : le moindre `<script src>` différé laisse la page
 * s'afficher en clair avant de basculer en sombre — le flash que ce code
 * existe pour supprimer.
 *
 * Le paquet ne pouvait donc pas l'atteindre depuis JavaScript. Sauf que
 * `pwaSeoPlugin` transforme déjà `index.html` pour y injecter GTM et le
 * sitemap : le même crochet sert ici.
 *
 * CE QUE LE SCRIPT FAIT, et rien de plus : lire la préférence stockée, la
 * résoudre contre `prefers-color-scheme`, poser `data-theme` (ou la classe
 * `dark`) et `color-scheme` sur `<html>`. Exactement ce que fait `useTheme`
 * ensuite — d'où le partage des mêmes clés et de la même validation, sans quoi
 * les deux divergent et le flash revient par la bande.
 *
 * LA MIGRATION DE CLÉ, sans quoi ce module casse ce qu'il vient réparer.
 * Mesure sur les seize apps : **six clés de stockage distinctes** — `'theme'`
 * (quatre apps), `'lh_theme'`, `'mc-theme'`, `'mister-doc:theme'`,
 * `'mister_puzzle_theme'` — et le paquet arrive avec `'dwc_theme'`. Adopter ce
 * script sans passer `storageKey` orpheline SILENCIEUSEMENT la préférence de
 * chaque utilisateur déjà installé : il retrouve le thème système, sans rien
 * avoir demandé. `legacyKeys` lit les anciennes clés une fois, réécrit sous la
 * neuve, et le problème ne se pose plus jamais.
 *
 * SANS DÉPENDANCE. Rend une chaîne ; l'injection est le travail de l'appelant.
 */

/** Clé de stockage par défaut, alignée sur `react/use-theme`. */
export const DEFAULT_STORAGE_KEY = 'dwc_theme';

/**
 * Corps du script, en ES5 et sans dépendance : il s'exécute avant tout bundle,
 * dans le `<head>`, y compris sur un navigateur que la page ne cible plus.
 *
 * @param {{ storageKey?: string, attribute?: 'data-theme'|'class',
 *   defaultTheme?: 'light'|'dark'|'system', lang?: boolean,
 *   langKey?: string }} [options]
 * @returns {string} Le JavaScript seul, sans balise.
 */
export function themeBootSource(options = {}) {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    attribute = 'data-theme',
    defaultTheme = 'system',
    legacyKeys = [],
  } = options;

  // Sérialisées en JSON : une clé contenant une apostrophe ou un guillemet ne
  // doit pas pouvoir refermer la chaîne — c'est du code injecté dans du HTML.
  const key = JSON.stringify(String(storageKey));
  const fallback = JSON.stringify(
    defaultTheme === 'system' ? 'light' : String(defaultTheme)
  );
  const apply =
    attribute === 'class'
      ? "r.classList.toggle('dark', e === 'dark');"
      : "r.setAttribute('data-theme', e);";

  // La migration : on ne la génère que si des anciennes clés sont déclarées,
  // pour ne pas alourdir d'un octet le script des apps qui n'en ont pas.
  const legacy = (Array.isArray(legacyKeys) ? legacyKeys : [legacyKeys])
    .filter(k => typeof k === 'string' && k && k !== storageKey)
    .map(k => JSON.stringify(k));
  const migrate = legacy.length
    ? `if(v!=='light'&&v!=='dark'){var L=[${legacy.join(',')}],i;` +
      'for(i=0;i<L.length;i++){var o=localStorage.getItem(L[i]);' +
      // On accepte aussi `'system'` : c'est une valeur que les copies stockent,
      // et la migrer évite de redemander le choix. Elle se résout ensuite comme
      // une absence, donc par `prefers-color-scheme`.
      "if(o==='light'||o==='dark'||o==='system'){v=o;" +
      `localStorage.setItem(${key},o);break;}}}`
    : '';

  // RIEN DE STOCKÉ : c'est `defaultTheme` qui tranche, PAS le système.
  //
  // Ce script résolvait toujours contre `prefers-color-scheme` en l'absence de
  // valeur stockée, en ignorant le `defaultTheme` qu'on lui passait. Or
  // `useTheme` le respecte, lui : une app déclarant `defaultTheme: 'light'`
  // obtenait un premier rendu SOMBRE (système) puis un basculement en clair
  // (React) — c'est-à-dire exactement le scintillement que ce script existe
  // pour supprimer, causé par le script lui-même, et seulement chez les
  // utilisateurs dont le système contredit le défaut de l'app.
  //
  // `system` continue de se résoudre par `prefers-color-scheme` : c'est ce que
  // le mot veut dire, et c'est le défaut.
  const resolveEmpty =
    defaultTheme === 'light' || defaultTheme === 'dark'
      ? JSON.stringify(defaultTheme)
      : "(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')";

  return (
    '(function(){try{' +
    'var r=document.documentElement,' +
    `v=localStorage.getItem(${key});` +
    migrate +
    "var e=v==='light'||v==='dark'?v:" +
    `${resolveEmpty};` +
    apply +
    'r.style.colorScheme=e;' +
    // Un stockage refusé (navigation privée, cookies bloqués) ne doit pas
    // laisser la page SANS thème : c'est le cas que miss-supaboss traite, et
    // que les autres copies laissent tomber en silence.
    `}catch(_){document.documentElement.setAttribute('data-theme',${fallback});}})();`
  );
}

/** Le même script, enveloppé dans sa balise, prêt à injecter dans le `<head>`. */
export function themeBootScript(options = {}) {
  return `<script>${themeBootSource(options)}</script>`;
}

/* ── La couleur de la barre système ────────────────────────────────────── */

/** Une couleur CSS crédible, sans quoi on n'écrit rien dans le HTML. */
function safeColor(value) {
  const color = String(value ?? '').trim();
  // Ni guillemet, ni chevron, ni point-virgule : c'est un attribut HTML
  // engendré, pas une valeur de confiance.
  return color && !/["'<>]/.test(color) && color.length <= 64 ? color : null;
}

/**
 * Les deux balises `<meta name="theme-color">` qui suivent le thème SYSTÈME.
 *
 * LE CONSTAT. Quinze valeurs de `theme-color` distinctes dans la famille, et
 * **cinq apps seulement** la resynchronisent quand le thème change : les dix
 * autres gardent une barre de navigateur claire en mode sombre. Trois d'entre
 * elles écrivent pour cela du JavaScript qui va chercher la balise et réécrit
 * `content` — alors que l'attribut `media` fait exactement cela, sans script
 * et **dès le premier rendu**, avant que le moindre bundle soit évalué.
 *
 * CE QUE ÇA NE COUVRE PAS, et pourquoi `ThemeProvider` complète. `media` suit
 * `prefers-color-scheme`, donc le système. Un utilisateur qui a explicitement
 * choisi « sombre » sur un système clair n'est pas servi ici : c'est
 * `ThemeProvider` qui pose alors une balise sans `media`, ajoutée en dernier,
 * qui l'emporte. Les deux se complètent au lieu de se remplacer.
 *
 * @param {{ light?: string, dark?: string }} colors
 * @returns {string} Les balises, ou `''` si aucune couleur exploitable.
 */
export function themeColorMetaTags(colors = {}) {
  const light = safeColor(colors.light);
  const dark = safeColor(colors.dark);
  const tags = [];
  if (light) {
    tags.push(
      `<meta name="theme-color" content="${light}" media="(prefers-color-scheme: light)">`
    );
  }
  if (dark) {
    tags.push(
      `<meta name="theme-color" content="${dark}" media="(prefers-color-scheme: dark)">`
    );
  }
  return tags.join('\n    ');
}

/**
 * La balise elle-même. Volontairement SANS préfixe d'espaces.
 *
 * La première version commençait par `[ \t]*`, pour absorber l'indentation en
 * même temps que la balise. CodeQL l'a signalée, et la mesure lui donne
 * raison : sur une suite de N tabulations qui ne mène à aucun `<meta`, le
 * moteur repart de chaque position et rescanne — coût quadratique, vérifié à
 * 5 ms pour 2 000 tabulations, 379 ms pour 16 000. L'entrée est le HTML que
 * Vite passe au plugin, donc pas une valeur dont ce module décide.
 *
 * Ici la balise commence par un littéral obligatoire : les positions de départ
 * sont bornées par le nombre de `<meta` réellement présents.
 */
const THEME_COLOR_META = /<meta\b[^>]*\bname=["']theme-color["'][^>]*>/gi;

/**
 * Retire les `<meta name="theme-color">` déjà présentes dans un HTML.
 *
 * L'indentation résiduelle est traitée LIGNE PAR LIGNE, en code ordinaire : une
 * ligne qui ne portait que la balise disparaît, une ligne qui portait autre
 * chose est conservée telle quelle. Aucune expression rationnelle ne voit
 * d'espaces, donc plus rien à faire rétrograder.
 */
export function stripThemeColorMeta(html) {
  const source = String(html);
  if (!source.includes('theme-color')) return source;

  const kept = [];
  for (const line of source.split('\n')) {
    const stripped = line.replace(THEME_COLOR_META, '');
    if (stripped === line) kept.push(line);
    else if (stripped.trim() !== '') kept.push(stripped);
  }
  return kept.join('\n');
}
