// Socle cartographique : parties PURES (sources de tuiles, CSP, cache, clustering)
// testées ici. Les adaptateurs ont besoin d'un DOM et, pour MapLibre, de WebGL :
// leur montage réel est exercé par les E2E des apps consommatrices ; on vérifie
// seulement ici qu'ils se chargent et respectent la forme du port.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setupDom } from './helpers/dom.mjs';
import {
  CLUSTER_ID_PREFIX,
  cellSizeForZoom,
  clusterByGrid,
  clustersToMarkers,
  isClusterId,
  mapCspDirectives,
  mapTileRuntimeCaching,
  osmRasterTiles,
  tileSourceHosts,
  vectorTiles,
} from '../map/index.js';

test('osmRasterTiles : gabarit, attribution obligatoire, surcharges', () => {
  const tiles = osmRasterTiles();
  assert.equal(tiles.kind, 'raster');
  assert.match(tiles.url, /\{z\}\/\{x\}\/\{y\}/);
  assert.match(tiles.attribution, /OpenStreetMap/);
  assert.equal(osmRasterTiles({ maxZoom: 17 }).maxZoom, 17);
});

test('vectorTiles : refuse une URL vide ou porteuse d’une clé d’API', () => {
  assert.throws(() => vectorTiles(''), /URL de style manquante/);
  assert.throws(
    () => vectorTiles('https://exemple.test/style.json?api_key=abc'),
    /clé d’API/
  );
  assert.throws(
    () => vectorTiles('https://exemple.test/style.json?access_token=xyz'),
    /clé d’API/
  );
  const style = vectorTiles('https://exemple.test/styles/liberty');
  assert.equal(style.kind, 'vector');
});

test('tileSourceHosts : origine seule, gabarit ignoré, doublons fusionnés', () => {
  assert.deepEqual(tileSourceHosts(osmRasterTiles()), [
    'https://tile.openstreetmap.org',
  ]);
  const multi = osmRasterTiles({
    extraHosts: ['https://tile.openstreetmap.org', 'https://sprites.test'],
  });
  assert.deepEqual(tileSourceHosts(multi), [
    'https://tile.openstreetmap.org',
    'https://sprites.test',
  ]);
});

test('mapCspDirectives : hôtes dans connect-src ET img-src', () => {
  // MapLibre charge par fetch (connect-src), Leaflet par <img> (img-src) :
  // les deux directives sont nécessaires pour être valable quel que soit le moteur.
  const { connectSrc, imgSrc } = mapCspDirectives(osmRasterTiles());
  assert.deepEqual(connectSrc, ['https://tile.openstreetmap.org']);
  assert.deepEqual(imgSrc, ['https://tile.openstreetmap.org']);
});

test('mapTileRuntimeCaching : motif borné à l’origine des tuiles', () => {
  const entry = mapTileRuntimeCaching(osmRasterTiles(), { maxEntries: 50 });
  assert.equal(entry.handler, 'CacheFirst');
  assert.equal(entry.options.expiration.maxEntries, 50);
  assert.ok(
    entry.urlPattern.test('https://tile.openstreetmap.org/7/64/45.png')
  );
  assert.ok(!entry.urlPattern.test('https://autre.test/7/64/45.png'));
  // Le point de « tile.openstreetmap.org » est échappé : pas de faux positif.
  assert.ok(!entry.urlPattern.test('https://tileXopenstreetmap.org/1/2/3.png'));
});

test('cellSizeForZoom : grille plus fine en zoomant, désactivée au-delà du seuil', () => {
  assert.ok(cellSizeForZoom(6) > cellSizeForZoom(10));
  assert.equal(cellSizeForZoom(15), 0);
  assert.equal(cellSizeForZoom(12, 12), 0);
});

test('clusterByGrid : regroupe les voisins, sépare les éloignés', () => {
  const points = [
    { id: 'a', coordinates: { lat: 45.78, lng: 4.85 }, item: 'a' },
    { id: 'b', coordinates: { lat: 45.781, lng: 4.851 }, item: 'b' },
    { id: 'c', coordinates: { lat: 48.85, lng: 2.35 }, item: 'c' },
  ];
  const clusters = clusterByGrid(points, 6);
  assert.equal(clusters.length, 2);
  const grouped = clusters.find(c => c.items.length === 2);
  assert.ok(grouped, 'les deux points lyonnais sont regroupés');
  // Centre = moyenne du groupe.
  assert.ok(Math.abs(grouped.coordinates.lat - 45.7805) < 1e-6);
});

