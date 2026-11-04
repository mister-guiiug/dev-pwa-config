// La fabrique Supabase lit l'environnement Vite QUAND L'APP NE LE LUI PASSE PAS.
//
// Ce n'est pas un test de la logique (supabase-client.test.mjs s'en charge), c'est la
// preuve du fait sur lequel repose le défaut : dans un bundle construit par Vite, le
// `import.meta.env` du socle est bien l'objet de l'app, `VITE_*` compris. Sans ce
// fait, `envVite()` rendrait `{}`, la fabrique se croirait sans configuration, et la
// panne de miss-arcade (« configuration manquante » au clic sur « Recevoir un lien »,
// alors que l'adresse était dans le bundle) reviendrait sans que rien ne le dise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const ICI = dirname(fileURLToPath(import.meta.url));
const MODULE = join(ICI, '..', 'supabase-client.js').replace(/\\/g, '/');

async function construire(entree, env) {
  const racine = mkdtempSync(join(tmpdir(), 'socle-supabase-env-'));
  try {
    writeFileSync(join(racine, 'entree.js'), entree);
    writeFileSync(
      join(racine, '.env'),
      Object.entries(env)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n'
    );
    const sortie = await build({
      root: racine,
      envDir: racine,
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        lib: {
          entry: join(racine, 'entree.js'),
          formats: ['es'],
          fileName: 'entree',
        },
        // Le SDK n'est chargé qu'au premier `getClient()`, que ce test n'appelle pas.
        rollupOptions: { external: ['@supabase/supabase-js'] },
      },
    });
    // Pas d'assertion sur le texte du bundle : les commentaires du module citent
    // `import.meta.env`, et c'est le comportement qui fait la preuve.
    const code = (Array.isArray(sortie) ? sortie[0] : sortie).output[0].code;
    return import(
      `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

test('dans un bundle Vite, la fabrique lit VITE_SUPABASE_* sans qu’on lui passe env', async () => {
  const m = await construire(
    [
      `import { createSupabaseClientFactory } from ${JSON.stringify(MODULE)};`,
      'export const parDefaut = createSupabaseClientFactory({ auth: { flowType: "pkce" } });',
      'export const explicite = createSupabaseClientFactory({ env: {} });',
    ].join('\n'),
    {
      VITE_SUPABASE_URL: 'https://exemple.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'cle-anon-de-test',
    }
  );
  assert.equal(m.parDefaut.isConfigured(), true);
  assert.deepEqual(m.parDefaut.missing(), []);
  // Un `env` passé l'emporte toujours sur celui du bundle.
  assert.equal(m.explicite.isConfigured(), false);
  assert.deepEqual(m.explicite.missing(), [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]);
});

test('dans un bundle Vite sans les variables, la fabrique dit ce qui manque', async () => {
  const m = await construire(
    [
      `import { createSupabaseClientFactory } from ${JSON.stringify(MODULE)};`,
      'export const f = createSupabaseClientFactory();',
    ].join('\n'),
    { VITE_AUTRE: 'x' }
  );
  assert.equal(m.f.isConfigured(), false);
  assert.deepEqual(m.f.missing(), [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]);
});
