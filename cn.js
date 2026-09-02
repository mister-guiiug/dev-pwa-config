/**
 * Joint des classes CSS : les chaînes, les tableaux, les objets `{ classe:
 * condition }` — et rien pour le faux.
 *
 * PROMU, PAS INVENTÉ. `miss-genius` et `miss-uwh` portaient le même `cn.ts`
 * de cinq lignes, à la lettre (similarité 1,00) ; aucune app de la famille
 * n'a `clsx`. Cinq lignes ne valent pas un paquet, mais deux copies
 * identiques ne valent pas non plus d'être réécrites une troisième fois.
 *
 *   cn('card', isOpen && 'card--open', { 'card--busy': busy }, [extra])
 *   → 'card card--open card--busy extra'
 *
 * @param {...(string | number | false | null | undefined | Array<unknown> |
 *   Record<string, unknown>)} parts
 * @returns {string}
 */
export function cn(...parts) {
  const out = [];
  const push = part => {
    if (!part) return;
    if (typeof part === 'string' || typeof part === 'number') {
      out.push(String(part));
    } else if (Array.isArray(part)) {
      for (const inner of part) push(inner);
    } else if (typeof part === 'object') {
      for (const [name, on] of Object.entries(part)) if (on) out.push(name);
    }
  };
  for (const part of parts) push(part);
  return out.join(' ');
}
