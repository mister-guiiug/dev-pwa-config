/**
 * L'APPARIEMENT du relevé, éprouvé de bout en bout sur des dépôts factices.
 *
 * POURQUOI CE FICHIER EXISTE. `adoption-equivalents.test.mjs` vérifie la
 * TABLE : que ses symboles existent, qu'ils ne soient pas trop génériques,
 * qu'un remplacement soit connu. Il ne peut rien dire de la RÈGLE qui la
 * consomme — or c'est elle qui s'est trompée trois fois, toujours de la même
 * façon : un nom de fichier pris pour une réimplémentation.
 *
 *   - `Navbar.tsx` (30/08) — 100 % de faux positifs, ligne retirée ;
 *   - `storage.ts` (30/08) — un vrai positif sur sept, bruit documenté ;
 *   - `theme.ts` (31/08) — miss-lookhouse avait migré, et restait comptée.
 *
 * Trois corrections de la table, aucune du côté de ce qui la lit. Ce test
 * couvre l'autre versant, et sur le cas EXACT qui manquait : une app dont le
 * fichier guetté ne contient que des constantes, et dont l'adoption se lit
 * ailleurs, dans le fichier qui monte le fournisseur.
 *
 * Un sous-processus, parce que `measure-adoption.mjs` balaie les dépôts dès
 * qu'on le charge — c'est la raison même pour laquelle la table vit à part.
 * `--root` le pointe sur un bac à sable, et SANS `--write` il n'écrit rien :
 * `--replace` sert seulement à ce que le résumé affiché ne porte que le bac à
 * sable, au lieu d'être fusionné avec le relevé commité.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(
  new URL('../scripts/measure-adoption.mjs', import.meta.url)
);

/** Trois constantes partagées — ce que laisse une migration du thème. */
const THEME_CONSTANTES = `export const THEME_STORAGE_KEY = 'dwc_theme';
export const THEME_LEGACY_KEYS = ['lh_theme'];
export const THEME_COLOR = { light: '#0f766e', dark: '#08201e' };
`;

/** Une vraie réimplémentation : elle fait le travail, sans le paquet. */
const THEME_REIMPLEMENTE = `const LS_THEME = 'mc_theme';
export function getStoredThemePreference() {
  return localStorage.getItem(LS_THEME) ?? 'system';
}
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
`;

const APP_QUI_MONTE_LE_FOURNISSEUR = `import { ThemeProvider } from '@mister-guiiug/dev-wpa-config/react/theme-provider';
import { THEME_COLOR, THEME_STORAGE_KEY } from './theme';
export const App = () => <ThemeProvider storageKey={THEME_STORAGE_KEY} themeColor={THEME_COLOR} />;
`;

/**
 * Fabrique un bac à sable et relève ce qu'il « recopie ».
 *
 * @param {Record<string, Record<string, string>>} depots
 *   identifiant d'app (du catalogue) → chemin de fichier → contenu.
 * @returns {string} la section « RECOPIÉ PLUTÔT QU'IMPORTÉ » du résumé.
 */
function releveDe(depots) {
  const root = mkdtempSync(join(tmpdir(), 'dwc-adoption-'));
  try {
    for (const [app, fichiers] of Object.entries(depots)) {
      for (const [chemin, contenu] of Object.entries(fichiers)) {
        const cible = join(root, app, chemin);
        mkdirSync(join(cible, '..'), { recursive: true });
        writeFileSync(cible, contenu, 'utf8');
      }
    }
    const sortie = execFileSync(
      process.execPath,
      [SCRIPT, '--root', root, '--replace'],
      { encoding: 'utf8' }
    );
    const [, recopie = ''] = sortie.split(
      /RECOPI\S+ PLUT\S+T QU\S+IMPORT\S+ ?:/
    );
    return recopie;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("un `theme.ts` de constantes n'est pas un doublon quand l'app monte le fournisseur", () => {
  const recopie = releveDe({
    'miss-lookhouse': {
      'src/theme.ts': THEME_CONSTANTES,
      'src/App.tsx': APP_QUI_MONTE_LE_FOURNISSEUR,
    },
  });

  assert.doesNotMatch(
    recopie,
    /\buseTheme\b/,
    "une app qui monte `ThemeProvider` a migré son thème : son `theme.ts` n'est " +
      'que le point où vivent ses constantes partagées, pas une réimplémentation'
  );
});

test('un `theme.ts` qui refait le travail reste compté', () => {
  const recopie = releveDe({
    'miss-contraction': { 'src/theme.ts': THEME_REIMPLEMENTE },
  });

  assert.match(
    recopie,
    /\buseTheme\b/,
    'sans aucun import du paquet, ce fichier EST la dette que le relevé doit voir'
  );
});

test('les deux cas se distinguent dans un même relevé', () => {
  const recopie = releveDe({
    'miss-lookhouse': {
      'src/theme.ts': THEME_CONSTANTES,
      'src/App.tsx': APP_QUI_MONTE_LE_FOURNISSEUR,
    },
    'miss-contraction': { 'src/theme.ts': THEME_REIMPLEMENTE },
  });

  // Le compte, pas seulement la présence : deux apps portent un `theme.ts`,
  // une seule le doit au relevé. C'est exactement l'écart que la correction
  // du 31/08 a refermé.
  assert.match(recopie, /^\s*1\s+useTheme\s*$/m);
});
