/**
 * LA VUE DU CONSOMMATEUR, TYPÉE ICI — parce que le socle ne la voit pas.
 *
 * Les `.d.ts` du socle sont écrits à la main, et `npm run typecheck` ne compile
 * que le socle : il ne vérifie pas qu'une app PEUT se servir de ce qu'ils
 * déclarent. Le 06/11/2026, `googleFontsCaching()` était déclarée rendre
 * `Array<Record<string, unknown>>` : publiée en 6.32.0, elle a fait échouer le
 * `tsc -b` de sept apps (« not assignable to type 'RuntimeCaching[]' »), que
 * rien ici n'avait vu.
 *
 * Le socle ne dépend pas de Workbox ni de Rolldown : on vérifie contre un
 * MIROIR de ce qu'ils attendent. Une déclaration trop lâche (`unknown`,
 * `Record<string, unknown>`) n'y est pas assignable, et `typecheck` échoue.
 */
import type { googleFontsCaching, sentryChunkGroups } from '../vite-pwa.js';

/** `T` doit être assignable à `U`, sinon erreur de type ici. */
type Assignable<T extends U, U> = T;

/** Le minimum de `RuntimeCaching` (workbox-build) qu'une règle doit tenir. */
interface RuntimeCachingMiroir {
  urlPattern: RegExp | string | ((...args: never[]) => boolean);
  handler:
    | 'CacheFirst'
    | 'CacheOnly'
    | 'NetworkFirst'
    | 'NetworkOnly'
    | 'StaleWhileRevalidate';
  method?: string;
  options?: {
    cacheName?: string;
    expiration?: { maxEntries?: number; maxAgeSeconds?: number };
    cacheableResponse?: { statuses?: number[] };
  };
}

/** Le minimum d'un groupe `codeSplitting` (Rolldown). */
interface GroupeMiroir {
  name: string;
  test?: RegExp | string;
  priority?: number;
}

export type PolicesAssignables = Assignable<
  ReturnType<typeof googleFontsCaching>,
  RuntimeCachingMiroir[]
>;
export type GroupesAssignables = Assignable<
  ReturnType<typeof sentryChunkGroups>,
  GroupeMiroir[]
>;
