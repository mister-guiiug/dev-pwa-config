// Garde-fous du catalogue du showroom.
//
// La leçon vient d'un design system voisin : il déclarait « chaque composant
// partagé figure dans ce catalogue » et en avait laissé filer dix-huit, faute
// de test. Un catalogue tenu à la main devient faux le jour où quelqu'un est
// pressé — et il ne le dit jamais.
//
// Les quatre promesses vérifiées ici :
//   1. « rien n'échappe »   → tout export du barrel est couvert, ou exclu ;
//   2. « rien n'est vide »  → chaque composant a ses pièges ET sa note a11y ;
//   3. « FR = EN »          → parité stricte, y compris le nombre de pièges ;
//   4. « les arbres tiennent » → 2 à 4 branches, pointant vers du réel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name =>
  readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

await import('../showroom/catalogue.js');
const CATALOGUE = globalThis.SHOWROOM_CATALOGUE;

const INDEX_HTML = read('showroom/index.html');
const SHOWROOM_JS = read('showroom/showroom.js');

// Exports que le catalogue ne documente PAS, et pourquoi. Une liste vide est
// l'état sain ; y ajouter une ligne est une décision, pas un oubli.
const EXCLUS = {};

test('tout export du barrel est catalogué, ou nommément exclu', async () => {
  const barrel = await import('../react/index.js');
  const exports = Object.keys(barrel).sort();
  assert.ok(exports.length > 20, 'barrel suspicieusement court');

  const couverts = new Set([
    ...CATALOGUE.components.flatMap(c => c.covers ?? []),
    ...CATALOGUE.hooks.flatMap(h => h.covers ?? []),
    ...Object.keys(EXCLUS),
  ]);

  const orphelins = exports.filter(name => !couverts.has(name));
  assert.deepEqual(
    orphelins,
    [],
    'ces exports ne sont documentés nulle part dans le showroom — les ajouter au catalogue, ou les inscrire dans EXCLUS avec leur raison'
  );

  // L'inverse : une entrée qui prétend couvrir un export disparu (du baril
  // ou d'un sous-chemin `react/*`).
  const connus = new Set([
    ...exports,
    ...exportsDesSousChemins().map(e => e.nom),
  ]);
  const fantomes = [...couverts].filter(
    name => !connus.has(name) && !(name in EXCLUS)
  );
  assert.deepEqual(
    fantomes,
    [],
    'le catalogue documente des exports qui n’existent plus'
  );
});

/* ── Les sous-chemins react/* hors baril ───────────────────────────────── */

/**
 * Composants (`PascalCase`) et hooks (`use…`) des sous-chemins `./react/*`
 * déclarés dans package.json. Les constantes et utilitaires d'un sous-chemin
 * n'ont pas de fiche : ce sont des détails d'API, que docs/EXPORTS.md liste.
 *
 * Lus dans le source plutôt qu'importés : plusieurs sous-chemins importent un
 * module virtuel de Vite (`virtual:pwa-register/react`) ou une peer
 * facultative, qu'un import sous Node ferait échouer.
 */
