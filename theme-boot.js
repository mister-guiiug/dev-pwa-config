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

  return (
    '(function(){try{' +
    'var r=document.documentElement,' +
    `v=localStorage.getItem(${key}),` +
    "e=v==='light'||v==='dark'?v:" +
    "(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');" +
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