test('clusterByGrid : au-delà du seuil, chaque point reste distinct', () => {
  const points = [
    { id: 'a', coordinates: { lat: 45.78, lng: 4.85 }, item: 'a' },
    { id: 'b', coordinates: { lat: 45.7801, lng: 4.8501 }, item: 'b' },
  ];
  assert.equal(clusterByGrid(points, 16).length, 2);
});

test('clustersToMarkers : identité préservée seul, compté en groupe', () => {
  const single = clustersToMarkers(
    [
      {
        coordinates: { lat: 45.78, lng: 4.85 },
        items: [
          { id: 'p1', coordinates: { lat: 45.78, lng: 4.85 }, item: 'Parc' },
        ],
      },
    ],
    input => input.item
  );
  assert.equal(single[0].id, 'p1');
  assert.equal(single[0].label, 'Parc');
  assert.equal(single[0].count, undefined);
  assert.equal(isClusterId(single[0].id), false);

  const group = clustersToMarkers([
    {
      coordinates: { lat: 45.78, lng: 4.85 },
      items: [
        { id: 'p1', coordinates: { lat: 45.78, lng: 4.85 }, item: 1 },
        { id: 'p2', coordinates: { lat: 45.781, lng: 4.851 }, item: 2 },
      ],
    },
  ]);
  assert.equal(group[0].count, 2);
  assert.ok(group[0].id.startsWith(CLUSTER_ID_PREFIX));
  assert.equal(isClusterId(group[0].id), true);
});

for (const [nom, chemin] of [
  ['Leaflet', '../map/leaflet.js'],
  ['MapLibre', '../map/maplibre.js'],
]) {
  test(`adaptateur ${nom} : importable sans DOM et conforme au port`, async () => {
    // Les moteurs sont chargés paresseusement, AU MONTAGE : les modules
    // restent donc importables côté serveur (SSR) et testables ici sans DOM.
    // Le montage réel (WebGL, tuiles) est exercé par les E2E des apps.
    const mod = await import(chemin);
    const factory = Object.values(mod)[0];
    const provider = factory();
    for (const method of [
      'mount',
      'setMarkers',
      'panTo',
      'getViewport',
      'destroy',
    ]) {
      assert.equal(typeof provider[method], 'function', `${nom}.${method}`);
    }
    assert.equal(provider.getViewport(), null, 'aucune vue avant montage');
    // Les méthodes hors montage sont inoffensives (pas de crash au premier rendu).
    assert.doesNotThrow(() => provider.setMarkers([]));
    assert.doesNotThrow(() => provider.panTo({ lat: 0, lng: 0 }));
    assert.doesNotThrow(() => provider.destroy());
  });
}

test('Leaflet refuse explicitement une source vectorielle', async () => {
  const { createLeafletMapProvider } = await import('../map/leaflet.js');
  assert.throws(
    () =>
      createLeafletMapProvider({
        tiles: vectorTiles('https://exemple.test/style.json'),
      }),
    /raster/
  );
});

test('MapLibre : la résolution du worker est câblée (bug production)', async () => {
  // Garde-fou de non-régression : sans `setWorkerUrl` + l'import `?worker&url`,
  // MapLibre cherche un worker que le bundler n'émet pas → carte morte en
  // production alors que tout fonctionne en développement.
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'map', 'maplibre.js'),
    'utf8'
  );
  assert.match(source, /setWorkerUrl\(/, 'setWorkerUrl doit être appelé');
  assert.match(
    source,
    /maplibre-gl-worker\.mjs\?worker&url/,
    'l’URL du worker doit venir d’un asset empaqueté par le bundler'
  );
});

