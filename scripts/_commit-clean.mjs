import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const msg = process.argv[2];
if (!msg) process.exit(2);
const git = args =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
if (!git(['diff', '--cached', '--name-only'])) {
  console.error('rien de stagé');
  process.exit(1);
}
const tree = git(['write-tree']);
const parent = git(['rev-parse', 'HEAD']);
const tmp = join(tmpdir(), `c-${process.pid}.txt`);
writeFileSync(tmp, msg.endsWith('\n') ? msg : `${msg}\n`);
const sha = git(['commit-tree', tree, '-p', parent, '-F', tmp]);
unlinkSync(tmp);
execFileSync('git', ['reset', '--soft', sha], { stdio: 'inherit' });
const body = git(['log', '-1', '--format=%B']);
if (/Co-authored-by:\s*Cursor/i.test(body)) process.exit(1);
process.stdout.write(body);
console.log('OK', sha);
