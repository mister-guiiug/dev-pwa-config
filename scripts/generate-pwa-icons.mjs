#!/usr/bin/env node
/**
 * Générateur d'icônes PWA partagé pour la famille miss-* / mister-*.
 *
 * Remplace les `scripts/generate-pwa-icons.mjs` / `generate-icons.mjs` /
 * `generate-icons.ts` qui étaient dupliqués (et divergeaient) dans chaque projet.
 *
 * Prérequis consumer : `sharp` installé (peerDep optionnelle de dev-wpa-config).
 *
 * Usage (package.json) :
 *   "icons": "pwa-icons --source public/favicon.svg --out public --maskable"
 *
 * Options :
 *   --source <path>     Image source (SVG ou PNG). Défaut: public/favicon.svg
 *   --out <dir>         Dossier de sortie. Défaut: public
 *   --sizes <list>      Tailles PNG, séparées par des virgules.
 *                       Défaut: 96,144,192,256,384,512
 *   --maskable          Génère aussi icon-maskable.png (zone de sécurité 87,5%).
 *   --maskable-size <n> Taille du maskable. Défaut: 512
 *   --bg <r,g,b>        Couleur de fond (fit cover / maskable). Défaut: 12,18,34
 *   --prefix <str>      Préfixe des fichiers. Défaut: icon-
 *   --help              Affiche cette aide.
 *
 * Convention de nommage : <prefix><size>.png (ex. icon-192.png), plus
 * icon-maskable.png si --maskable.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = {
    source: 'public/favicon.svg',
    out: 'public',
    sizes: [96, 144, 192, 256, 384, 512],
    maskable: false,
    maskableSize: 512,
    bg: { r: 12, g: 18, b: 34, alpha: 1 },
    prefix: 'icon-',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--source':
        args.source = next();
        break;
      case '--out':
        args.out = next();
        break;
      case '--sizes':
        args.sizes = next()
          .split(',')
          .map(s => parseInt(s.trim(), 10))
          .filter(n => Number.isFinite(n) && n > 0);
        break;
      case '--maskable':
        args.maskable = true;
        break;
      case '--maskable-size':
        args.maskableSize = parseInt(next(), 10);
        break;
      case '--prefix':
        args.prefix = next();
        break;
      case '--bg': {
        const [r, g, b] = next()
          .split(',')
          .map(n => parseInt(n.trim(), 10));
        args.bg = { r, g, b, alpha: 1 };
        break;
      }
      default:
        console.warn(`⚠️  option inconnue ignorée : ${a}`);
    }
  }
  return args;
}

function printHelp() {
  const lines = readFileSync(new URL(import.meta.url))
    .toString()
    .split('\n');
  const start = lines.findIndex(l => l.startsWith('/**')) + 1;
  const end = lines.findIndex((l, i) => i > start && l.trim() === '*/');
  console.log(
    lines
      .slice(start, end)
      .map(l => l.replace(/^ \*?\s?/, ''))
      .join('\n')
  );
}

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default ?? mod;
  } catch {
    console.error(
      '❌ `sharp` est requis pour générer les icônes.\n' +
        '   Installez-le côté projet : npm install -D sharp'
    );
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sharp = await loadSharp();
  const sourcePath = resolve(process.cwd(), args.source);
  const outDir = resolve(process.cwd(), args.out);
  const svgBuffer = readFileSync(sourcePath);

  console.log(`🎨 Génération des icônes depuis ${args.source}`);

  for (const size of args.sizes) {
    const name = `${args.prefix}${size}.png`;
    await sharp(svgBuffer)
      .resize(size, size, { fit: 'cover', background: args.bg })
      .png()
      .toFile(resolve(outDir, name));
    console.log(`  ✓ ${name} (${size}×${size})`);
  }

  if (args.maskable) {
    const size = args.maskableSize;
    const safe = Math.round(size * 0.875); // zone de sécurité Android maskable
    const pad = Math.round((size - safe) / 2);
    const inner = await sharp(svgBuffer)
      .resize(safe, safe, {
        fit: 'contain',
        background: { ...args.bg, alpha: 0 },
      })
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: args.bg,
      },
    })
      .composite([{ input: inner, top: pad, left: pad }])
      .png()
      .toFile(resolve(outDir, 'icon-maskable.png'));
    console.log(`  ✓ icon-maskable.png (${size}×${size}, safe-zone 87.5%)`);
  }

  console.log('✨ Icônes générées.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
