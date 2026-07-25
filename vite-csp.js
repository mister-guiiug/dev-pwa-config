/**
 * Plugin Vite — injecte une Content-Security-Policy (défense en profondeur) dans
 * le <head> de index.html, avec `script-src` par HASH SHA-256 des scripts inline
 * (pas de 'unsafe-inline' en production).
 *
 * En PROD : script-src = 'self' + hash SHA-256 de CHAQUE <script> inline SANS
 * attribut (typiquement le script anti-FOUC), + hôtes supplémentaires éventuels.
 * En DEV  : script-src = 'self' 'unsafe-inline' — le préambule Fast Refresh inline
 * de @vitejs/plugin-react n'est pas hashable.
 *
 * Le hash est recalculé à partir du HTML FINAL (order:'post') : il reste correct
 * si le script change, ou si un autre plugin (SEO/analytics) injecte des scripts
 * inline en amont — d'où l'ordre 'post' et le placement APRÈS pwaSeoPlugin.
 * Les fins de ligne sont normalisées CRLF→LF : un build Windows produirait sinon
 * un hash différent de celui que le navigateur calcule (il normalise en LF).
 *
 * Ne matche que `<script>` sans attribut : les `<script src>`, `<script type=...>`
 * (modules, JSON-LD) ne sont pas concernés par un hash inline et sont ignorés.
 *
 * Usage (vite.config.ts) :
 *   import { cspPlugin } from '@mister-guiiug/dev-wpa-config/vite-csp';
 *   export default defineConfig(({ command }) => ({
 *     plugins: [
 *       react(), tailwindcss(), pwaSeoPlugin({ ... }),
 *       cspPlugin({
 *         dev: command === 'serve',
 *         connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
 *       }),
 *       VitePWA({ ... }),
 *     ],
 *   }));
 *
 * Si un <meta http-equiv="Content-Security-Policy"> statique existe déjà dans
 * index.html, il est REMPLACÉ (le plugin devient la source unique) ; sinon la
 * balise est insérée juste après <meta charset>.
 */
import { createHash } from 'node:crypto';

const CSP_META_RE = /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i;
const CHARSET_RE = /<meta\s+charset=["'][^"']*["']\s*\/?>/i;

/** Hash CSP d'un contenu de script inline (fins de ligne normalisées LF). */
function sha256(content) {
  return `'sha256-${createHash('sha256')
    .update(content.replace(/\r\n/g, '\n'))
    .digest('base64')}'`;
}

/**
 * @param {import('./vite-csp.js').CspOptions} [options]
 * @returns {import('vite').Plugin}
 */
export function cspPlugin(options = {}) {
  const {
    dev = false,
    connectSrc = ["'self'"],
    imgSrc = ["'self'", 'data:', 'blob:'],
    fontSrc = ["'self'", 'data:'],
    styleSrc = ["'self'", "'unsafe-inline'"],
    scriptSrc = [],
    extraDirectives = {},
  } = options;

  return {
    name: 'dwc-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          m => sha256(m[1] ?? '')
        );
        const scriptSrcValue = dev
          ? "'self' 'unsafe-inline'"
          : ["'self'", ...scriptSrc, ...hashes].join(' ');

        /** @type {Record<string, string>} */
        const directives = {
          'default-src': "'self'",
          'script-src': scriptSrcValue,
          'style-src': styleSrc.join(' '),
          'img-src': imgSrc.join(' '),
          'font-src': fontSrc.join(' '),
          'connect-src': connectSrc.join(' '),
          'manifest-src': "'self'",
          'worker-src': "'self'",
          'object-src': "'none'",
          'base-uri': "'self'",
          'form-action': "'self'",
          ...extraDirectives,
        };

        const content = Object.entries(directives)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => `${k} ${v}`)
          .join('; ');
        const meta = `<meta http-equiv="Content-Security-Policy" content="${content}" />`;

        if (CSP_META_RE.test(html)) return html.replace(CSP_META_RE, meta);
        if (CHARSET_RE.test(html)) {
          return html.replace(CHARSET_RE, m => `${m}\n    ${meta}`);
        }
        return html.replace(/<head>/i, `<head>\n    ${meta}`);
      },
    },
  };
}
