#!/usr/bin/env node
/**
 * pwa-doctor — LA CHECKLIST DU PARC, LUE SUR UN DÉPÔT.
 *
 *   npx pwa-doctor                 # depuis la racine de l'app, après le build
 *   npx pwa-doctor --strict        # en CI : une dette suffit à échouer
 *   npx pwa-doctor --dir ../x --json
 *
 * À QUOI ÇA SERT. Le 02/09/2026, une app n'était pas installable (manifeste
 * lié à la racine de l'origine), treize étendaient un préréglage Renovate dans
 * un dépôt inexistant, quatre servaient la page 404 de GitHub sur un lien
 * profond, deux n'avaient pas de CSP. Aucun lint ne le voyait : ce sont des
 * défauts de CONFORMITÉ AU PARC, pas de code — ils vivent entre le dépôt, le
 * build et l'hébergeur. On les a trouvés à la main, avec des `curl` et des
 * `ls` écrits pour la journée. Ce bin les cherche à chaque fois, en trois
 * lectures :
 *
 *   1. LE DÉPÔT — les fichiers que le gabarit attend (`.editorconfig`,
 *      `.nvmrc`, `.gitattributes` en LF, `renovate.json` sur le préréglage du
 *      socle, `.lighthouserc.json`, une spec a11y, un `bundleBudget`), et les
 *      TROIS LIENS DE LA FAMILLE — code source, soutien, signalement — sur
 *      l'accueil ET sur À propos / Réglages, et nulle part ailleurs ;
 *   2. LES WORKFLOWS — lighthouse, `cleanup-runs`, le keep-alive Supabase si
 *      l'app en dépend, les e2e en CI (et qu'aucune spec ne reste hors du
 *      filtre `e2e-grep`, donc jamais jouée), un déploiement Pages passé par
 *      le réutilisable, et les références au socle au majeur COURANT ;
 *   3. LE BUILD (`dist/`, s'il existe) — la langue, le lien du manifeste (qui
 *      doit rester sous le site), les icônes PNG 192/512 et maskable, `id`,
 *      la langue du manifeste égale à celle de la page, l'icône iOS, le
 *      `theme-color` par schéma, la CSP, Open Graph, la canonique,
 *      `version.json`, et le `404.html` quand l'app route par chemin sans
 *      passer par `pwa-deploy.yml`, qui le pose au déploiement.
 *
 * TROIS VERDICTS, parce qu'ils ne se traitent pas pareil :
 *
 *   ✖ DÉFAUT   ce qui NUIT DÉJÀ — parce que quelqu'un en souffre (pas
 *              installable, 404) ou parce que le dépôt expose à chaque run ce
 *              qu'il n'a pas à exposer ;
 *   • DETTE    le socle a la réponse, l'app ne l'a pas prise ;
 *   i INFO     une mesure à connaître (locales figées, `console.*`), pas un
 *              jugement.
 *
 * Chaque ligne dit le GESTE qui la fait disparaître — pas un score. Le code
 * de sortie : 1 sur un défaut ; avec `--strict`, aussi sur une dette.
 *
 * ET UN DROIT DE RÉPONSE. `pwaDoctor.refus` dans `package.json` associe l'id
 * d'un contrôle à la RAISON de ne pas le suivre ici ; la ligne sort alors en
 * `– refus`, avec sa raison, et ne compte plus dans le code de sortie. Une
 * raison vide n'est pas un refus, et un refus qui n'excuse plus rien se
 * signale de lui-même. Sans ce droit, promouvoir un contrôle en défaut
 * transforme un désaccord en CI rouge permanente : les e2e volontairement non
 * tagués de mister-puzzle attendaient exactement ça.
 *
 * UN SEUL FAIT VIENT D'AILLEURS : les issues du dépôt sont-elles ouvertes ?
 * Le lien « Signaler un problème » du pied de page (4.4.0) mène à `issues/new`,
 * qui répond **404** quand elles sont désactivées. C'est arrivé : `miss-supatool`
 * affichait le lien avec `has_issues: false` au relevé du 06/09/2026 —
 * `miss-ticket-pwa` aussi. Ça ne se lit pas sur le disque : `run()` interroge
 * l'API GitHub quand un jeton est là (la CI en donne un), et passe la réponse à
 * `diagnose`. Sans jeton, sans réseau, sur un dépôt qu'on n'a pas su nommer :
 * le fait vaut `null` et LE CONTRÔLE SE TAIT. `--no-github` coupe l'appel.
 *
 * CE QU'IL NE FAIT PAS. Il ne mesure pas le poids (c'est `pwa-bundle-budget`)
 * ni ce que l'hébergeur sert vraiment (c'est `scripts/probe-sites.mjs`, sur
 * le site publié) : il lit le dépôt et son build en une seconde.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { estPointDEntree } from './entree.mjs';
import {
  decodeEntities,
  escapesSite,
  hreflangCollisions,
  hreflangLinks,
  htmlMarkers,
  jsonLdBlocks,
  jsonLdNodes,
  manifestSummary,
  siteScope,
  sitePrefix,
  visibleText,
} from './site-readers.mjs';
import { appById, PUBLISHER } from '../apps-catalog.js';
// LES MÊMES PAGES QUE LE BUILD : le docteur lit `content/pages` par les
// fonctions du plugin, pas par une copie de ses règles — `seo-content-pages`
// comptait tout `.md`, README compris, quand le build les ignorait.
import {
  CONTENT_PAGES_DIR,
  contentPageFiles,
  parseContentPage,
} from '../vite-pwa-base.js';

export const PRESET =
  'github>mister-guiiug/dev-pwa-config//renovate/default.json';

/**
 * Le tag majeur du socle — **LU, ET NON FIGÉ**.
 *
 * LE DOCTEUR EST LE SOCLE. Il s'exécute depuis le `node_modules` de
 * l'application, donc sa version EST celle dont l'application dépend : une app
 * sur `^4.21.3` lance le docteur 4 et doit référencer `@v4` ; une app sur
 * `^6.0.0` lance le docteur 6 et doit référencer `@v6`. La comparaison est
 * juste dans les deux cas, à condition de lire.
 *
 * ÉCRIT EN DUR, IL SE RETOURNE AU PREMIER MAJEUR SUIVANT, et il l'a fait : la
 * 6.0.0 exigeait encore `@v4`, si bien qu'un dépôt correctement monté en `@v6`
 * se voyait reprocher la bonne valeur — et `--strict` refusait son build. Le
 * contrôle accusait ce qu'il était censé récompenser. C'est le même défaut que
 * `workflows.test.mjs` portait et qui avait été corrigé de la même façon ; il
 * restait ici, dans le fichier qui le dit à vingt dépôts.
 */
const MAJEUR = `v${
  JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  ).version.split('.')[0]
}`;

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const SKIP = new Set(['node_modules', 'dist', 'dev-dist', '.git', 'coverage']);

const readText = (dir, rel) => {
  try {
    return readFileSync(join(dir, rel), 'utf8');
  } catch {
    return null;
  }
};
const readJson = (dir, rel) => {
  try {
    return JSON.parse(readText(dir, rel) ?? '');
  } catch {
    return null;
  }
};
const exists = (dir, rel) => existsSync(join(dir, rel));

/**
 * Une empreinte de contenu à la Vite : `-` puis huit caractères base64url en
 * fin de nom (`index-DhszbAbc.js`). C'est ce suffixe qui rend une URL mortelle
 * au déploiement suivant — cf. la règle `chunk-hors-precache`.
 */
const EMPREINTE_VITE = /-[A-Za-z0-9_-]{8}\.js$/;

/** Les fichiers JS émis dans `dist/assets/`, cartes de source exclues. */
function jsDuBuild(root) {
  try {
    return readdirSync(join(root, 'dist', 'assets')).filter(f =>
      f.endsWith('.js')
    );
  } catch {
    return [];
  }
}

/** Les fichiers source sous `roots`, lus. */
function walk(dir, roots, keep = SOURCE) {
  const out = [];
  const visit = abs => {
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const path = join(abs, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (keep.test(entry.name)) {
        out.push({
          rel: relative(dir, path).split(sep).join('/'),
          text: readFileSync(path, 'utf8'),
        });
      }
    }
  };
  for (const root of roots) visit(join(dir, root));
  return out;
}

const count = (text, re) => (text.match(re) ?? []).length;

/**
 * Le texte SANS ses commentaires — parce qu'un diagnostic qui lit du texte
 * plat punit celui qui documente.
 *
 * Le squelette `pwa-starter-kit` a fait sortir les deux cas le 05/09/2026, et
 * ils sont du même genre : son `ci.yml` porte le commentaire « Pas de
 * `secrets: inherit` : le réutilisable déclare ce qu'il consomme », et son
 * module i18n explique que le parc portait quatre-vingt-huit `'fr-FR'` codés
 * en dur. Les deux étaient comptés comme le défaut qu'ils mettent en garde de
 * commettre. Un contrôle qu'on ne peut pas expliquer sans le déclencher pousse
 * à ne rien expliquer.
 *
 * Le motif de bloc est TEMPÉRÉ. La forme paresseuse enjambe les fins de
 * commentaire et avalerait le fichier entier depuis son premier bloc de
 * documentation ; la forme tempérée refuse d'avancer au-delà de la première.
 */
