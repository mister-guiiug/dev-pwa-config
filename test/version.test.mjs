/**
 * La version côté client : lecture, comparaison, mémoire, sondage.
 *
 * CE QUI EST VERROUILLÉ ICI, et pourquoi chacun compte :
 *   1. l'ORDRE SemVer, préversions comprises — `1.0.0` > `1.0.0-rc.1`, sans
 *      quoi une release finale n'annoncerait jamais sa disponibilité ;
 *   2. l'ILLISIBLE NE DÉCLENCHE RIEN — une app sans version injectée
 *      annoncerait autrement une mise à jour à chaque sondage ;
 *   3. un ROLLBACK n'est pas une nouveauté ;
 *   4. un sondage raté rend `null` et ne lève JAMAIS ;
 *   5. le script inline ne peut pas refermer sa propre balise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BUILD_INFO_GLOBAL,
  VERSION_MANIFEST,
  buildInfoScript,
  buildInfoSource,
  compareVersions,
  fetchAppVersion,
  formatVersion,
  isNewerVersion,
  parseVersion,
  readBuildInfo,
  rememberVersion,
  versionContext,
} from '../version.js';

/** Un `Storage` minimal, suffisant pour ce que `rememberVersion` en attend. */
function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    get size() {
      return map.size;
    },
  };
}

test('parseVersion accepte le `v` des tags et refuse le reste', () => {
  assert.deepEqual(parseVersion('3.13.0'), {
    major: 3,
    minor: 13,
    patch: 0,
    prerelease: [],
    build: '',
    raw: '3.13.0',
  });
  assert.equal(parseVersion('v3.13.0')?.major, 3);
  assert.deepEqual(parseVersion('1.2.3-rc.1')?.prerelease, ['rc', '1']);
  assert.equal(parseVersion('1.2.3+abc')?.build, 'abc');

  for (const bad of ['', '3.13', 'trois', null, undefined, '3.13.0.1', {}]) {
    assert.equal(
      parseVersion(bad),
      null,
      `« ${String(bad)} » aurait dû être refusé`
    );
  }
});

test('compareVersions suit SemVer, préversions comprises', () => {
  assert.equal(compareVersions('3.13.0', '3.12.9'), 1);
  assert.equal(
    compareVersions('3.2.0', '3.10.0'),
    -1,
    'comparaison numérique, pas lexicale'
  );
  assert.equal(compareVersions('1.0.0', 'v1.0.0'), 0);
  // §11 : une version finale est POSTÉRIEURE à ses préversions.
  assert.equal(compareVersions('1.0.0', '1.0.0-rc.1'), 1);
  assert.equal(compareVersions('1.0.0-alpha', '1.0.0-beta'), -1);
  assert.equal(compareVersions('1.0.0-alpha.1', '1.0.0-alpha.beta'), -1);
  assert.equal(compareVersions('1.0.0-alpha', '1.0.0-alpha.1'), -1);
  // Les métadonnées de build ne participent pas à l'ordre.
  assert.equal(compareVersions('1.0.0+aaa', '1.0.0+zzz'), 0);
  // Une version illisible est la plus ancienne — jamais une exception.
  assert.equal(compareVersions('trois', '1.0.0'), -1);
  assert.equal(compareVersions('trois', 'quatre'), 0);
});

test('isNewerVersion exige DEUX versions lisibles', () => {
  assert.equal(isNewerVersion('3.14.0', '3.13.0'), true);
  assert.equal(isNewerVersion('3.13.0', '3.13.0'), false);
  assert.equal(isNewerVersion('3.12.0', '3.13.0'), false);
  // Le faux positif qui compte : sans version courante, aucune annonce.
  assert.equal(isNewerVersion('3.14.0', ''), false);
  assert.equal(isNewerVersion('', '3.13.0'), false);
});

test('formatVersion n’affiche jamais « undefined »', () => {
  assert.equal(formatVersion('3.13.0'), 'v3.13.0');
  assert.equal(formatVersion('v3.13.0', { prefix: '' }), '3.13.0');
  assert.equal(formatVersion('1.0.0-rc.1'), 'v1.0.0-rc.1');
  assert.equal(formatVersion('1.0.0+abc'), 'v1.0.0');
  assert.equal(formatVersion('1.0.0+abc', { build: true }), 'v1.0.0+abc');
  assert.equal(formatVersion(undefined), '');
  assert.equal(formatVersion('n’importe quoi'), '');
});

test('readBuildInfo ne lève pas et ne rend jamais undefined', () => {
  const empty = readBuildInfo();
  assert.deepEqual(empty, {
    version: '',
    buildTime: '',
    commit: '',
    shortCommit: '',
  });

  const info = readBuildInfo({
    version: ' 3.13.0 ',
    buildTime: '2026-08-26T07:54:00.000Z',
    commit: '104c944abcdef',
    extra: 'ignoré',
  });
  assert.equal(info.version, '3.13.0');
  assert.equal(info.shortCommit, '104c944');

  for (const bad of [null, 42, 'texte', [], { version: 12 }]) {
    assert.equal(readBuildInfo(bad).version, '', `${JSON.stringify(bad)}`);
  }
});

