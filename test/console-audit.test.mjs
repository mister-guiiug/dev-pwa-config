// Les parties pures de l'audit des console.* (`scripts/console-audit.mjs`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findConsoleCalls,
  isLoggerTransport,
  suggestLoggerName,
} from '../scripts/console-audit.mjs';

test('les appels sont trouvés avec leur niveau et leur ligne', () => {
  const source = [
    'const x = 1;',
    "console.error('échec');",
    "  console.warn('attention', detail);",
    "console.log('pas un niveau surveillé');",
  ].join('\n');
  const calls = findConsoleCalls(source);
  assert.deepEqual(
    calls.map(c => [c.line, c.level]),
    [
      [2, 'error'],
      [3, 'warn'],
    ]
  );
});

test('une ligne commentée n’est pas un appel', () => {
  const source = [
    "// console.error('désactivé');",
    " * console.warn('dans un bloc JSDoc');",
    "const url = 'https://x'; // console.error à droite d'un commentaire",
  ].join('\n');
  assert.deepEqual(findConsoleCalls(source), []);
});

test('le nom proposé vient de la feature, pas du fichier', () => {
  assert.equal(suggestLoggerName('src/features/favoris/store.ts'), 'favoris');
  assert.equal(
    suggestLoggerName('src/features/quotas/QuotasScreen.tsx'),
    'quotas'
  );
  // Sans feature : le dossier parlant le plus proche, sinon le fichier.
  assert.equal(suggestLoggerName('src/pages/ProfilePage.tsx'), 'pages');
  assert.equal(suggestLoggerName('src/api/client.ts'), 'client');
});

test('le transport du journal n’est pas un orphelin', () => {
  // C'est lui qui écrit dans la console EXPRÈS : le compter gonflerait le
  // chiffre et ferait « corriger » le correcteur.
  assert.equal(isLoggerTransport('src/shared/lib/logger.ts'), true);
  assert.equal(isLoggerTransport('src/observability/reporter.ts'), true);
  assert.equal(isLoggerTransport('src/register-sw.ts'), true);
  assert.equal(isLoggerTransport('src/features/favoris/store.ts'), false);
});