const sansCommentaires = {
  yaml: text => text.replace(/^[ \t]*#.*$/gm, ''),
  // CSS n'a QUE la forme de bloc — `//` y est une erreur de syntaxe, pas un
  // commentaire, et le retirer avalerait `url(https://…)`.
  css: text => text.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\//g, ''),
  source: text =>
    text
      .replace(/\/\*(?:(?!\*\/)[\s\S])*\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, ''),
};

/* ── Les trois liens de la famille ─────────────────────────────────────────
 *
 * RÈGLE (06/09/2026) : le CODE SOURCE, le SOUTIEN et le SIGNALEMENT sont
 * visibles sur DEUX écrans, et deux seulement — l'accueil, ET À propos /
 * Réglages. Une app gratuite et locale se finance par les deux premiers : qui
 * l'ouvre doit pouvoir vérifier ce qu'elle fait, et remercier — sans aller les
 * chercher dans un tiroir. Et nulle part ailleurs : trois liens sortants sous
 * un plateau de jeu ou un formulaire, ce n'est pas un pied de page, c'est du
 * bruit.
 *
 * LA COQUILLE N'EST PLUS UNE FAÇON DE LA TENIR. `<AppFooter>` rendu hors des
 * routes est sur TOUS les écrans : c'était la réponse du socle la veille (un
 * seul endroit, tous les écrans, y compris ceux à venir), c'est aujourd'hui un
 * écran de trop. Le pied de page se rend DANS l'écran d'accueil et DANS À
 * propos / Réglages — deux fichiers, le même composant.
 *
 * CE QUE LE CONTRÔLE VOIT, ET CE QU'IL NE VOIT PAS. Il lit du texte, pas un
 * graphe de rendu : il résout UNE indirection — `<Footer/>` défini ailleurs,
 * rendu par la coquille (la forme de `miss-carbook` et `miss-lookhouse`) ou par
 * deux écrans — et reconnaît l'accueil et les réglages AU NOM DE FICHIER. Deux
 * indirections, ou un écran nommé autrement, lui échappent : d'où une DETTE et
 * non un défaut, qui nomme ce qu'il a vu.
 *
 * LE DÉPOUILLEMENT DES ROUTES EST LE CŒUR. Sans lui, `<SettingsScreen/>` monté
 * par `element={…}` dans le fichier des routes se lit comme un rendu « partout »
 * — et douze apps sur dix-neuf passaient à tort. Mesuré le 05/09/2026, sous la
 * règle d'alors : quatre apps la tenaient par la coquille, trois par deux
 * écrans, douze ne la tenaient pas. Le relevé sous celle-ci est dans le README.
 */
const LIENS = {
  /* Un élément JSX, pas un import : le socle, ou la paire écrite à la main. */
  socle: /<(?:AppFooter|FamilyApps|FamilyAbout)\b/,
  soutien: /buymeacoffee\.com|SPONSOR_URL|useSponsorUrl|sponsorUrl/,
  depot: /github\.com\/[\w-]+\/[\w-]+|REPO_URL|repoUrl\(/,
  coquille: /<Outlet\b|<Routes\b|createBrowserRouter|createHashRouter/,
  exporte:
    /export\s+(?:default\s+)?function\s+([A-Z]\w*)|export\s+const\s+([A-Z]\w*)/g,
  accueil:
    /(?:^|\/)(?:home|accueil|index|dashboard|start)[\w-]*\.[cm]?[jt]sx?$/i,
  reglages:
    /setting|reglage|réglage|parametre|paramètre|about|propos|profil|account|compte|help|aide/i,
};

/**
 * UNE SORTIE ANTICIPÉE EST UNE CONDITION, ELLE AUSSI — et c'était l'angle mort
 * du contrôle.
 *
 * `sansCondition` ne regardait que les 120 caractères qui PRÉCÈDENT la balise :
 * un `&&`, un ternaire, un `)return` collé devant, il les voit. Une coquille
 * sans routeur qui aiguille par `if (mode !== 'roll') return <Jeu />;` vingt
 * lignes plus haut, non — et le contrôle lui reprochait « tous les écrans »
 * alors que ses liens ne touchent jamais un plateau de jeu. Mesuré sur
 * `miss-dice` le 19/09/2026 : mille quatre-vingt-dix caractères entre le garde
 * et la balise, commentaires retirés.
 *
 * LE MOTIF EST VOLONTAIREMENT ÉTROIT : un `if` dont le corps REND quelque
 * chose. `if (!pret) return null;` n'en est pas un — il ne désigne aucun autre
 * écran, et un pied de page rendu après lui est bien sur tous les écrans.
 *
 * D'OÙ LE JETON TEMPÉRÉ `(?:(?!return)[^{}])`, et non un simple `[^{}]`. Le
 * premier écrit l'a payé : entre le `if` et le `<`, un `[^{}]` ENJAMBE le
 * `return null;` du garde pour atteindre le `return (<div>` de la ligne
 * suivante — et tout garde, même muet, dédouanait la coquille. Le jeton
 * tempéré s'arrête au premier `return` : ou bien c'est lui qui rend, ou bien
 * l'aiguillage n'existe pas. Le test qui l'a pris est juste en dessous.
 *
 * LA FENÊTRE EST BORNÉE, et c'est ce qui sépare un aiguillage d'un homonyme :
 * sans borne, le `if (x) return <A />` d'un composant écrit PLUS HAUT dans le
 * même fichier dédouanerait la coquille tout entière. Deux mille caractères :
 * le double de l'écart mesuré, et bien moins qu'un fichier d'écran.
 *
 * QUE RISQUE-T-ON À SE TROMPER ? Rien de silencieux. Une coquille clémentée à
 * tort ne devient pas « en règle » : elle retombe dans le compte des écrans,
 * où elle est citée par son nom — « sur 2 écrans (App.tsx, …) ». La dette
 * change de phrase, jamais de camp.
 *
 * Quantificateurs bornés et classes niées : chaque position n'est lue qu'une
 * fois, pas de retour arrière polynomial (cf. `js/polynomial-redos`, signalé
 * sur une première version du contrôle).
 */
const AIGUILLAGE =
  /\bif\s*\([^)\n]{1,200}\)\s*\{?(?:(?!return)[^{}]){0,400}return\s*\(?\s*</;

/** La fenêtre de lecture d'un aiguillage, en caractères. */
const PORTEE = 2000;

/** `a/b/../c` → `a/c`. Les chemins du relevé sont relatifs et en avant. */
const normalise = chemin => {
  const out = [];
  for (const part of chemin.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
};

/** Le texte d'une coquille, ses écrans montés retirés. */
const horsRoutes = text =>
  text
    .replace(/element=\{[^{}]*\}/g, '')
    .replace(/element:\s*[^,}]+/g, '')
    .replace(/<Route\b[^>]*>/g, '');

/**
 * @param {Array<{rel: string, text: string}>} source
 * @returns {{ verdict: 'partout'|'trop'|'deux'|'partiel'|'absent',
 *   ou?: string, ecrans?: string[] }}
 */
export function liensFamille(source) {
  // SANS LES COMMENTAIRES, comme les autres lectures du texte : le squelette
  // explique dans `App.tsx` pourquoi `<AppFooter>` n'y est plus — et ce
  // commentaire en faisait un porteur, rendu par la coquille, donc partout.
  const fichiers = source
    .filter(f => !/\.test\.|\.spec\./.test(f.rel))
    .map(f => ({ rel: f.rel, text: sansCommentaires.source(f.text) }));
  const porteurs = fichiers.filter(
    f =>
      LIENS.socle.test(f.text) ||
      (LIENS.soutien.test(f.text) && LIENS.depot.test(f.text))
  );
  if (!porteurs.length) return { verdict: 'absent' };

  const coquilles = fichiers.filter(f => LIENS.coquille.test(f.text));

  // TROIS APPS DU PARC N'ONT PAS DE ROUTEUR — `miss-dice`, `miss-ticket-pwa` et
  // `mister-puzzle` basculent d'écran sur un état. Leur coquille ne contient ni
  // `<Routes>` ni `<Outlet>` : cherchée à ces marqueurs seuls, elle n'existe
  // pas, et le contrôle leur reprochait éternellement une place qu'elles
  // tiennent. On prend donc aussi ce que l'ENTRÉE monte : `main.tsx` rend
  // `<App />`, et ce composant-là est la coquille, routeur ou pas.
  // ON SUIT L'IMPORT, PAS L'EXPORT : `export default App` ne porte pas de nom
  // exportable, et c'est la forme de deux des trois apps concernées. Le nom
  // vivant est celui que l'entrée s'est donné en important.
  //
  // ON PART DU `from '…'`, PAS DU MOT `import`. Un motif qui commence à
  // `import` doit traverser une clause de longueur libre avant de savoir s'il
  // a gagné, et rétro-suit sur `import {import {…` — CodeQL l'a signalé en
  // ReDoS polynomial (`js/polynomial-redos`) dès la première relecture. Ancré
  // sur le chemin, chaque position n'est examinée qu'une fois ; la clause se
  // lit ensuite dans une fenêtre BORNÉE avant le point d'ancrage.
  const entree = fichiers.find(f => /(?:^|\/)main\.[cm]?[jt]sx?$/.test(f.rel));
  if (entree) {
    const base = entree.rel.replace(/\/[^/]+$/, '');
    for (const trouve of entree.text.matchAll(
      /from\s*['"](\.[^'"\n]{0,200})['"]/g
    )) {
      const chemin = trouve[1];
      const clause = entree.text.slice(
        Math.max(0, trouve.index - 200),
        trouve.index
      );
      if (!clause.includes('import')) continue;
      const noms = clause.match(/[A-Z]\w*/g) ?? [];
      if (!noms.some(nom => new RegExp(`<${nom}\\b`).test(entree.text)))
        continue;
      const cible = normalise(`${base}/${chemin}`).replace(
        /\.[cm]?[jt]sx?$/,
        ''
      );
      for (const f of fichiers) {
        const sansExt = f.rel.replace(/\.[cm]?[jt]sx?$/, '');
        if (
          (sansExt === cible || sansExt === `${cible}/index`) &&
          !coquilles.includes(f)
        ) {
          coquilles.push(f);
        }
      }
    }
  }

  // LA COQUILLE PORTE LES LIENS ? Ils sont sur TOUS les écrans — la forme que
  // le contrôle acceptait jusqu'au 06/09/2026, devenue un écran de trop. On ne
  // conclut que sur ce qu'elle rend HORS de ses routes : un pied de page écrit
  // dans un `element={…}` appartient à cet écran-là, pas à la coquille.
  //
  // SANS ROUTEUR, LA CONDITION EST L'ÉCRAN. Une coquille qui bascule sur un
  // état écrit `{screen === 'x' && <X />}`, un ternaire, un `switch` : ce
  // qu'elle rend sous condition n'est pas « partout », c'est un écran.
  // `mister-puzzle` rend `<Home />` dans un ternaire, `miss-ticket-pwa`
  // `<Settings />` derrière un `&&` — le contrôle leur reprochait tous les
  // écrans quand ils n'en ont qu'un. Avec routeur, rien à lire : hors des
  // routes, tout est toujours rendu.
  const estCoquille = f => coquilles.includes(f) || LIENS.coquille.test(f.text);
  const routeur = f => LIENS.coquille.test(f.text);
  const sansCondition = (text, motif) => {
    for (const m of text.matchAll(motif)) {
      const avant = text
        .slice(Math.max(0, m.index - 120), m.index)
        .replace(/\s+/g, '');
      if (/(&&|\?|:|\)return|:return)\(?$/.test(avant)) continue;
      if (AIGUILLAGE.test(text.slice(Math.max(0, m.index - PORTEE), m.index)))
        continue;
      return true;
    }
    return false;
  };
  const porte = f => {
    const text = horsRoutes(f.text);
    if (LIENS.socle.test(text))
      return (
        routeur(f) ||
        sansCondition(text, /<(?:AppFooter|FamilyApps|FamilyAbout)\b/g)
      );
    return LIENS.soutien.test(text) && LIENS.depot.test(text);
  };
  if (porteurs.some(f => estCoquille(f) && porte(f)))
    return { verdict: 'partout' };

  const nomsDe = p =>
    [...p.text.matchAll(LIENS.exporte)].map(m => m[1] ?? m[2]).filter(Boolean);
  const rend = (text, noms) =>
    noms.some(nom => new RegExp(`<${nom}\\b`).test(text));
  const rendSansCondition = (c, noms) =>
    noms.length > 0 &&
    (routeur(c)
      ? rend(horsRoutes(c.text), noms)
      : sansCondition(c.text, new RegExp(`<(?:${noms.join('|')})\\b`, 'g')));
  for (const p of porteurs) {
    if (coquilles.some(c => rendSansCondition(c, nomsDe(p))))
      return { verdict: 'partout' };
  }

  // LES ÉCRANS QUI PORTENT LES LIENS. Un porteur qui n'est pas un écran nommé
  // — un `Footer.tsx` défini à part — compte pour les écrans qui le rendent :
  // la même indirection que pour la coquille, résolue côté écrans. Une
  // coquille qui porte les liens DANS ses routes, ou un porteur que personne
  // ne rend, compte pour lui-même : le contrôle ne sait pas quel écran, et le
  // dit plutôt que de deviner.
  const estEcran = rel => LIENS.accueil.test(rel) || LIENS.reglages.test(rel);
  const ecrans = [];
  const retient = rel => {
    if (!ecrans.includes(rel)) ecrans.push(rel);
  };
  for (const p of porteurs) {
    if (estEcran(p.rel) || estCoquille(p)) {
      retient(p.rel);
      continue;
    }
    const noms = nomsDe(p);
    const rendus = fichiers.filter(
      f => f !== p && !estCoquille(f) && rend(f.text, noms)
    );
    if (rendus.length) rendus.forEach(f => retient(f.rel));
    else retient(p.rel);
  }

  // DEUX ÉCRANS, ET CES DEUX-LÀ. Un troisième — ou un écran étranger à la
  // règle — est un écran de trop, et le verdict le nomme.
  const accueils = ecrans.filter(rel => LIENS.accueil.test(rel));
  const reglages = ecrans.filter(
    rel => !LIENS.accueil.test(rel) && LIENS.reglages.test(rel)
  );
  const autres = ecrans.filter(
    rel => !accueils.includes(rel) && !reglages.includes(rel)
  );
  if (autres.length || ecrans.length > 2) return { verdict: 'trop', ecrans };
  if (accueils.length && reglages.length) return { verdict: 'deux' };
  return {
    verdict: 'partiel',
    ou: accueils.length ? "l'accueil" : 'À propos / Réglages',
  };
}

/* ── Le lien de signalement, et le dépôt qui doit l'accueillir ─────────────
 *
 * DEPUIS 4.4.0 le pied de page porte « Signaler un problème » : un
 * `issues/new?template=bug.yml` prérempli de la version, du commit, de l'écran
 * et du navigateur. Encore faut-il que le dépôt ACCEPTE des issues.
 *
 * `miss-supatool` affichait le lien au relevé du 06/09/2026 et
 * `github.com/mister-guiiug/miss-supatool/issues/new?template=bug.yml`
 * répondait **404** : ses issues étaient désactivées (`has_issues: false` ;
 * `miss-ticket-pwa` aussi). Un canal de retour mort est pire que pas de canal —
 * l'utilisateur clique, se cogne, et n'essaie pas deux fois.
 *
 * CE CONTRÔLE NE RÉPARE RIEN AUJOURD'HUI, ET C'EST NORMAL. Le propriétaire a
 * rouvert les issues des deux dépôts dans la journée : les vingt dépôts
 * d'application les ont ouvertes à l'heure où ceci s'écrit, et le contrôle est
 * donc muet sur tout le parc. Il est là pour la rechute — une case se décoche
 * en deux clics, un dépôt neuf peut naître sans, et rien dans le code de l'app
 * ne le dirait jamais : le lien est écrit pareil dans les deux cas.
 *
 * CE N'EST PAS UNE LECTURE DU DISQUE : le réglage vit chez GitHub. Le fait
 * entre donc dans `diagnose` par `faits.hasIssues`, et c'est `run()` qui va le
 * chercher — hors CI, sans jeton, sans réseau, il vaut `null` et LE CONTRÔLE
 * SE TAIT. C'est la règle d'`escapesSite`, qui refuse d'accuser sur un préfixe
 * inconnu : un contrôle qui ne sait pas ne dit rien, jamais « probablement ».
 */

/** L'appel direct au composeur d'URL, dans une app à pied de page maison. */
const APPEL_SIGNALEMENT = /\b(?:currentIssueReportUrl|issueReportUrl)\s*\(/;

/**
 * La balise JSX ouverte à `at`, bornée — balayage linéaire, sans regex sur le
 * document (doctrine de `site-readers.mjs`). Le `>` qui compte est celui de
 * profondeur zéro : `sponsorUrl={() => url}` en contient un qui n'est pas la
 * fin de la balise.
 */
function baliseJsx(text, at, max = 600) {
  let depth = 0;
  const fin = Math.min(text.length, at + max);
  for (let i = at; i < fin; i += 1) {
    const c = text[i];
    if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0) return text.slice(at, i + 1);
  }
  return text.slice(at, fin);
}

/**
 * L'application propose-t-elle de SIGNALER un problème ? Deux formes :
 * `<AppFooter issues>` (huit apps le 06/09/2026) et l'appel direct à
 * `issueReportUrl` / `currentIssueReportUrl` pour un pied de page maison.
 *
 * SANS LES COMMENTAIRES, comme les autres lectures : le geste que ce fichier
 * recommande — `<AppFooter repoUrl={REPO_URL} issues />` — se recopie dans les
 * commentaires des apps, et un diagnostic qui punit celui qui documente pousse
 * à ne rien documenter.
 *
 * @param {Array<{rel: string, text: string}>} source
 */
export function porteSignalement(source) {
  for (const f of source) {
    if (/\.test\.|\.spec\./.test(f.rel)) continue;
    const text = sansCommentaires.source(f.text);
    if (APPEL_SIGNALEMENT.test(text)) return true;
    let i = text.indexOf('<AppFooter');
    while (i !== -1) {
      if (/(?:^|[\s{])issues(?:[\s=/}>]|$)/.test(baliseJsx(text, i))) {
        return true;
      }
      i = text.indexOf('<AppFooter', i + 10);
    }
  }
  return false;
}

/**
 * `owner/repo` si la chaîne désigne un dépôt GitHub, sinon `null`.
 *
 * Deux formes : l'URL complète, et le raccourci npm (`github:o/r`, `o/r`) que
 * `package.json` autorise. Dans les deux motifs, deux classes bornées séparées
 * par un `/` littéral qu'aucune ne peut absorber : rien à rétro-suivre, donc
 * rien pour CodeQL.
 */
function slugDepuis(url) {
  const texte = String(url ?? '').trim();
  const court = /^(?:github:)?([\w.-]{1,100})\/([\w.-]{1,100})$/.exec(texte);
  const m =
    court ?? /github\.com[:/]([\w.-]{1,100})\/([\w.-]{1,100})/.exec(texte);
  if (!m) return null;
  return `${m[1]}/${m[2].replace(/\.git$/, '')}`;
}

/**
 * Le dépôt GitHub du dossier diagnostiqué — jamais deviné.
 *
 * TROIS SOURCES, dans l'ordre de fiabilité : le catalogue de la famille (qui
 * tient l'URL de chaque dépôt), le champ `repository` du `package.json`, et
 * `GITHUB_REPOSITORY` — celui-là SEULEMENT quand le dossier diagnostiqué est
 * bien la copie de travail de l'exécution en cours. Sans cette dernière garde,
 * un `pwa-doctor --dir /tmp/…` lancé depuis la CI d'un autre dépôt jugerait
 * le mauvais dépôt, et le verdict serait faux sans jamais le dire.
 *
 * @param {string} root Racine RÉSOLUE du dossier diagnostiqué.
 * @param {{ name?: string, repository?: unknown }} pkg
 * @param {Record<string, string | undefined>} [env]
 */
export function depotGitHub(root, pkg = {}, env = {}) {
  const fiche = appById(pkg.name);
  const parCatalogue = slugDepuis(fiche?.repoUrl);
  if (parCatalogue) return parCatalogue;

  const repository = pkg.repository;
  const parPackage = slugDepuis(
    typeof repository === 'string' ? repository : (repository?.url ?? '')
  );
  if (parPackage) return parPackage;

  const espace = env.GITHUB_WORKSPACE;
  const slug = env.GITHUB_REPOSITORY;
  if (espace && slug && resolve(espace) === root) {
    return /^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(slug) ? slug : null;
  }
  return null;
}

/**
 * Les issues du dépôt sont-elles ouvertes ? `true`, `false`, ou **`null` quand
 * on ne sait pas** — pas de jeton, pas de réseau, réponse inattendue.
 *
 * `null` est le cas ordinaire hors CI, et c'est voulu : le contrôle qui le lit
 * se tait. Toute erreur — DNS, 401, 403, 404, JSON illisible, délai dépassé —
 * rend `null` et non `false` : l'absence de preuve n'est pas la preuve du
 * défaut.
 *
 * @param {string | null} slug `owner/repo`
 * @param {{ token?: string, fetch?: typeof globalThis.fetch, timeout?: number }} [options]
 * @returns {Promise<boolean | null>}
 */
export async function issuesActivees(slug, options = {}) {
  const token = options.token;
  const appel = options.fetch ?? globalThis.fetch;
  if (!slug || !token || typeof appel !== 'function') return null;
  if (!/^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(slug)) return null;
  try {
    const reponse = await appel(`https://api.github.com/repos/${slug}`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': 'pwa-doctor',
      },
      // Un contrôle qui pend est un contrôle qui bloque une CI.
      signal: AbortSignal.timeout?.(options.timeout ?? 8000),
    });
    if (!reponse?.ok) return null;
    const corps = await reponse.json();
    return typeof corps?.has_issues === 'boolean' ? corps.has_issues : null;
  } catch {
    return null;
  }
}

/* ── Le filtre e2e de la CI ────────────────────────────────────────────────
 *
 * `pwa-ci.yml` ne joue que les tests dont le titre correspond à `e2e-grep`.
 * Une spec dont aucun titre ne correspond n'est JAMAIS exécutée — et
 * Playwright rend « No tests found » avec un code 0. Le squelette et le
 * gabarit ont porté une spec `@a11y` dans ce cas pendant que le filtre valait
 * `@critical` (relevé du 05/09/2026).
 */
const FILTRE_E2E_DEFAUT = '@critical|@a11y';

/** Le filtre que la CI applique : celui de `ci.yml`, sinon celui du réutilisable. */
export function filtreE2e(wfText) {
  const m = /e2e-grep:\s*(['"]?)(.+?)\1\s*$/m.exec(
    sansCommentaires.yaml(wfText)
  );
  const source = m ? m[2].trim() : FILTRE_E2E_DEFAUT;
  try {
    return new RegExp(source);
  } catch {
    return new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }
}

/**
 * Vrai si au moins un titre de la spec — `describe` ou `test` — correspond au
 * filtre. Playwright compare le titre COMPLET (`describe › test`) : un tag
 * posé sur le `describe` couvre tous ses tests.
 */
export function specJouee(text, filtre) {
  const titres = [
    ...text.matchAll(
      /\b(?:test|it|describe)(?:\.(?:describe|only|skip|fixme|serial|parallel))*\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g
    ),
  ].map(m => m[2]);
  return titres.some(t => filtre.test(t));
}

/* ── Le référencement : pages, JSON-LD écrit à la main, titre ──────────── */

/**
 * L'option `contentPages` de `pwaSeoPlugin`, lue dans le TEXTE de
 * `vite.config`, commentaires retirés : `false`, un dossier écrit en toutes
 * lettres, ou `undefined` — le défaut, ou une valeur que le texte ne dit pas
 * (une variable), qu'on ne devine pas.
 *
 * @param {string} viteConfig
 * @returns {string | false | undefined}
 */
export function optionContentPages(viteConfig) {
  const m =
    /\bcontentPages\s*:\s*(?:(false)\b|(['"`])([^'"`\n]{1,200})\2)/.exec(
      sansCommentaires.source(viteConfig ?? '')
    );
  if (!m) return undefined;
  return m[1] ? false : m[3];
}

/**
 * Les pages de contenu d'un dépôt, LUES COMME LE BUILD LES LIT : mêmes
 * fichiers (`contentPageFiles` — ni README ni brouillon `_…`), même dossier
 * (l'option `contentPages`), anglaises comprises (`en/`). Une page que le
 * build refuserait est écartée ici : c'est le build qui le dit, en la nommant.
 *
 * @param {string} root
 * @param {string} viteConfig
 * @returns {{ fichiers: string[], pages: Array<ReturnType<typeof parseContentPage>> } | null}
 *   `null` quand l'app a coupé les pages (`contentPages: false`).
 */
export function pagesDuDepot(root, viteConfig) {
  const option = optionContentPages(viteConfig);
  if (option === false) return null;
  const dossier = join(root, option ?? CONTENT_PAGES_DIR);
  const fichiers = contentPageFiles(dossier);
  const pages = [];
  for (const rel of fichiers) {
    try {
      pages.push(
        parseContentPage(
          readFileSync(join(dossier, rel), 'utf8'),
          rel,
          rel.startsWith('en/')
            ? { lang: 'en', dossier: 'en/' }
            : { lang: 'fr' }
        )
      );
    } catch {
      /* le build la refusera, en la nommant */
    }
  }
  return { fichiers, pages };
}

/** Un texte comparable : minuscules, apostrophes et blancs unifiés. */
const comparable = texte =>
  decodeEntities(String(texte ?? ''))
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Les questions des `FAQPage` d'une liste de nœuds JSON-LD. */
function questionsFaq(noeuds) {
  return noeuds
    .filter(n => [].concat(n['@type']).includes('FAQPage'))
    .flatMap(n => [].concat(n.mainEntity ?? []))
    .map(q => (typeof q?.name === 'string' ? q.name : ''))
    .filter(Boolean);
}

/** Les types JSON-LD qui ont un auteur ou un éditeur à désigner. */
const TYPES_OEUVRE = new Set([
  'WebApplication',
  'SoftwareApplication',
  'MobileApplication',
  'WebSite',
  'WebPage',
  'Article',
  'BlogPosting',
  'NewsArticle',
  'CreativeWork',
  'HowTo',
]);

/** Une valeur `author` / `publisher` désigne-t-elle l'éditeur de la famille ? */
const designeEditeur = valeur =>
  [].concat(valeur ?? []).some(v => v?.['@id'] === PUBLISHER['@id']);

/** Un auteur tel qu'on le lit : « Organization « Mister Puzzle » ». */
function decrireAuteur(valeur) {
  const v = [].concat(valeur ?? [])[0];
  if (!v) return 'aucun auteur';
  if (typeof v === 'string') return `« ${v} »`;
  return `${v['@type'] ?? 'un auteur'}${v.name ? ` « ${v.name} »` : ''}${v['@id'] ? ` (${v['@id']})` : ''}`;
}

/** Une AFFECTATION de `document.title` — pas une comparaison. */
const AFFECTE_TITRE = /\bdocument\.title\s*=(?!=)/;
/** Une LECTURE de `document.title` : le titre statique, capturé ou composé. */
const LIT_TITRE = /\bdocument\.title\b(?!\s*=(?!=))/;
/** Un fichier de traduction : un titre qu'on y trouve est un titre affiché. */
const FICHIER_TRADUCTION =
  /(?:^|\/)(?:i18n|locales?|langs?|translations?|messages?)(?:\/|\.|$)/i;
/** Ce qui ne désigne rien dans le membre droit d'une affectation. */
const MOTS_VIDES = new Set([
  'document',
  'title',
  'window',
  'const',
  'let',
  'var',
  'return',
  'true',
  'false',
  'null',
  'undefined',
  'this',
  'new',
  'typeof',
]);

/**
 * LE TITRE RÉÉCRIT À L'EXÉCUTION, SANS LE TITRE STATIQUE.
 *
 * Google rend le JavaScript : le titre qu'il indexe est celui du DOM rendu,
 * pas le `<title>` écrit pour lui. Relevé du 29/09/2026 : miss-badminton
 * réécrit l'accueil en « Miss Badminton » (14 caractères) quand son `<title>`
 * en fait 56 ; mister-cim10 et miss-contraction faisaient de même, avant d'être
 * corrigées ce jour-là.
 *
 * L'HEURISTIQUE, VOLONTAIREMENT PRUDENTE — une info, jamais plus. Un fichier
 * de `src/` (tests exclus, commentaires retirés) qui AFFECTE `document.title`
 * est mis en cause SAUF s'il reprend le titre statique d'une de ces façons :
 *   1. il LIT `document.title` (capturé au démarrage, ou composé) ;
 *   2. le titre statique est écrit dans ce fichier même ;
 *   3. il est écrit dans un fichier de TRADUCTION (`i18n`, `locales`,
 *      `messages`…) : le titre affiché en vient, par une clé ;
 *   4. l'affectation nomme une constante écrite sur la même ligne que le
 *      titre statique (`APP_TITLE = '…'`).
 * Ce qu'elle ne voit pas : un titre composé ailleurs, par une indirection de
 * plus — d'où une info, qui nomme le fichier, et le droit de réponse
 * (`pwaDoctor.refus`) pour un titre d'écran voulu.
 *
 * @param {Array<{ rel: string, text: string }>} source
 * @param {string} titreStatique Le `<title>` de `index.html`.
 * @returns {string[]} Les fichiers en cause.
 */
export function titreRuntimeSansStatique(source, titreStatique) {
  const titre = comparable(titreStatique);
  if (!titre) return [];
  const fichiers = source
    .filter(f => !/\.test\.|\.spec\./.test(f.rel))
    .map(f => ({ rel: f.rel, text: sansCommentaires.source(f.text) }));
  const lignesDuTitre = fichiers.flatMap(f =>
    f.text
      .split('\n')
      .filter(l => comparable(l).includes(titre))
      .map(ligne => ({ rel: f.rel, ligne }))
  );
  const traduit = lignesDuTitre.some(l => FICHIER_TRADUCTION.test(l.rel));
  const fautifs = [];
  for (const f of fichiers) {
    if (!AFFECTE_TITRE.test(f.text)) continue;
    if (LIT_TITRE.test(f.text)) continue;
    if (lignesDuTitre.some(l => l.rel === f.rel)) continue;
    if (traduit) continue;
    const noms = [
      ...f.text.matchAll(/\bdocument\.title\s*=(?!=)([^;\n]{0,200})/g),
    ]
      .flatMap(m => m[1].match(/[A-Za-z_$][\w$]{2,}/g) ?? [])
      .filter(n => !MOTS_VIDES.has(n));
    const nomme = noms.some(n =>
      lignesDuTitre.some(l =>
        // Échappement complet avant d'insérer le nom dans une RegExp (CodeQL
        // js/incomplete-sanitization), même si un identifiant n'a que `\w` et `$`.
        new RegExp(
          `(?<![\\w$])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w$])`
        ).test(l.ligne)
      )
    );
    if (!nomme) fautifs.push(f.rel);
  }
  return fautifs;
}

/**
 * LE CONTEXTE : tout ce que le diagnostic lit sur le disque, lu UNE fois.
 *
 * C'est la partie chère — `walk()` parcourt `src/`, les workflows et les specs.
 * L'isoler permet aux familles de règles de n'être que des fonctions de ce
 * contexte : elles se jouent séparément, dans un test, sans relire un octet.
 *
 * @param {string} dir Racine de l'app.
 * @param {{ hasIssues?: boolean | null, repo?: string | null }} [faits]
 */
export function contexteDepot(dir, faits = {}) {
  const root = resolve(dir);
  const pkg = readJson(root, 'package.json') ?? {};

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const source = walk(root, ['src']);
  const srcText = source.map(f => f.text).join('\n');
  // LES FEUILLES DE STYLE, parce qu'une règle de mise en page peut CONTREDIRE
  // ce que le composant déclare. Le seul contrôle qui s'en sert aujourd'hui est
  // `bottom-nav-muette` ; il n'existait pas tant que le docteur ne lisait que
  // du JavaScript, et le défaut qu'il attrape a vécu deux ans pour ça.
  const styles = walk(root, ['src'], /\.css$/);
  const cssText = styles.map(f => f.text).join('\n');
  const viteConfig =
    ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs']
      .map(name => readText(root, name))
      .find(Boolean) ?? '';
  const indexHtml = readText(root, 'index.html') ?? '';
  const workflows = walk(root, ['.github/workflows'], /\.ya?ml$/);
  const wfText = workflows.map(w => w.text).join('\n');
  const specs = walk(
    root,
    ['e2e', 'tests', 'test', 'playwright'],
    /\.(spec|test)\.[jt]sx?$/
  );
  // FAIT, PAS RÈGLE : deux familles s'en servent — « pas de spec a11y » (dépôt)
  // et « e2e installé mais jamais joué en CI » (workflows). Le calculer dans la
  // première et le lire dans la seconde les rendait indissociables.
  const playwright = Boolean(deps['@playwright/test']);
  return {
    root,
    pkg,
    faits,
    deps,
    source,
    srcText,
    styles,
    cssText,
    viteConfig,
    indexHtml,
    workflows,
    wfText,
    specs,
    playwright,
  };
}

/**
 * LE JOURNAL : où atterrit un constat, et ce qui peut l'en empêcher.
 *
 * Deux filtres, qui ne disent pas la même chose. Le REFUS vient du dépôt
 * examiné (`pwaDoctor.refus`) : il est motivé, il survit dans la sortie, il
 * n'est pas un silence. `--only` et `--skip` viennent de la ligne de commande :
 * ils servent à travailler SUR un contrôle — le déboguer, écrire son correctif,
 * mesurer ce qu'il coûte — jamais à faire taire un défaut en CI, puisque
 * personne ne les écrit dans un workflow. Le premier est une décision, les
 * seconds un outil.
 *
 * @param {Record<string, any>} pkg `package.json` du dépôt examiné.
 * @param {{ only?: string[], skip?: string[] }} [options]
 */
export function journal(pkg, options = {}) {
  const only = new Set(options.only ?? []);
  const skip = new Set(options.skip ?? []);
  const retenu = id => (only.size === 0 || only.has(id)) && !skip.has(id);

  // Le refus MOTIVÉ. `pwaDoctor.refus` de package.json associe l'id d'un
  // contrôle à la raison de ne pas le suivre ICI :
  //
  //   "pwaDoctor": { "refus": { "wf-lighthouse": "app interne, pas de site" } }
  //
  // Un contrôle refusé sort en `refus`, avec sa raison, et ne pèse plus sur le
  // code de sortie. Il ne DISPARAÎT pas : une exception qu'on ne voit plus est
  // une exception qui survit à ce qu'elle excusait.
  //
  // POURQUOI MAINTENANT. Tant que tout était dette ou info, une décision
  // contraire coûtait une ligne de bruit ; avec un défaut, elle coûte une CI
  // rouge en permanence, et rien à faire pour l'éteindre. Le parc a déjà buté
  // là-dessus : les tests e2e de mister-puzzle sont VOLONTAIREMENT sans
  // étiquette (« hygiène locale, pas la porte de la CI »), décision assumée par
  // le propriétaire, et le docteur ne savait que la compter en dette faute de
  // pouvoir l'entendre. Promouvoir un contrôle sans donner ce droit de réponse,
  // c'est transformer un désaccord en panne.
  //
  // UNE RAISON VIDE N'EST PAS UN REFUS : l'entrée est ignorée, et le contrôle
  // reprend son niveau. On refuse en disant pourquoi, ou on ne refuse pas.
  const refus = Object.fromEntries(
    Object.entries(pkg.pwaDoctor?.refus ?? {}).filter(
      ([, raison]) => typeof raison === 'string' && raison.trim() !== ''
    )
  );
  const refusServis = new Set();

  const findings = [];
  const seen = new Set();
  const add = (level, id, message, fix) => {
    if (seen.has(id)) return;
    seen.add(id);
    if (refus[id]) {
      refusServis.add(id);
      findings.push({ level: 'refus', id, message, fix, raison: refus[id] });
      return;
    }
    findings.push({ level, id, message, fix });
  };
  return {
    findings,
    refus,
    refusServis,
    api: {
      defaut: (id, message, fix) =>
        retenu(id) && add('défaut', id, message, fix),
      dette: (id, message, fix) => retenu(id) && add('dette', id, message, fix),
      info: (id, message, fix) => retenu(id) && add('info', id, message, fix),
    },
  };
}

/**
 * LES QUATRE FAMILLES DE RÈGLES.
 *
 * `diagnose()` faisait 617 lignes d'un seul tenant : aucune de ses règles ne
 * pouvait être jouée seule, ni nommée, ni corrigée sans lire les six cents
 * autres. Elles sont réparties ici en quatre familles, à comportement
 * strictement inchangé — l'ordre d'exécution est le même, et il compte : un
 * identifiant déjà émis est ignoré (`seen`), donc le `theme-color` vu dans la
 * source l'emporte sur celui du build, exactement comme avant.
 *
 * Chaque famille prend le contexte et l'API, et n'écrit rien d'autre. C'est ce
 * qui rend `pwa-doctor --fix` écrivable règle par règle plutôt qu'au milieu
 * d'un bloc de six cents lignes, et c'est la seule raison de ce découpage.
 */

/** Famille « dépôt » : les fichiers que tout dépôt du parc doit porter. */
export function reglesDepot(ctx, api) {
  const { root, pkg, viteConfig, specs, playwright } = ctx;
  const { defaut, dette, info } = api;

  /* ── 1. Le dépôt ──────────────────────────────────────────────────────── */

  if (!exists(root, '.editorconfig')) {
    dette('editorconfig', 'pas de .editorconfig', 'copier celui du gabarit');
  }
  if (!exists(root, '.nvmrc')) {
    // LE NUMÉRO EST FIGÉ ICI, ET UN TEST L'AMARRE AU `.nvmrc` DU SOCLE.
    // Le docteur s'exécute depuis le `node_modules` de l'app : il n'a pas le
    // dépôt du socle sous la main, et `.nvmrc` ne fait pas partie du paquet
    // publié — il ne peut donc pas le lire. Mais une constante recopiée
    // dérive : c'est exactement ce qui est arrivé à `v4`, figé ici, dans
    // `workflows.test.mjs` et dans `workflow-refs`, et resté à réclamer un
    // majeur périmé jusqu'à ce qu'un dépôt passe au suivant. Le test
    // `pwa-doctor` compare donc ce conseil au `.nvmrc` du dépôt : les deux
    // montent ensemble ou la CI rougit.
    dette('nvmrc', 'pas de .nvmrc', 'écrire « 26.10.0 »');
  }
  const attributes = readText(root, '.gitattributes') ?? '';
  if (!/eol=lf/.test(attributes)) {
    dette(
      'gitattributes',
      'pas de .gitattributes en LF',
      '`* text=auto eol=lf` — sans lui, core.autocrlf fait refuser tout le dépôt par format:check'
    );
  }
  const ignore = readText(root, '.gitignore') ?? '';
  if (!ignore.includes('.claude/worktrees')) {
    dette(
      'gitignore-worktrees',
      '.gitignore ne masque pas .claude/worktrees/',
      'ajouter la ligne — ESLint et Prettier y lisent des copies de travail'
    );
  }
  const renovate = readJson(root, 'renovate.json');
  if (!renovate) {
    dette(
      'renovate',
      'pas de renovate.json : Renovate ignore ce dépôt',
      `{ "extends": ["${PRESET}"] }`
    );
  } else {
    const extend = Array.isArray(renovate.extends) ? renovate.extends : [];
    if (extend.some(e => /mister-guiiug\/\.github\/\//.test(e))) {
      defaut(
        'renovate-preset',
        'renovate.json étend un préréglage dans un dépôt inexistant (mister-guiiug/.github) : Renovate ne fait rien',
        `remplacer par ${PRESET}`
      );
    } else if (!extend.includes(PRESET)) {
      info(
        'renovate-local',
        'renovate.json autonome : il ne suit pas le préréglage famille',
        `étendre ${PRESET}`
      );
    }
  }
  if (!exists(root, '.lighthouserc.json')) {
    dette(
      'lighthouserc',
      'pas de .lighthouserc.json',
      'copier celui du gabarit (a11y ≥ 0,9 en erreur)'
    );
  }
  if (playwright) {
    if (!specs.some(f => /a11y|accessib/i.test(basename(f.rel)))) {
      dette(
        'a11y-spec',
        'Playwright est là, la spec a11y (axe-core) non',
        'copier e2e/a11y.spec.ts du gabarit (playwright-a11y du socle)'
      );
    }
  }
  if (!pkg.bundleBudget) {
    dette(
      'bundle-budget',
      'pas de bundleBudget dans package.json',
      'mesurer avec pwa-bundle-budget, poser le budget à +10 %, l’ajouter au build'
    );
  }
  if (!pkg.engines?.node) {
    info('engines', 'pas de engines.node', '"engines": { "node": ">=22" }');
  }
  // Le port de développement est au catalogue, unique dans la famille. Une
  // app qui en déclare un autre — ou le 5173 de tout le monde — se disputera
  // le port avec sa voisine le jour où les deux tournent sur le même poste.
  const fiche = appById(pkg.name);
  if (fiche?.devPort) {
    const declares = [];
    const launch = readText(root, '.claude/launch.json');
    const dansLaunch =
      launch &&
      (/"port"\s*:\s*(\d+)/.exec(launch) ?? /--port",\s*"(\d+)"/.exec(launch));
    if (dansLaunch)
      declares.push(['.claude/launch.json', Number(dansLaunch[1])]);
    // `[^}]{0,500}?` ET NON `[^}]*?` : sans borne, le moteur reprend son essai
    // à chaque position d'un fichier qui ne contient pas de bloc `server`, et
    // le coût devient quadratique en sa longueur. La borne ne change aucun
    // appariement réel — un bloc `server: { … port: … }` de plus de 500
    // caractères avant le port n'existe pas — et elle rend le pire cas fini.
    const dansVite = /server\s*:\s*\{[^}]{0,500}?\bport\s*:\s*(\d+)/s.exec(
      viteConfig
    );
    if (dansVite) declares.push(['vite.config', Number(dansVite[1])]);
    const ecarts = declares.filter(([, port]) => port !== fiche.devPort);
    if (ecarts.length) {
      info(
        'dev-port',
        `port de développement ${ecarts.map(([ou, port]) => `${port} (${ou})`).join(', ')} ; le catalogue lui donne ${fiche.devPort}`,
        `server: { port: devPortOf('${pkg.name}') } dans vite.config.ts (apps-catalog) — deux apps côte à côte sans collision`
      );
    }
  }
}

/** Famille « workflows » : ce que la CI, le déploiement et les mesures posent. */
export function reglesWorkflows(ctx, api) {
  const { deps, workflows, wfText, specs, playwright } = ctx;
  const { defaut, dette } = api;

  /* ── 2. Les workflows ─────────────────────────────────────────────────── */

  if (!workflows.length) {
    dette(
      'workflows',
      'aucun workflow GitHub',
      'pwa-ci.yml et pwa-deploy.yml du socle'
    );
  } else {
    if (!/lighthouse/i.test(wfText)) {
      dette(
        'wf-lighthouse',
        'pas de workflow Lighthouse',
        `lighthouse.yml → pwa-lighthouse.yml@${MAJEUR}`
      );
    }
    if (!/cleanup-runs/.test(wfText)) {
      dette(
        'wf-cleanup',
        'pas de nettoyage des runs',
        `cleanup-runs.yml → cleanup-runs.yml@${MAJEUR}`
      );
    }
    if (
      deps['@supabase/supabase-js'] &&
      !/pwa-supabase-keepalive/.test(wfText)
    ) {
      dette(
        'wf-keepalive',
        'Supabase sans keep-alive : le projet Free se met en pause après 7 jours',
        `keepalive.yml → pwa-supabase-keepalive.yml@${MAJEUR} (miss-carbook en a payé le prix)`
      );
    }
    if (playwright && !/run-e2e:\s*true|playwright/i.test(wfText)) {
      dette(
        'wf-e2e',
        'les e2e ne tournent pas en CI',
        'run-e2e: true dans ci.yml'
      );
    }

    // Les e2e tournent, mais pas tous : une spec dont aucun titre ne
    // correspond au filtre est un test qui n'existe pas pour la CI.
    if (playwright && /run-e2e:\s*true/.test(wfText) && specs.length) {
      const filtre = filtreE2e(wfText);
      const horsFiltre = specs.filter(f => !specJouee(f.text, filtre));
      if (horsFiltre.length) {
        dette(
          'e2e-hors-filtre',
          `${horsFiltre.map(f => f.rel).join(', ')} : aucun titre ne correspond au filtre « ${filtre.source} » — jamais joué en CI`,
          `taguer les titres (@critical, @a11y), ou e2e-grep: '${FILTRE_E2E_DEFAUT}' dans ci.yml`
        );
      }
    }

    // Un déploiement Pages écrit à la main n'a ni le repli SPA `404.html`, ni
    // `required-env`, ni `VITE_BASE_PATH` posé : mister-puzzle et mister-doc
    // servaient la page 404 de GitHub sur un lien profond le 05/09/2026.
    if (
      /deploy-pages|upload-pages-artifact/.test(wfText) &&
      !/pwa-deploy\.yml@/.test(wfText)
    ) {
      dette(
        'wf-deploy-maison',
        'déploiement Pages écrit à la main : sans le réutilisable, ni repli SPA 404.html, ni required-env, ni base path',
        `deploy.yml → pwa-deploy.yml@${MAJEUR} (use-base-path: true ; ce qui précède le build en pre-build)`
      );
    }
    // `[^\s@]+` pour le chemin : un chemin de workflow ne contient pas d'arobase,
    // et le lui interdire retire l'ambiguïté entre `\S+` et le `@` qui suit —
    // c'est elle qui rendait l'échec quadratique sur une longue suite sans
    // espace. Les DEUX parties sont bornées, et il le faut : un chemin non
    // borné laisse le moteur reprendre à chaque répétition du préfixe. Aucun
    // chemin de workflow ne fait 200 caractères, aucune étiquette n'en fait 40.
    //
    // LA CIBLE SE LIT (`MAJEUR`), et le motif se construit donc à l'exécution.
    // Les antislashs sont DOUBLÉS : dans un gabarit, `\s` s'évanouit avant
    // d'atteindre `RegExp`, et le motif se met alors à accepter n'importe quoi
    // sans qu'un test le voie — le parc a déjà payé exactement cette erreur.
    const vieux = wfText.match(
      new RegExp(
        `mister-guiiug/dev-pwa-config/[^\\s@]{1,200}@(?!${MAJEUR}\\b)\\S{1,40}`,
        'g'
      )
    );
    if (vieux) {
      dette(
        'wf-v3',
        `référence au socle hors @${MAJEUR} : ${[...new Set(vieux)].join(', ')}`,
        `passer en @${MAJEUR} (étiquette flottante déplacée à chaque release)`
      );
    }

    // `secrets: inherit` donne au workflow appelé TOUT le trousseau du dépôt,
    // alors qu'il déclare exactement ce dont il a besoin.
    //
    // DÉFAUT DEPUIS LE 07/09/2026, ET C'EST UNE PROMOTION. Le contrôle
    // existait — en dette, avec ses tests — et n'a rien empêché : au relevé du
    // 06/09/2026, DIX-SEPT DÉPÔTS SUR DIX-SEPT écrivaient la ligne, dans
    // quarante-sept fichiers. Aucune app ne lance `--strict`, donc la dette ne
    // coûtait rien ; une dette que rien ne force ne se paie jamais. Le parc
    // est revenu à zéro par campagne, et le niveau change pour que ça le
    // reste.
    //
    // Ce n'est pas une réponse du socle que l'app n'aurait pas prise — la
    // définition même de la dette — mais un trousseau entier remis à chaque
    // exécution, sur chaque PR. `pwa-ci.yml` et `pwa-lighthouse.yml` ne
    // déclarent AUCUN secret (`secrets.GITHUB_TOKEN` est fourni d'office à un
    // workflow appelé) et `pwa-deploy.yml` n'en déclare qu'un. Un dépôt qui a
    // une raison de garder la ligne l'écrit dans `pwaDoctor.refus`.
    const herites = workflows.filter(w =>
      /secrets:\s*inherit/.test(sansCommentaires.yaml(w.text))
    );
    if (herites.length) {
      defaut(
        'secrets-inherit',
        `secrets: inherit dans ${herites.map(w => basename(w.rel)).join(', ')} — le workflow appelé reçoit tout le trousseau`,
        'nommer les secrets un par un, ou retirer la ligne quand le réutilisable n’en déclare aucun (README § Secrets et variables)'
      );
    }

    // Une VITE_* rangée en secret n'est pas protégée : Vite la copie dans le
    // bundle. Le secret masque les journaux, pas la valeur.
    // Le nom est LU DANS LE GROUPE de capture, pas retiré à la main du texte
    // apparié : `match(…, 'g')` jette les groupes, d'où le `replace` qui
    // traînait ici — et qu'un contrôle de sécurité relève à juste titre comme
    // une découpe de chaîne approximative.
    const publiques = [
      ...new Set(
        [...wfText.matchAll(/secrets\.(VITE_[A-Z0-9_]+)/g)].map(m => m[1])
      ),
    ];
    if (publiques.length) {
      dette(
        'vite-en-secret',
        `${publiques.join(', ')} en secret alors que Vite les copie dans le bundle`,
        'les passer en vars — un secret masque les journaux, pas la valeur'
      );
    }
  }
}

/** Famille « source » : ce que le code de l'app dit d'elle-même. */
export function reglesSource(ctx, api) {
  const { root, pkg, faits, source, srcText, cssText, viteConfig, indexHtml } =
    ctx;
  const { defaut, dette, info } = api;

  /* ── 3. La source ─────────────────────────────────────────────────────── */

  if (/registerType:\s*['"]autoUpdate['"]/.test(viteConfig)) {
    dette(
      'auto-update',
      "registerType: 'autoUpdate' recharge la page en pleine saisie",
      "'prompt' + UpdatePromptBanner (react/update-prompt-banner)"
    );
  }
  // LE MORCEAU QUI PART AU CLIC, ET LE CLIC QUI NE RÉPOND PAS.
  //
  // Deux dettes nées du même signalement (miss-badminton, 20/09/2026 : « je
  // clique sur historique, rien ne se passe ») et corrigées le même jour dans
  // DIX dépôts, chacun à la main — sans qu'aucun contrôle ne l'ait jamais dit.
  //
  //  - `prefetch-routes` : des routes découpées en `lazy()` dont AUCUN morceau
  //    n'est préchargé. Le premier clic paie alors un aller-retour réseau
  //    complet, au pire moment — pendant que le reste du bundle arrive et que
  //    le service worker remplit son precache. Le socle exporte
  //    `react/use-prefetch` depuis longtemps ; zéro adoptant, treize copies.
  //  - `nav-attente` : ces mêmes routes sans AUCUN retour au clic. react-router
  //    7 et 8 naviguent dans une transition, et React 19 garde l'écran courant :
  //    le `<Suspense fallback>` de route ne paraît jamais. Trois remèdes
  //    reconnus : `navigate` sur la barre du socle, une transition propre au
  //    menu (`useTransition`), ou une frontière remontée à chaque route
  //    (`key={pathname}`) — et `useNavigation` d'un routeur de données.
  //
  // Le couple ne se juge qu'en présence d'un routeur : un `lazy()` sans
  // react-router (miss-dice, mister-puzzle) vit DANS une page, où le repli
  // paraît normalement. Un dépôt dont les routes paresseuses ne sont atteintes
  // par aucun lien interne (mister-miss-koh : des écrans de partage, en URL
  // absolue) répond par `pwaDoctor.refus` — c'est le droit de réponse, pas un
  // silence.
  const routeur = /from\s+['"]react-router(?:-dom)?['"]/.test(srcText);
  if (routeur && /\blazy\(/.test(srcText)) {
    if (
      !/use-prefetch['"]|dev-pwa-config\/prefetch['"]|useIdlePrefetch|usePrefetch\(|useVisiblePrefetch|prefetchWhenIdle|prefetchOnIntent|requestIdleCallback/.test(
        srcText
      )
    ) {
      dette(
        'prefetch-routes',
        'des routes paresseuses sans aucun préchargement : le morceau part au clic, un aller-retour réseau à la première visite',
        'useIdlePrefetch / usePrefetch (react/use-prefetch), ou items[].load sur BottomNav — avec des thunks nommés, partagés avec lazy()'
      );
    }
    if (
      !/useTransition\(|useNavigation\(|\bnavigate=\{|key=\{(?:location\.)?pathname\}/.test(
        srcText
      )
    ) {
      dette(
        'nav-attente',
        'des routes paresseuses sans retour au clic : le routeur navigue dans une transition et le repli de Suspense ne paraît jamais',
        '<BottomNav navigate={navigate}> (react/bottom-nav), ou une transition propre au menu'
      );
    }
  }
  // LA BARRE COLLÉE QUI NE LE DIT PAS.
  //
  // `BottomNav` n'émet `data-placement="fixed"` que si l'app passe la prop
  // (react/bottom-nav.js). Tout le dégagement du socle est gardé là-dessus :
  // `--_dwc-bottom-clearance` et la position du bandeau de mise à jour sont
  // sous `:root:has([data-dwc='bottom-nav'][data-placement='fixed'])`.
  //
  // Une app qui colle sa barre dans SA feuille obtient donc une barre fixe et
  // un dégagement NUL — et toutes les surfaces flottantes passent dessous. Une
  // garde CSS ne peut pas lire une position calculée ; ce contrôle-ci le peut,
  // parce qu'il lit les deux sources à la fois.
  //
  // Mesuré en production sur mister-cim10 le 16/09/2026, en 375×812 : barre
  // fixe de 56 px, `--_dwc-bottom-clearance` à `max(0px, 0px)`, bandeau de
  // consentement recouvert et 79 px sous la ligne de flottaison. Même défaut
  // sur miss-contraction, signalé par le propriétaire — un bouton
  // « Mettre à jour » qu'aucun clic n'atteignait.
  //
  // ENCORE FAUT-IL QUE L'APP CHARGE CETTE MACHINERIE. Première écriture du
  // contrôle, le 16/09/2026 : il flaguait miss-contraction, qui n'importe
  // AUCUNE feuille du socle. Là-bas il n'y a pas de dégagement à zéro, il n'y a
  // pas de dégagement du tout — l'app place sa barre et ses bandeaux elle-même,
  // de bout en bout, et `placement="fixed"` n'y aurait rien réparé. Un contrôle
  // dont le conseil ne s'applique pas est pire qu'un contrôle absent : il fait
  // écrire une prop pour éteindre un voyant.
  const feuilleDuSocle =
    /dev-pwa-config\/components\.css/.test(srcText + cssText) ||
    /dev-pwa-config\/components\/bottom-nav\.css/.test(srcText + cssText);
  const nav = sansCommentaires.source(srcText);
  if (
    feuilleDuSocle &&
    /<BottomNav/.test(nav) &&
    !/placement=\{?['"]fixed['"]\}?/.test(nav)
  ) {
    // On isole le bloc de la règle : un `position: fixed` voisin ne doit pas
    // être mis au compte de la barre. `[^}]*` avant l'accolade interdit de
    // franchir une fin de règle.
    const blocs =
      sansCommentaires.css(cssText).match(/[^}]*bottom-nav[^{]*\{[^}]*\}/g) ??
      [];
    // `fixed` SEUL, et `sticky` délibérément pas. Une barre collante RESTE dans
    // le flux : elle réserve sa propre hauteur, et le dégagement du socle la
    // compterait une seconde fois. miss-genius est dans ce cas
    // (`position: sticky; bottom: 0`, index.css) et n'a rien à corriger — lui
    // conseiller `placement="fixed"` changerait sa mise en page au lieu de la
    // réparer. Le défaut visé est précis : une barre RETIRÉE du flux sans le
    // dire.
    if (blocs.some(b => /position\s*:\s*fixed/.test(b))) {
      defaut(
        'bottom-nav-muette',
        'barre basse collée par le CSS de l’app sans placement="fixed" : le dégagement du socle vaut zéro, les surfaces flottantes passent dessous',
        '<BottomNav placement="fixed"> puis retirer le position: fixed local — c’est lui qui publie --_dwc-bottom-clearance'
      );
    }
  }
  if (viteConfig && !/pwaSeoPlugin/.test(viteConfig)) {
    dette(
      'seo-plugin',
      'pas de pwaSeoPlugin',
      'plan de site, Open Graph, JSON-LD, contenu servi et pages de contenu en un import (vite-seo)'
    );
  }
  // Pages de contenu : le levier AEO du parc (relève du 25/09/2026). Sans
  // elles, les moteurs n'ont que l'accueil SPA. Une app avec pwaSeoPlugin et
  // sans `content/pages/*.md` reste à la case départ.
  //
  // COMPTÉES COMME LE BUILD LES COMPTE (29/09/2026) : le contrôle comptait tout
  // `.md` de `content/pages`, en dur — un README seul le faisait taire, alors
  // que le build l'ignore, et une app qui déplaçait ses pages (`contentPages`)
  // était déclarée sans pages. `contentPages: false` est une décision écrite :
  // le contrôle se tait.
  const seo = Boolean(viteConfig) && /pwaSeoPlugin/.test(viteConfig);
  const pagesLues = seo ? pagesDuDepot(root, viteConfig) : null;
  const pages = pagesLues?.pages ?? [];
  if (pagesLues && !pagesLues.fichiers.length) {
    dette(
      'seo-content-pages',
      'pas de page de contenu (content/pages/*.md) : rien à classer hors de l’accueil SPA',
      'écrire une page qui répond à une vraie recherche (voir docs/CONFIGS.md § pages de contenu)'
    );
  }
  if (pages.length) {
    // LA DATE. Aucune des vingt pages du parc n'en portait au 29/09/2026 : pas
    // de « Publié le », pas de `dateModified`, un `lastmod` qui changeait à
    // chaque build. Une date FUTURE ferait mentir tout cela à la fois.
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const sansDate = pages.filter(p => !p.date).map(p => p.fichier);
    const futures = pages
      .filter(
        p =>
          (p.date && p.date > aujourdHui) ||
          (p.updated && p.updated > aujourdHui)
      )
      .map(
        p =>
          `${p.fichier} (${[p.date, p.updated].filter(d => d && d > aujourdHui).join(', ')})`
      );
    if (sansDate.length || futures.length) {
      dette(
        'seo-content-date',
        [
          sansDate.length
            ? `${sansDate.length} page(s) sans date : ${sansDate.join(', ')}`
            : '',
          futures.length ? `date future : ${futures.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' ; '),
        'date: AAAA-MM-JJ (publication) et updated: AAAA-MM-JJ (dernière mise à jour de fond) dans l’en-tête — ils fixent la signature visible, datePublished / dateModified et le lastmod du plan de site'
      );
    }
    // LA RÉPONSE COURTE. Le premier paragraphe des pages annonçait la suite
    // (« Voici comment… ») au lieu de répondre : rien à citer pour un moteur
    // de réponse. `answer` est rendu sous le titre (« En bref. ») et repris
    // en `abstract`. Visée : 40 à 70 mots ; tolérée : 30 à 80.
    const sansReponse = pages.filter(p => !p.answer).map(p => p.fichier);
    const horsBornes = pages
      .filter(
        p =>
          p.answer && ((p.motsReponse ?? 0) < 30 || (p.motsReponse ?? 0) > 80)
      )
      .map(p => `${p.fichier} (${p.motsReponse} mots)`);
    if (sansReponse.length || horsBornes.length) {
      dette(
        'seo-content-answer',
        [
          sansReponse.length
            ? `${sansReponse.length} page(s) sans réponse courte : ${sansReponse.join(', ')}`
            : '',
          horsBornes.length
            ? `réponse hors de 30 à 80 mots : ${horsBornes.join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join(' ; '),
        'answer: … dans l’en-tête — la réponse directe, 40 à 70 mots, sur une ligne, avec le chiffre clé'
      );
    }
  }

  // LE JSON-LD ÉCRIT À LA MAIN, là où le plugin s'abstient (il n'injecte rien
  // dans une page qui en porte déjà). Relevé du 29/09/2026 sur mister-puzzle :
  // un `FAQPage` dont aucune question n'apparaît nulle part, des `hreflang` fr,
  // en et x-default vers la MÊME URL, un auteur « Mister Puzzle ».
  const ldMain = jsonLdNodes(jsonLdBlocks(indexHtml));
  const construit = readText(root, 'dist/index.html');

  // Une FAQ balisée doit être VISIBLE : c'est la règle de Google, et un
  // balisage trompeur est un risque, pas un gain. Le HTML servi est celui du
  // build s'il existe (contenu servi compris), sinon l'`index.html`.
  const questions = questionsFaq(ldMain);
  if (questions.length) {
    const servi = comparable(visibleText(construit ?? indexHtml));
    const absentes = questions.filter(q => !servi.includes(comparable(q)));
    if (absentes.length) {
      defaut(
        'seo-faq-visible',
        `FAQPage écrit à la main dans index.html : ${absentes.length} question(s) sur ${questions.length} absente(s) du HTML servi (« ${absentes[0]} »${absentes.length > 1 ? '…' : ''}) — Google exige qu'une FAQ balisée soit visible`,
        'retirer le FAQPage de index.html, ou afficher ces questions — leur place est une page de contenu (content/pages), qui balise sa FAQ elle-même'
      );
    }
  }

  // DES HREFLANG QUI DISENT QUELQUE CHOSE : deux langues, deux URL, et une
  // traduction qui répond à celle qui la désigne. Lus dans l'`index.html`,
  // dans l'accueil construit, et dans les pages de contenu construites.
  const hreflang = [];
  for (const [ou, html] of [
    ['index.html', indexHtml],
    ['dist/index.html', construit ?? ''],
  ]) {
    for (const c of hreflangCollisions(hreflangLinks(html)))
      hreflang.push(`${ou} : ${c}`);
  }
  /** Les pages construites : leur canonique, et ce qu'elles désignent. */
  const construites = new Map();
  for (const p of pages) {
    const html = readText(root, join('dist', p.chemin));
    if (!html) continue;
    const canonique = htmlMarkers(html).canonicalHref;
    if (canonique)
      construites.set(canonique, {
        fichier: p.chemin,
        liens: hreflangLinks(html),
      });
  }
  for (const [url, page] of construites) {
    for (const c of hreflangCollisions(page.liens))
      hreflang.push(`dist/${page.fichier} : ${c}`);
    for (const { lang, href } of page.liens) {
      if (lang.toLowerCase() === 'x-default' || href === url) continue;
      const cible = construites.get(href);
      if (!cible || !cible.liens.some(l => l.href === url))
        hreflang.push(
          `dist/${page.fichier} : ${lang} → ${href} ne la désigne pas en retour`
        );
    }
  }
  const francaises = new Set(
    pages.filter(p => p.lang !== 'en').map(p => p.slug)
  );
  for (const p of pages) {
    if (p.lang === 'en' && p.translation && !francaises.has(p.translation))
      hreflang.push(
        `${p.fichier} : translation « ${p.translation} » ne désigne aucune page française`
      );
  }
  if (hreflang.length) {
    defaut(
      'seo-hreflang',
      `hreflang sans effet : ${hreflang.slice(0, 3).join(' ; ')}${hreflang.length > 3 ? ` (+${hreflang.length - 3})` : ''}`,
      'un hreflang relie des URL DISTINCTES et réciproques : retirer ceux de index.html (la langue s’y choisit côté client), et traduire par content/pages/en/<slug>.md + translation: <slug-fr>'
    );
  }

  // UN SEUL ÉDITEUR. Le plugin désigne l'éditeur de la famille par son `@id`
  // (`PUBLISHER`, `#org`) ; un JSON-LD écrit à la main qui en déclare un autre
  // refait une entité de plus pour les graphes de connaissances.
  const auteurs = ldMain
    .filter(n => [].concat(n['@type']).some(t => TYPES_OEUVRE.has(t)))
    .filter(n => !designeEditeur(n.author) && !designeEditeur(n.publisher))
    .map(
      n =>
        `${[].concat(n['@type'])[0]} : ${decrireAuteur(n.author ?? n.publisher)}`
    );
  if (auteurs.length) {
    info(
      'seo-entity',
      `JSON-LD écrit à la main hors du graphe de la famille — ${auteurs.join(' ; ')}`,
      `retirer ce JSON-LD (pwaSeoPlugin l’engendre, graphe complet), ou désigner author et publisher par { "@id": "${PUBLISHER['@id']}" }`
    );
  }

  // LE TITRE RÉÉCRIT À L'EXÉCUTION (voir `titreRuntimeSansStatique`).
  const titreStatique = decodeEntities(htmlMarkers(indexHtml).title ?? '');
  const reecrits = titreStatique.includes('__')
    ? []
    : titreRuntimeSansStatique(source, titreStatique);
  if (reecrits.length) {
    info(
      'seo-runtime-title',
      `document.title réécrit sans reprendre le titre statique « ${titreStatique} » (${reecrits.join(', ')}) : Google indexe le titre RENDU`,
      'sur l’accueil, garder le titre statique ; ailleurs, le composer avec lui (`${écran} – ${TITRE}`), ou le relire au démarrage (`const TITRE = document.title`)'
    );
  }
  if (viteConfig && !/themeColor/.test(viteConfig)) {
    dette(
      'theme-color',
      'theme-color sans schéma : la barre du navigateur reste claire en mode sombre',
      'pwaSeoPlugin({ themeColor: { light, dark } })'
    );
  }
  if (
    viteConfig &&
    !/cspPlugin/.test(viteConfig) &&
    !/Content-Security-Policy/.test(indexHtml)
  ) {
    dette('csp', 'pas de Content-Security-Policy', 'cspPlugin() de vite-csp');
  }
  // Sans `version.json`, l'app ne sait ni dire ce qui est en ligne, ni qu'une
  // version l'attend : dix-sept sites sur dix-huit le 05/09/2026.
  if (viteConfig && !/versionPlugin/.test(viteConfig)) {
    dette(
      'version-manifest',
      'pas de version.json : l’app ne peut dire ni ce qui est en ligne, ni qu’une version l’attend',
      'versionPlugin({ manifest: true }) (vite-version) + <AppVersion updates /> (react/app-version)'
    );
  }
  // Toute VITE_* que le code lit doit figurer dans `.env.example` : c'est la
  // seule documentation qu'un nouveau venu lira.
  const lues = [
    ...new Set(
      [...srcText.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)].map(
        m => m[1]
      )
    ),
  ].sort();
  if (lues.length) {
    const exemple = readText(root, '.env.example');
    if (!exemple) {
      dette(
        'env-example',
        `${lues.length} VITE_* lues par le code, pas de .env.example`,
        `le créer avec : ${lues.slice(0, 4).join(', ')}${lues.length > 4 ? '…' : ''}`
      );
    } else {
      const absentes = lues.filter(
        name => !new RegExp(`^\\s*#?\\s*${name}\\b`, 'm').test(exemple)
      );
      if (absentes.length) {
        dette(
          'env-example-incomplet',
          `.env.example ne documente pas ${absentes.join(', ')}`,
          'une ligne par variable, avec ce à quoi elle sert'
        );
      }
    }
  }

  // Les trois liens de la famille : sur l'accueil ET sur À propos / Réglages,
  // nulle part ailleurs. Le geste est le même pour les quatre écarts.
  const liens = liensFamille(source);
  const gesteLiens =
    '<AppFooter repoUrl={REPO_URL} issues /> — ou <FamilyAbout currentAppId={…} /> — sur l’accueil ET À propos / Réglages — deux écrans, nulle part ailleurs, jamais dans la coquille';
  if (liens.verdict === 'absent') {
    dette(
      'liens-famille',
      'ni code source ni soutien : aucun écran ne les porte',
      gesteLiens
    );
  } else if (liens.verdict === 'partiel') {
    dette(
      'liens-famille',
      `code source + soutien seulement sur ${liens.ou}`,
      gesteLiens
    );
  } else if (liens.verdict === 'partout') {
    dette(
      'liens-famille',
      'code source + soutien sur tous les écrans, rendus par la coquille : deux écrans au plus',
      gesteLiens
    );
  } else if (liens.verdict === 'trop') {
    dette(
      'liens-famille',
      `code source + soutien sur ${liens.ecrans.length} écrans (${liens.ecrans.map(rel => basename(rel)).join(', ')}) : l’accueil et À propos / Réglages, nulle part ailleurs`,
      gesteLiens
    );
  }

  // Lien d'évitement : premier élément focalisable avant la navigation.
  // `AppShell` le pose ; une coquille maison qui l'oublie force un parcours
  // clavier de toute la barre avant le contenu.
  if (
    /<(?:AppHeader|BottomNav)\b/.test(srcText) &&
    !/<(?:AppShell)\b/.test(srcText) &&
    !/data-dwc=["']app-shell-skip["']|#contenu|sr-only[^"'`\n]*focus:not-sr-only|Aller au contenu|Skip to content/.test(
      srcText
    )
  ) {
    info(
      'skip-link',
      'en-tête ou barre basse sans lien d’évitement',
      '<AppShell> (le pose) ou <a href="#contenu" className="sr-only focus:not-sr-only">'
    );
  }

  // LE LIEN DE SIGNALEMENT MÈNE-T-IL QUELQUE PART ? Un défaut, et pas une
  // dette : l'utilisateur clique sur « Signaler un problème » et se cogne à un
  // 404. Mais SEULEMENT quand la preuve est faite — `hasIssues` vaut `null`
  // hors CI, sans jeton, sans réseau, et alors on ne dit rien du tout. Ni
  // « probablement », ni « à vérifier » : rien.
  if (faits.hasIssues === false && porteSignalement(source)) {
    const ou = faits.repo ? `de ${faits.repo}` : 'du dépôt';
    defaut(
      'issues-desactivees',
      `« Signaler un problème » est affiché, mais les issues ${ou} sont désactivées : issues/new répond 404`,
      'Settings → General → Features → cocher Issues (miss-supatool et miss-ticket-pwa, 06/09/2026) — ou retirer `issues` du pied de page'
    );
  }

  const figees = count(sansCommentaires.source(srcText), /['"]fr-FR['"]/g);
  if (figees) {
    info(
      'locale-figee',
      `${figees} locale(s) 'fr-FR' en dur`,
      'getDefaultLocale() / format* du socle'
    );
  }
  const consoles = count(srcText, /console\.(?:error|warn)\(/g);
  if (consoles) {
    info(
      'console',
      `${consoles} console.error/warn`,
      'createLogger (logger) — voir scripts/console-audit.mjs'
    );
  }
  // Un budget total fige un poids ; sans `mainChunkKb`, ce qui charge AVANT
  // le premier rendu n'est pas borné (puzzle : 271 kB de JS initial).
  if (pkg.bundleBudget && !pkg.bundleBudget.mainChunkKb) {
    info(
      'main-chunk-budget',
      'bundleBudget sans mainChunkKb : le poids initial n’est pas borné, seul le total l’est',
      'mesurer le chunk principal (pwa-bundle-budget l’affiche) et poser mainChunkKb à +10 %'
    );
  }
  // `localStorage` nu perd la donnée à la première version qui change de
  // forme ; le magasin versionné copie de côté avant toute perte.
  const directs = count(
    sansCommentaires.source(srcText),
    /localStorage\.(?:get|set|remove)Item\(/g
  );
  if (directs && !/versioned-store/.test(srcText)) {
    info(
      'local-storage-direct',
      `${directs} accès direct(s) à localStorage sans versioned-store : aucune copie de côté avant une perte`,
      'createVersionedStore (versioned-store) — migrations, validation, sauvegarde avant perte'
    );
  }
}

/**
 * Famille « build » : ce que `dist/` sert vraiment.
 *
 * @returns {boolean} Vrai si un build a été trouvé — le rapport le porte.
 */
export function reglesBuild(ctx, api) {
  const { root, srcText, wfText } = ctx;
  const { defaut, dette, info } = api;

  /* ── 4. Le build ──────────────────────────────────────────────────────── */

  const html = readText(root, 'dist/index.html');
  const build = Boolean(html);
  if (!build) {
    info(
      'no-build',
      'pas de dist/ : les lectures du build sont sautées',
      'lancer le build, puis pwa-doctor'
    );
  } else {
    const m = htmlMarkers(html);
    if (!m.lang) defaut('html-lang', '<html> sans lang', 'lang="fr"');
    if (!m.viewport)
      defaut(
        'viewport',
        'pas de <meta name="viewport">',
        'width=device-width, initial-scale=1'
      );
    if (!m.description)
      dette(
        'description',
        'pas de <meta name="description">',
        '<meta name="description" content="…"> dans index.html — pwaSeoPlugin la reprend (Open Graph, JSON-LD, contenu servi), il ne l’écrit pas'
      );
    // Bing Webmaster (SEO/GEO) signale « Title too short » sous ~50 caractères —
    // relevé du 26/09/2026 sur miss-dice et confirmé sur la quasi-totalité du
    // parc. Le <title> sert aussi le H1 du contenu servi (servedContent).
    if (m.title && [...m.title.replace(/&amp;/g, '&')].length < 50) {
      dette(
        'seo-title-length',
        `titre trop court (${[...m.title.replace(/&amp;/g, '&')].length} car.) pour Bing SEO/GEO : « ${m.title.slice(0, 60)} »`,
        'allonger <title> (et og:title / twitter:title) à ≥ 50 caractères, descriptif'
      );
    }
    // Description : trop courte = snippet pauvre et signal AEO/GEO faible ;
    // trop longue = tronquée dans les SERP (~155–160). Seuil bas relevé sur
    // miss-carbook / miss-badminton / miss-ticket-pwa (26/09/2026).
    if (m.descriptionContent) {
      const descLen = [...m.descriptionContent.replace(/&amp;/g, '&')].length;
      if (descLen < 70) {
        dette(
          'seo-description-length',
          `description trop courte (${descLen} car.) pour SEO/GEO/AEO`,
          'allonger <meta name="description"> (et og:description) à 70–160 caractères, une vraie phrase-réponse'
        );
      } else if (descLen > 160) {
        info(
          'seo-description-length',
          `description longue (${descLen} car.) : risque de troncature SERP`,
          'viser ~120–155 caractères pour l’aperçu ; le surplus reste utile au contenu servi'
        );
      }
    }
    if (!m.jsonLd) {
      dette(
        'seo-json-ld',
        'pas de JSON-LD WebApplication',
        'pwaSeoPlugin l’injecte (jsonLd: true par défaut)'
      );
    }
    if (!m.servedContent) {
      dette(
        'seo-served-content',
        'pas de contenu servi dans le point de montage : un robot sans JS lit une page vide',
        'pwaSeoPlugin ({ servedContent: true }) — titre + description dans #app/#root'
      );
    }
    if (!m.appleTouchIcon) {
      defaut(
        'ios-icon',
        'pas de rel="apple-touch-icon" : iOS prend une capture d’écran comme icône',
        '<link rel="apple-touch-icon" href="…/apple-touch-icon.png"> (pwa-icons la génère)'
      );
    }
    if (!m.themeColorMedia) {
      dette(
        'theme-color',
        'theme-color sans schéma',
        'pwaSeoPlugin({ themeColor: { light, dark } })'
      );
    }
    if (!m.csp)
      dette('csp', 'pas de Content-Security-Policy', 'cspPlugin() de vite-csp');
    if (!m.ogImage) dette('og-image', 'pas de og:image', 'pwaSeoPlugin');
    if (!m.canonical)
      dette(
        'canonical',
        'pas de rel="canonical"',
        '<link rel="canonical" href="__SEO_HOME_URL__" /> dans index.html — pwaSeoPlugin remplace le marqueur'
      );

    // LES ASSETS RESTENT-ILS SOUS LE SITE ? Jugés à l'aune de la CANONIQUE, pas
    // du préfixe déduit des scripts : celui-ci se replie sur `/` quand les
    // scripts sont justement faux, et le contrôle se désarmerait au moment où
    // il servirait. `miss-ticket-pwa` a servi une page blanche du 03/06 au
    // 06/09/2026 — build vert, CI verte, docteur muet — parce que sa base
    // valait `/` alors que le site vit sous `/miss-ticket-pwa/`.
    const scope = siteScope(m.canonicalHref);
    const dehors = [...(m.scripts ?? []), ...(m.styles ?? [])].filter(href =>
      escapesSite(href, scope)
    );
    if (dehors.length) {
      defaut(
        'assets-hors-site',
        `${dehors.length} asset(s) liés hors du site : ${dehors.slice(0, 2).join(', ')} (le site vit sous ${scope}) — la page se charge sans JS ni CSS`,
        'base du build = le chemin du site (use-base-path: true, ou VITE_BASE_PATH)'
      );
    }

    const prefix = sitePrefix(m);
    if (!m.manifest) {
      defaut(
        'manifest-link',
        'pas de <link rel="manifest">',
        'VitePWA le pose (manifest: {...})'
      );
    } else {
      if (escapesSite(m.manifest, prefix)) {
        defaut(
          'manifest-href',
          `le manifeste est lié hors du site : ${m.manifest} (le site vit sous ${prefix}) — l’app ne s’installe pas`,
          `href="${prefix}${basename(m.manifest)}" ou %BASE_URL%${basename(m.manifest)}`
        );
      }
      const name = basename(m.manifest.split('?')[0]);
      const manifestText =
        readText(root, join('dist', name)) ??
        readText(root, 'dist/manifest.webmanifest') ??
        readText(root, 'dist/manifest.json');
      const ms = manifestSummary(manifestText ?? '');
      if (!ms) {
        defaut(
          'manifest-illisible',
          `manifeste ${name} absent du build ou illisible`,
          'VitePWA manifest: {...}'
        );
      } else {
        if (!ms.has512 && !ms.hasAny) {
          defaut(
            'manifest-icons',
            'aucune icône de 512 px ni vectorielle : Chrome refuse l’installation',
            'pwa-icons --source public/favicon.svg --out public --maskable'
          );
        } else if (!ms.hasPng) {
          dette(
            'manifest-png',
            'aucune icône PNG : iOS et les lanceurs Android n’utilisent pas le SVG',
            'pwa-icons --source public/favicon.svg --out public --maskable'
          );
        }
        if (!ms.maskable)
          dette(
            'manifest-maskable',
            'pas d’icône maskable',
            'purpose: "maskable" (pwa-icons --maskable)'
          );
        if (!ms.hasId) {
          dette(
            'manifest-id',
            'manifeste sans id : changer start_url créerait une seconde app installée',
            'id: basePath (pwaManifest le pose)'
          );
        }
        if (
          ms.lang &&
          m.lang &&
          ms.lang.slice(0, 2).toLowerCase() !== m.lang.slice(0, 2).toLowerCase()
        ) {
          defaut(
            'manifest-lang',
            `manifeste en lang "${ms.lang}", page en "${m.lang}"`,
            'lang: "fr" dans le manifeste'
          );
        }
        if (!ms.screenshots)
          dette(
            'manifest-screenshots',
            'pas de captures : pas d’interface d’installation riche',
            'screenshots: [narrow, wide]'
          );
      }
    }
    if (!exists(root, 'dist/version.json')) {
      dette(
        'version-manifest',
        'pas de version.json dans le build : l’app ne peut dire ni ce qui est en ligne, ni qu’une version l’attend',
        'versionPlugin({ manifest: true }) (vite-version)'
      );
    }
    /*
     * UN MORCEAU HORS PRÉCACHE NE DOIT PAS PORTER D'EMPREINTE DE CONTENU.
     *
     * Signalé en production sur mister-qowa le 22/09/2026 : « Échec du
     * chargement pour le module dont la source est .../sentry-EYLFX1f0.js »,
     * HTTP 404. Le service worker sert la coquille PRÉCACHÉE jusqu'à ce que
     * l'utilisateur accepte la mise à jour ; cette coquille demande l'ANCIENNE
     * empreinte, que le déploiement suivant a supprimée de `assets/`. Tout ce
     * qui est précaché survit — c'est précisément ce qui ne l'est pas qui casse.
     *
     * ET ÇA NE SE VOIT PAS. Les apps du parc excluent le SDK Sentry du précache
     * (158 kB gzip que personne ne doit télécharger sans DSN) et `initSentry`
     * enveloppe son import dans un try/catch : l'application ne casse pas, elle
     * cesse de rapporter ses erreurs sans le dire. Un rapporteur éteint par le
     * déploiement qui vient de l'installer. Dix-neuf dépôts portaient le montage
     * au 22/09/2026 ; aucun ne l'avait remarqué.
     *
     * Le contrôle lit les ARTEFACTS, pas la configuration : c'est la seule façon
     * d'attraper aussi ce qu'une exclusion future écartera (miss-genius exclut
     * déjà `rive-*` et `RivePlayer-*` par le même motif).
     *
     * SANS PRÉCACHE, LE CONTRÔLE SE TAIT — et ce n'est pas une facilité : sans
     * précache il n'y a pas de coquille périmée, donc aucun ancien nom à
     * demander. L'invariant est vide, pas contourné.
     */
    const sw =
      readText(root, 'dist/sw.js') ?? readText(root, 'dist/service-worker.js');
    if (sw) {
      // Le manifeste s'écrit minifié (`url:"…"`) ou développé (`"url": "…"`).
      // On n'accepte que des valeurs qui RESSEMBLENT à un fichier servi : le
      // code de Workbox porte lui aussi des littéraux `url:`.
      const precache = new Set(
        [
          ...sw.matchAll(
            /["']?url["']?\s*:\s*["']([^"']+\.(?:js|css|html|svg|png|webp|woff2|webmanifest|ico|json))["']/g
          ),
        ].map(m => m[1].split('/').pop())
      );
      const fugaces = precache.size
        ? jsDuBuild(root).filter(
            f => !precache.has(f) && EMPREINTE_VITE.test(f)
          )
        : [];
      if (fugaces.length) {
        const liste = fugaces.slice(0, 3).join(', ');
        defaut(
          'chunk-hors-precache',
          `${fugaces.length} morceau(x) hors précache portent une empreinte de contenu (${liste}${fugaces.length > 3 ? ', …' : ''}) : leur URL meurt au déploiement suivant, et la coquille précachée la demandera encore`,
          'un nom STABLE via `chunkFileNames` (ex. `assets/sentry.js`), et le motif de `globIgnores` mis d’accord — sinon le morceau rentre dans le précache'
        );
      }
    }
    // `pwa-deploy.yml@<majeur>` copie `index.html` en `404.html` AU DÉPLOIEMENT :
    // un build local sans lui n'est pas un défaut pour une app qui déploie
    // par le réutilisable — c'est le cas de badminton, contraction, footcoach.
    if (
      /BrowserRouter|createBrowserRouter/.test(srcText) &&
      !exists(root, 'dist/404.html') &&
      !/pwa-deploy\.yml@v[4-9]/.test(wfText)
    ) {
      defaut(
        'spa-404',
        'routage par chemin sans 404.html : un lien profond sert la page 404 de GitHub',
        `spaFallbackPlugin() (vite-pwa-base) ou pwa-deploy.yml@${MAJEUR}`
      );
    }
  }

  return build;
}

/** Les quatre familles, dans l'ordre où elles s'exécutent. */
export const FAMILLES = [
  { nom: 'dépôt', regles: reglesDepot },
  { nom: 'workflows', regles: reglesWorkflows },
  { nom: 'source', regles: reglesSource },
  { nom: 'build', regles: reglesBuild },
];

/**
 * LE CATALOGUE : ce que le docteur contrôle, nommé.
 *
 * Un identifiant sert à trois choses qui n'existaient pas tant qu'il ne vivait
 * qu'au fond d'une fonction de six cents lignes : écrire un refus motivé dans
 * `package.json`, restreindre une exécution (`--only`), et savoir ce que
 * l'outil regarde SANS lire son code (`pwa-doctor --regles`).
 *
 * Il est FIGÉ ici, et non déduit à l'exécution : une liste engendrée à la volée
 * ne dirait rien d'un contrôle disparu par accident. `test/pwa-doctor.test.mjs`
 * la compare aux familles et refuse le moindre écart, dans les deux sens.
 *
 * Le niveau est celui du contrôle À SA SOURCE : un refus le change en `refus`,
 * et deux familles peuvent porter le même identifiant — la source l'emporte sur
 * le build, par l'ordre d'exécution, et le catalogue garde la première.
 */
export const CATALOGUE = [
  { id: 'editorconfig', famille: 'dépôt', niveau: 'dette' },
  { id: 'nvmrc', famille: 'dépôt', niveau: 'dette' },
  { id: 'gitattributes', famille: 'dépôt', niveau: 'dette' },
  { id: 'gitignore-worktrees', famille: 'dépôt', niveau: 'dette' },
  { id: 'renovate', famille: 'dépôt', niveau: 'dette' },
  { id: 'renovate-preset', famille: 'dépôt', niveau: 'défaut' },
  { id: 'renovate-local', famille: 'dépôt', niveau: 'info' },
  { id: 'lighthouserc', famille: 'dépôt', niveau: 'dette' },
  { id: 'a11y-spec', famille: 'dépôt', niveau: 'dette' },
  { id: 'bundle-budget', famille: 'dépôt', niveau: 'dette' },
  { id: 'engines', famille: 'dépôt', niveau: 'info' },
  { id: 'dev-port', famille: 'dépôt', niveau: 'info' },
  { id: 'workflows', famille: 'workflows', niveau: 'dette' },
  { id: 'wf-lighthouse', famille: 'workflows', niveau: 'dette' },
  { id: 'wf-cleanup', famille: 'workflows', niveau: 'dette' },
  { id: 'wf-keepalive', famille: 'workflows', niveau: 'dette' },
  { id: 'wf-e2e', famille: 'workflows', niveau: 'dette' },
  { id: 'e2e-hors-filtre', famille: 'workflows', niveau: 'dette' },
  { id: 'wf-deploy-maison', famille: 'workflows', niveau: 'dette' },
  { id: 'wf-v3', famille: 'workflows', niveau: 'dette' },
  { id: 'secrets-inherit', famille: 'workflows', niveau: 'défaut' },
  { id: 'vite-en-secret', famille: 'workflows', niveau: 'dette' },
  { id: 'auto-update', famille: 'source', niveau: 'dette' },
  { id: 'prefetch-routes', famille: 'source', niveau: 'dette' },
  { id: 'nav-attente', famille: 'source', niveau: 'dette' },
  { id: 'bottom-nav-muette', famille: 'source', niveau: 'défaut' },
  { id: 'seo-plugin', famille: 'source', niveau: 'dette' },
  { id: 'seo-content-pages', famille: 'source', niveau: 'dette' },
  { id: 'seo-content-date', famille: 'source', niveau: 'dette' },
  { id: 'seo-content-answer', famille: 'source', niveau: 'dette' },
  { id: 'seo-faq-visible', famille: 'source', niveau: 'défaut' },
  { id: 'seo-hreflang', famille: 'source', niveau: 'défaut' },
  { id: 'seo-entity', famille: 'source', niveau: 'info' },
  { id: 'seo-runtime-title', famille: 'source', niveau: 'info' },
  { id: 'theme-color', famille: 'source', niveau: 'dette' },
  { id: 'csp', famille: 'source', niveau: 'dette' },
  { id: 'version-manifest', famille: 'source', niveau: 'dette' },
  { id: 'env-example', famille: 'source', niveau: 'dette' },
  { id: 'env-example-incomplet', famille: 'source', niveau: 'dette' },
  { id: 'liens-famille', famille: 'source', niveau: 'dette' },
  { id: 'skip-link', famille: 'source', niveau: 'info' },
  { id: 'issues-desactivees', famille: 'source', niveau: 'défaut' },
  { id: 'locale-figee', famille: 'source', niveau: 'info' },
  { id: 'console', famille: 'source', niveau: 'info' },
  { id: 'main-chunk-budget', famille: 'source', niveau: 'info' },
  { id: 'local-storage-direct', famille: 'source', niveau: 'info' },
  { id: 'no-build', famille: 'build', niveau: 'info' },
  { id: 'html-lang', famille: 'build', niveau: 'défaut' },
  { id: 'viewport', famille: 'build', niveau: 'défaut' },
  { id: 'description', famille: 'build', niveau: 'dette' },
  { id: 'seo-title-length', famille: 'build', niveau: 'dette' },
  { id: 'seo-description-length', famille: 'build', niveau: 'dette' },
  { id: 'seo-json-ld', famille: 'build', niveau: 'dette' },
  { id: 'seo-served-content', famille: 'build', niveau: 'dette' },
  { id: 'ios-icon', famille: 'build', niveau: 'défaut' },
  { id: 'theme-color', famille: 'build', niveau: 'dette' },
  { id: 'csp', famille: 'build', niveau: 'dette' },
  { id: 'og-image', famille: 'build', niveau: 'dette' },
  { id: 'canonical', famille: 'build', niveau: 'dette' },
  { id: 'assets-hors-site', famille: 'build', niveau: 'défaut' },
  { id: 'manifest-link', famille: 'build', niveau: 'défaut' },
  { id: 'manifest-href', famille: 'build', niveau: 'défaut' },
  { id: 'manifest-illisible', famille: 'build', niveau: 'défaut' },
  { id: 'manifest-icons', famille: 'build', niveau: 'défaut' },
  { id: 'manifest-png', famille: 'build', niveau: 'dette' },
  { id: 'manifest-maskable', famille: 'build', niveau: 'dette' },
  { id: 'manifest-id', famille: 'build', niveau: 'dette' },
  { id: 'manifest-lang', famille: 'build', niveau: 'défaut' },
  { id: 'manifest-screenshots', famille: 'build', niveau: 'dette' },
  { id: 'version-manifest', famille: 'build', niveau: 'dette' },
  { id: 'chunk-hors-precache', famille: 'build', niveau: 'défaut' },
  { id: 'spa-404', famille: 'build', niveau: 'défaut' },
];

/** Le catalogue, lisible en terminal, groupé par famille. */
export function formatCatalogue(catalogue = CATALOGUE) {
  const par = new Map();
  for (const regle of catalogue) {
    if (!par.has(regle.famille)) par.set(regle.famille, []);
    par.get(regle.famille).push(regle);
  }
  const lignes = [`${catalogue.length} contrôles, en ${par.size} familles :`];
  for (const [famille, regles] of par) {
    lignes.push('', `── ${famille} (${regles.length})`);
    for (const { id, niveau } of regles) {
      lignes.push(`  ${MARK[niveau] ?? ' '} ${id.padEnd(24)} ${niveau}`);
    }
  }
  lignes.push(
    '',
    'Refuser un contrôle ICI, avec sa raison, l’éteint sans le cacher :',
    '  "pwaDoctor": { "refus": { "<id>": "<pourquoi pas ici>" } }',
    '`--only` et `--skip` servent à travailler SUR un contrôle, pas à s’en taire.'
  );
  return lignes.join('\n');
}

/**
 * Le diagnostic d'un dépôt. Pur au sens utile : il lit le disque, n'écrit
 * rien, ne touche pas au réseau.
 *
 * `faits` porte ce que le disque ne dit pas — aujourd'hui le seul réglage de
 * dépôt qui produise un défaut visible par l'utilisateur (`hasIssues`). Il est
 * PASSÉ, pas cherché : c'est ce qui garde cette fonction pure et testable, et
 * ce qui fait que « je ne sais pas » (`null`, `undefined`) reste distinct de
 * « c'est faux ».
 *
 * @param {string} dir Racine de l'app.
 * @param {{ hasIssues?: boolean | null, repo?: string | null }} [faits]
 * @param {{ only?: string[], skip?: string[] }} [options] Restreindre aux
 *   identifiants donnés, ou en écarter — pour travailler sur un contrôle, pas
 *   pour faire taire un défaut.
 * @returns {{ dir: string, findings: Array<{ level: 'défaut'|'dette'|'info'|'refus',
 *   id: string, message: string, fix?: string }>, build: boolean }}
 */
export function diagnose(dir, faits = {}, options = {}) {
  const ctx = contexteDepot(dir, faits);
  const { findings, refus, refusServis, api } = journal(ctx.pkg, options);
  const { info } = api;

  let build = false;
  for (const famille of FAMILLES) {
    const rendu = famille.regles(ctx, api);
    if (famille.nom === 'build') build = Boolean(rendu);
  }

  // Un refus qui n'excuse plus rien reste écrit, et personne ne le relit : la
  // liste d'exceptions grossit d'un cran à chaque décision et ne redescend
  // jamais. Il se signale donc lui-même, en info — le geste étant de retirer
  // la ligne.
  for (const id of Object.keys(refus)) {
    if (!refusServis.has(id)) {
      info(
        `refus-perime-${id}`,
        `pwaDoctor.refus.${id} n’excuse plus rien : ce contrôle ne trouve rien ici`,
        'retirer la ligne de package.json'
      );
    }
  }

  return { dir: ctx.root, findings, build };
}

const MARK = { défaut: '✖', dette: '•', info: 'i', refus: '–' };

/** Le rapport, lisible. */
export function format(report) {
  const lines = [];
  for (const level of ['défaut', 'dette', 'info', 'refus']) {
    for (const f of report.findings.filter(x => x.level === level)) {
      lines.push(`${MARK[level]} ${level.padEnd(6)} ${f.message}`);
      // La RAISON à la place du geste : sur un refus, le geste a déjà été
      // écarté, et c'est le pourquoi qui doit rester sous les yeux.
      if (f.raison) lines.push(`         ↳ refusé ici : ${f.raison}`);
      else if (f.fix) lines.push(`         → ${f.fix}`);
    }
  }
  const n = level => report.findings.filter(f => f.level === level).length;
  lines.push(
    `\n${n('défaut')} défaut(s), ${n('dette')} dette(s), ${n('info')} info(s)` +
      (n('refus') ? `, ${n('refus')} refus` : '') +
      (report.build ? '' : ' — build non lu')
  );
  return lines.join('\n');
}

/**
 * Les faits qui ne sont pas sur le disque. Un seul aujourd'hui : les issues du
 * dépôt sont-elles ouvertes ?
 *
 * TROIS CONDITIONS, et le silence sinon : un dépôt identifié sans deviner, un
 * jeton (`GITHUB_TOKEN` — la CI le donne, un poste de développement non), et
 * une réponse exploitable de l'API. `--no-github` coupe l'appel franchement,
 * pour un diagnostic hors ligne qui ne doit rien attendre.
 *
 * @param {string} root Racine RÉSOLUE du dossier diagnostiqué.
 * @param {{ env?: Record<string, string | undefined>, offline?: boolean,
 *   fetch?: typeof globalThis.fetch }} [options]
 */
export async function faitsDepot(root, options = {}) {
  const env = options.env ?? process.env;
  const pkg = readJson(root, 'package.json') ?? {};
  const repo = depotGitHub(root, pkg, env);
  if (options.offline) return { repo, hasIssues: null };
  const hasIssues = await issuesActivees(repo, {
    token: env.GITHUB_TOKEN || env.GH_TOKEN,
    fetch: options.fetch,
  });
  return { repo, hasIssues };
}

/** Une liste d'identifiants passée en ligne de commande : `a,b` ou `a b`. */
export function identifiants(valeur) {
  return String(valeur ?? '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

export async function run(args = []) {
  const at = flag =>
    args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const dir = at('--dir') ?? process.cwd();
  const strict = args.includes('--strict');

  // `--regles` ne lit aucun dépôt : c'est le catalogue du docteur, pour savoir
  // ce qui est contrôlé AVANT de le lancer, et pour écrire un `--only` ou un
  // refus sans deviner l'identifiant.
  if (args.includes('--regles')) {
    console.log(formatCatalogue());
    return 0;
  }

  try {
    statSync(dir);
  } catch {
    console.error(`pwa-doctor : dossier introuvable : ${dir}`);
    return 2;
  }
  const options = {
    only: identifiants(at('--only')),
    skip: identifiants(at('--skip')),
  };
  const inconnus = [...options.only, ...options.skip].filter(
    id => !CATALOGUE.some(r => r.id === id)
  );
  if (inconnus.length) {
    // Un identifiant mal orthographié dans `--only` ne filtrerait rien et
    // rendrait un rapport vide : silencieux, et faux.
    console.error(
      `pwa-doctor : identifiant inconnu : ${inconnus.join(', ')} — \`pwa-doctor --regles\` les liste tous.`
    );
    return 2;
  }
  const faits = await faitsDepot(resolve(dir), {
    offline: args.includes('--no-github'),
  });
  const report = diagnose(dir, faits, options);
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else console.log(format(report));
  const defauts = report.findings.some(f => f.level === 'défaut');
  const dettes = report.findings.some(f => f.level === 'dette');
  return defauts || (strict && dettes) ? 1 : 0;
}

if (estPointDEntree(import.meta.url)) {
  process.exitCode = await run(process.argv.slice(2));
}