test('pwaSeoPlugin sort /map/maplibre du pré-bundling', async () => {
  // Sans cette exclusion, `vite dev` échoue au démarrage sur
  // [UNLOADABLE_DEPENDENCY] : le pré-bundling ne sait pas interpréter le
  // suffixe `?worker&url` par lequel l'adaptateur résout son worker. Le build
  // de production, lui, fonctionne — d'où un piège invisible d'un seul côté.
  // L'exclusion vit dans le plugin qui portait déjà celle de
  // `react/observability` : même famille de panne, même endroit.
  const { pwaSeoPlugin } = await import('../vite-pwa-base.js');
  const excluded = pwaSeoPlugin().config().optimizeDeps.exclude;
  assert.ok(
    excluded.includes('@mister-guiiug/dev-wpa-config/map/maplibre'),
    'l’adaptateur MapLibre doit être exclu du pré-bundling'
  );
  assert.ok(
    excluded.includes('@mister-guiiug/dev-wpa-config/react/observability'),
    'l’exclusion existante ne doit pas avoir été perdue'
  );
});

/* ── La vue initiale n'est pas un déplacement ──────────────────────────── */

/**
 * LE DÉFAUT, CONSTATÉ EN CI. Les deux adaptateurs annonçaient la vue INITIALE
 * par `onViewportChange` — `whenReady` côté Leaflet, `once('load')` côté
 * MapLibre. `mister-family-map` recopie ce callback dans le brouillon de son
 * assistant « ajouter un lieu » : sur un runner à WebGL logiciel, le `load` de
 * la carte tombait APRÈS la saisie, si bien que le centre par défaut (46.6 /
 * 2.4, le milieu de la France) écrasait les coordonnées tapées. La détection de
 * doublons cherchait alors à 400 km du lieu visé et ne proposait rien : le
 * parcours critique échouait trois fois sur trois, et seulement en CI.
 *
 * Une carte qui finit de s'initialiser n'a RIEN DÉPLACÉ. La vue initiale part
 * désormais par `onReady`.
 */
test('Leaflet : la vue initiale part par onReady, jamais par onViewportChange', async () => {
  const dom = setupDom();
  try {
    const { createLeafletMapProvider } = await import('../map/leaflet.js');
    const provider = createLeafletMapProvider();

    const container = document.createElement('div');
    // jsdom ne calcule aucune mise en page : sans dimensions, Leaflet monte une
    // carte de 0×0 et ne devient jamais prête.
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    document.body.appendChild(container);

    const seen = { moved: 0, ready: [] };
    await provider.mount(container, {
      center: { lat: 45.78, lng: 4.85 },
      zoom: 12,
      onViewportChange: () => {
        seen.moved += 1;
      },
      onReady: viewport => seen.ready.push(viewport),
    });
    await new Promise(resolve => setTimeout(resolve, 50));

    assert.equal(
      seen.moved,
      0,
      'la vue initiale a été annoncée comme un déplacement — c’est ce qui écrasait la saisie'
    );
    assert.equal(seen.ready.length, 1, 'onReady doit être appelé une fois');
    assert.equal(Math.round(seen.ready[0].center.lat * 100) / 100, 45.78);
    assert.equal(seen.ready[0].zoom, 12);

    provider.destroy();
  } finally {
    dom.restore();
  }
});

test('MapLibre : son gestionnaire de `load` n’émet pas de déplacement', () => {
  // jsdom n'a pas de WebGL : MapLibre ne peut pas être monté ici comme Leaflet
  // l'est ci-dessus. C'est donc la SOURCE du gestionnaire qui est vérifiée —
  // moins bien qu'un montage, mais la règle qu'il porte est la même, et un
  // retour en arrière serait rouge.
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'map', 'maplibre.js'),
    'utf8'
  );
  const start = source.indexOf("instance.once('load'");
  assert.notEqual(start, -1, 'gestionnaire de `load` introuvable');
  const handler = source.slice(start, source.indexOf('});', start));

  assert.ok(
    handler.includes('onReady'),
    'la vue initiale doit partir par onReady'
  );
  assert.ok(
    !handler.includes('onViewportChange'),
    'une carte qui finit de charger n’a rien déplacé'
  );
  // Et le déplacement, lui, reste bien branché sur `moveend`.
  assert.match(source, /instance\.on\('moveend'[\s\S]*?onViewportChange/);
});