test('readBuildInfo lit le global posé par le plugin', () => {
  globalThis[BUILD_INFO_GLOBAL] = { version: '9.9.9', commit: 'abcdef01234' };
  try {
    assert.equal(readBuildInfo().version, '9.9.9');
    assert.equal(readBuildInfo().shortCommit, 'abcdef0');
  } finally {
    delete globalThis[BUILD_INFO_GLOBAL];
  }
});

test('versionContext omet les champs vides', () => {
  assert.deepEqual(versionContext({}), {});
  assert.deepEqual(versionContext({ version: '3.13.0' }), {
    version: '3.13.0',
  });
  assert.deepEqual(
    versionContext({ version: '1.0.0', buildTime: 'hier', commit: 'abc' }),
    { version: '1.0.0', buildTime: 'hier', commit: 'abc' }
  );
});

test('rememberVersion distingue première ouverture, montée et rollback', () => {
  const storage = memoryStorage();

  const first = rememberVersion('3.13.0', { storage });
  assert.deepEqual(first, {
    current: '3.13.0',
    previous: '',
    firstRun: true,
    changed: false,
    upgraded: false,
  });

  const again = rememberVersion('3.13.0', { storage });
  assert.equal(again.changed, false);
  assert.equal(again.previous, '3.13.0');

  const up = rememberVersion('3.14.0', { storage });
  assert.equal(up.previous, '3.13.0');
  assert.equal(up.changed, true);
  assert.equal(up.upgraded, true);

  // Un retour arrière a bien CHANGÉ, mais ne s'annonce pas comme une nouveauté.
  const down = rememberVersion('3.13.0', { storage });
  assert.equal(down.changed, true);
  assert.equal(down.upgraded, false);
});

test('rememberVersion survit à un stockage qui lève', () => {
  const hostile = {
    getItem() {
      throw new Error('bloqué');
    },
    setItem() {
      throw new Error('bloqué');
    },
  };
  const state = rememberVersion('3.13.0', { storage: hostile });
  assert.equal(state.current, '3.13.0');
  assert.equal(state.previous, '');
  assert.equal(state.firstRun, true);
});

test('rememberVersion sans version n’écrit rien', () => {
  const storage = memoryStorage();
  const state = rememberVersion('', { storage });
  assert.equal(state.firstRun, false);
  assert.equal(
    storage.size,
    0,
    'une version vide ne doit pas écraser la mémoire'
  );
});

test('fetchAppVersion lit le manifeste, sans cache', async () => {
  let seen = null;
  const found = await fetchAppVersion(VERSION_MANIFEST, {
    fetch: async (url, init) => {
      seen = { url, init };
      return new Response(
        JSON.stringify({ version: '3.14.0', commit: 'deadbee' }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });
  assert.equal(found?.version, '3.14.0');
  assert.equal(seen.url, 'version.json');
  // Sans `no-store`, la réponse mise en cache rendrait le sondage muet — ce
  // qui est exactement le défaut qu'il corrige.
  assert.equal(seen.init.cache, 'no-store');
  assert.equal(seen.init.credentials, 'omit');
});

test('fetchAppVersion rend null plutôt que de lever', async () => {
  const cases = {
    'HTTP 404': async () => new Response('', { status: 404 }),
    'JSON invalide': async () => new Response('pas du json', { status: 200 }),
    'réseau coupé': async () => {
      throw new Error('offline');
    },
    'manifeste sans version': async () =>
      new Response(JSON.stringify({ commit: 'abc' }), { status: 200 }),
  };
  for (const [nom, fetchImpl] of Object.entries(cases)) {
    assert.equal(
      await fetchAppVersion('version.json', { fetch: fetchImpl }),
      null,
      nom
    );
  }
  // Pas de `fetch` du tout (Node ancien, worker restreint) : null, pas TypeError.
  assert.equal(
    await fetchAppVersion('version.json', { fetch: undefined }),
    null
  );
});

test('fetchAppVersion abandonne au bout du délai', async () => {
  const found = await fetchAppVersion('version.json', {
    timeoutMs: 10,
    fetch: (url, init) =>
      new Promise((resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new Error('aborted'))
        );
      }),
  });
  assert.equal(found, null);
});

test('le script inline ne peut pas refermer sa propre balise', () => {
  const source = buildInfoSource({
    version: '1.0.0',
    commit: '</script><script>alert(1)',
  });
  assert.ok(!source.includes('</script>'), source);
  assert.match(buildInfoScript({ version: '1.0.0' }), /^<script>.*<\/script>$/);

  // Et ce qu'il pose est bien relisible par `readBuildInfo`.
  const posed = {};
  new Function(
    'globalThis',
    buildInfoSource({
      version: '3.13.0',
      buildTime: '2026-08-26T00:00:00.000Z',
    })
  )(posed);
  assert.equal(readBuildInfo(posed[BUILD_INFO_GLOBAL]).version, '3.13.0');
});