function exportsDesSousChemins() {
  const pkg = JSON.parse(read('package.json'));
  return Object.entries(pkg.exports)
    .filter(([cle]) => cle.startsWith('./react/'))
    .flatMap(([cle, cible]) => {
      const fichier = typeof cible === 'string' ? cible : cible.default;
      const source = read(fichier.replace(/^\.\//, ''));
      const declares = [
        ...source.matchAll(/export (?:async )?(?:function|const|class) (\w+)/g),
      ].map(m => m[1]);
      return declares
        .filter(nom => /^[A-Z][a-z]/.test(nom) || /^use[A-Z]/.test(nom))
        .map(nom => ({ nom, sousChemin: cle }));
    });
}

// Composants et hooks des sous-chemins SANS fiche, chacun avec sa raison.
// La liste ne peut que raccourcir : un nom qui reçoit une fiche doit en
// sortir (le test le dit), et un export nouveau sans fiche ni ligne ici fait
// échouer. Relevé du 05/10/2026 : la garde ne lisait que `react/index.js`.
const SANS_FICHE = {
  useEscape:
    'react/a11y : rouage de Sheet et ConfirmDialog, montré à travers eux',
  useScrollLock:
    'react/a11y : rouage de Sheet et ConfirmDialog, montré à travers eux',
  useFocusTrap:
    'react/a11y : rouage de Sheet et ConfirmDialog, montré à travers eux',
  AnnouncerProvider:
    'react/a11y : région d’annonce sans rendu visible, pas encore de fiche',
  useAnnouncer:
    'react/a11y : région d’annonce sans rendu visible, pas encore de fiche',
  VisuallyHidden:
    'react/a11y : utilitaire de masquage (.dwc-sr-only de tokens.css), pas encore de fiche',
  SkipLink:
    'react/a11y : la page a son propre lien d’évitement ; fiche à écrire',
  useUpdateCheck: 'react/app-updates : rouage de AppUpdates, qui a sa fiche',
  useConsentChoice:
    'mesure d’audience, promue en 09/2026 : habillée par components.css, pas encore de démo ni de fiche',
  ConsentBanner:
    'mesure d’audience, promue en 09/2026 : habillée par components.css, pas encore de démo ni de fiche',
  ConsentSettings:
    'mesure d’audience, promue en 09/2026 : habillée par components.css, pas encore de démo ni de fiche',
  ConsentSection:
    'mesure d’audience, promue en 09/2026 : habillée par components.css, pas encore de démo ni de fiche',
  PrivacyNotice:
    'mesure d’audience, promue en 09/2026 : habillée par components.css, pas encore de démo ni de fiche',
  RiveAnimation:
    'react/rive : runtime chargé à la demande (environ 100 ko et du WASM) ; une démo enfreindrait « aucune requête réseau »',
  useQrScanner:
    'react/use-qr-scanner : demande la caméra et une peer facultative (qr-scanner), rien à montrer sans elles',
  useAuth:
    'session Supabase : LoginForm et MfaChallenge sont présentés, le raccord useAuth pas encore',
  AuthGate:
    'session Supabase : LoginForm et MfaChallenge sont présentés, la garde AuthGate pas encore',
  useRouteBreadcrumbs:
    'observabilité : sans rendu, pas encore de fiche dans la section Hooks',
  usePageViews:
    'mesure GA4 : sans rendu, pas encore de fiche dans la section Hooks',
};

test('tout composant et tout hook des sous-chemins react/* est catalogué, ou nommément sans fiche', async () => {
  const baril = new Set(Object.keys(await import('../react/index.js')));
  const couverts = new Set([
    ...CATALOGUE.components.flatMap(c => c.covers ?? []),
    ...CATALOGUE.hooks.flatMap(h => h.covers ?? []),
  ]);
  const vus = exportsDesSousChemins().filter(e => !baril.has(e.nom));
  assert.ok(vus.length > 10, 'sous-chemins suspicieusement vides');

  const manquants = vus
    .filter(e => !couverts.has(e.nom) && !(e.nom in SANS_FICHE))
    .map(e => `${e.sousChemin} : ${e.nom}`);
  assert.deepEqual(
    manquants,
    [],
    'export de sous-chemin sans fiche : l’ajouter au catalogue, ou à SANS_FICHE avec sa raison'
  );

  const noms = new Set(vus.map(e => e.nom));
  const perimes = Object.keys(SANS_FICHE).filter(
    nom => couverts.has(nom) || !noms.has(nom)
  );
  assert.deepEqual(
    perimes,
    [],
    'ces noms ont une fiche désormais, ou n’existent plus : les retirer de SANS_FICHE'
  );
});

test('chaque composant catalogué porte ses pièges et sa note a11y', () => {
  // Le champ obligatoire force la question au moment où on ajoute le
  // composant — c'est-à-dire au seul moment où on connaît encore la réponse.
  for (const entry of CATALOGUE.components) {
    assert.ok(
      (entry.donts?.fr ?? []).length > 0,
      `${entry.id} n’expose aucun piège`
    );
    assert.ok(entry.a11y?.fr, `${entry.id} n’a pas de note d’accessibilité`);
    assert.ok(
      ['primitive', 'feedback', 'pwa', 'shell'].includes(entry.category),
      `${entry.id} : catégorie inconnue « ${entry.category} »`
    );
  }
  for (const hook of CATALOGUE.hooks) {
    assert.ok(hook.signature, `${hook.id} n’a pas de signature`);
    assert.ok(hook.dont?.fr, `${hook.id} n’a pas de piège`);
  }
});

test('français et anglais restent à parité, piège par piège', () => {
  // Un piège traduit à moitié laisserait une liste plus courte en anglais :
  // la comparaison porte donc sur la LONGUEUR, pas sur la seule présence.
  const paires = [];
  for (const entry of CATALOGUE.components) {
    paires.push([`${entry.id}.donts`, entry.donts]);
    paires.push([`${entry.id}.a11y`, entry.a11y]);
  }
  for (const hook of CATALOGUE.hooks) {
    paires.push([`${hook.id}.summary`, hook.summary]);
    paires.push([`${hook.id}.dont`, hook.dont]);
  }
  for (const tree of CATALOGUE.decisions) {
    paires.push([`${tree.id}.question`, tree.question]);
    tree.branches.forEach((b, i) => {
      paires.push([`${tree.id}.${i}.when`, b.when]);
      paires.push([`${tree.id}.${i}.why`, b.why]);
    });
  }

  for (const [nom, champ] of paires) {
    assert.ok(champ?.fr !== undefined, `${nom} : français manquant`);
    assert.ok(champ?.en !== undefined, `${nom} : anglais manquant`);
    if (Array.isArray(champ.fr)) {
      assert.equal(
        champ.en.length,
        champ.fr.length,
        `${nom} : ${champ.fr.length} entrées en français, ${champ.en.length} en anglais`
      );
    }
  }
});

test('les arbres de décision restent des arbres', () => {
  const cibles = new Set(CATALOGUE.components.map(c => c.id));
  assert.ok(CATALOGUE.decisions.length >= 3, 'trop peu d’arbres');

  for (const tree of CATALOGUE.decisions) {
    // La règle annoncée dans la page : au-delà de quatre branches, ce n'est
    // pas l'arbre qui manque de place, c'est l'API qui est sous-spécifiée.
    assert.ok(
      tree.branches.length >= 2 && tree.branches.length <= 4,
      `${tree.id} : ${tree.branches.length} branches, hors de la fourchette 2–4 annoncée`
    );
    for (const branch of tree.branches) {
      assert.ok(branch.use, `${tree.id} : une branche ne recommande rien`);
      assert.ok(
        cibles.has(branch.target),
        `${tree.id} : la branche pointe vers « ${branch.target} », qui n’est pas un composant catalogué`
      );
      // `use` n'est pas traduit : c'est du CODE. Une qualification glissée
      // dedans (« à deux actions ») resterait en français dans la version
      // anglaise — ce qui est arrivé, d'où cette forme imposée : une balise,
      // ou deux séparées par ` + `.
      for (const part of branch.use.split(' + ')) {
        assert.match(
          part,
          /^<[A-Z]\w*(\s[^<>]*?)?\s*\/?>$/,
          `${tree.id} : « ${branch.use} » n’est pas un fragment de code — déplacer la qualification dans when/why`
        );
      }
    }
  }
});

test('chaque fiche du catalogue a son emplacement dans la page', () => {
  // Le lien d'une branche vise `#doc-<id>` ; sans emplacement correspondant,
  // il ne mène nulle part et l'échec est silencieux.
  const slots = [...INDEX_HTML.matchAll(/data-snippet="([\w-]+)"/g)].map(
    m => m[1]
  );
  const ids = CATALOGUE.components.map(c => c.id);

  assert.deepEqual(
    ids.filter(id => !slots.includes(id)),
    [],
    'ces fiches n’ont pas d’emplacement `data-snippet` : leurs pièges ne s’afficheraient pas'
  );
  assert.deepEqual(
    slots.filter(id => !ids.includes(id)),
    [],
    'ces emplacements n’ont pas de fiche : la section reste sans pièges ni note a11y'
  );
});

test('le catalogue est chargé avant le script qui le lit', () => {
  const cat = INDEX_HTML.indexOf('catalogue.js');
  // `?v=<empreinte>` suit le nom depuis le lot E (cohérence du cache).
  const main = INDEX_HTML.search(/src="showroom\.js(\?v=[0-9a-f]+)?"/);
  assert.ok(cat !== -1, 'catalogue.js non référencé par index.html');
  assert.ok(cat < main, 'showroom.js lirait un catalogue non défini');

  // Tout ce qui est engendré doit l'être au chargement (renderGenerated) ET
  // à CHAQUE changement de langue, qui ne rejoue que le texte (retranslate).
  const chargement = SHOWROOM_JS.slice(
    SHOWROOM_JS.indexOf('function renderGenerated'),
    SHOWROOM_JS.indexOf('setupSheet();')
  );
  const langue = SHOWROOM_JS.slice(
    SHOWROOM_JS.indexOf('function retranslate'),
    SHOWROOM_JS.indexOf('function renderGenerated')
  );
  for (const fn of [
    'renderComponentDocs()',
    'renderDecisions()',
    'renderHooks()',
    'renderCatalogueFilters()',
    'renderCatalogueIndex()',
  ]) {
    assert.ok(chargement.includes(fn), `${fn} hors de renderGenerated`);
    assert.ok(
      langue.includes(fn),
      `${fn} hors de retranslate : le bloc resterait en français`
    );
  }
});

test('une custom property se copie sous sa forme utilisable', () => {
  // Coller `--x` dans une déclaration REDÉFINIT la variable au lieu de la
  // lire. Ce qu'on copie doit marcher sans retouche.
  assert.match(
    SHOWROOM_JS,
    /indexOf\('--'\) === 0 \? 'var\(' \+ raw \+ '\)' : raw/,
    'les tokens ne sont plus copiés en var(--x)'
  );
});
