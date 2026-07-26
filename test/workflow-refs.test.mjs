// Garde-fou : toute référence interne à un workflow/action de CE dépôt (dans les
// reusables `.github/workflows` ET les templates de workflows) doit pointer sur
// le tag majeur mobile courant (`v<major>` de package.json). Sans ce test, une
// ref figée (`@v1`) sert le code d'une génération antérieure : les tags majeurs
// `v1`/`v2` sont GELÉS (publish.yml n'avance que le major courant), donc
// `setup-pwa@v1` diverge dès la première modification de l'action.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const major = `v${pkg.version.split('.')[0]}`;

// Capture toute ref `mister-guiiug/dev-wpa-config/<chemin>@vN` — `uses:` réels ET
// exemples en commentaire, qui doivent rester cohérents entre eux.
const REF_RE = /mister-guiiug\/dev-wpa-config\/[^@\s'"]+@(v\d+)/g;
const DIRS = ['.github/workflows', 'templates/github-workflows'];

test(`refs internes des workflows toutes alignées sur ${major}`, () => {
  const offenders = [];
  for (const dir of DIRS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const file of readdirSync(abs).filter(f => /\.ya?ml$/.test(f))) {
      const src = readFileSync(join(abs, file), 'utf8');
      for (const [, ref] of src.matchAll(REF_RE)) {
        if (ref !== major) offenders.push(`${dir}/${file} → @${ref}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `refs internes non alignées sur ${major} :\n  ${offenders.join('\n  ')}`
  );
});
