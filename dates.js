/**
 * Outils de dates PURS : aucun formatage (voir `format.js`), aucune horloge
 * implicite — les fonctions reçoivent leurs `Date` et sont donc testables.
 *
 * PROMU, PAS INVENTÉ. Trois apps portaient chacune leur module dates :
 * `bac-sable` (arithmétique d'intervalles), `mister-footcoach` (affichage),
 * `mister-doc` (aller-retour ISO). L'arithmétique est ici ; l'affichage
 * reste dans `format.js`.
 */

/** Même jour civil (fuseau local). */
export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Minuit local du jour de `d` (nouvelle instance). */
export function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** 23:59:59.999 local du jour de `d` (nouvelle instance). */
export function endOfDay(d) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

/** `d` décalée de `days` jours (nouvelle instance ; `days` peut être négatif). */
export function addDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Deux intervalles fermés [aFrom, aTo] et [bFrom, bTo] se recouvrent-ils ? */
export function rangesOverlap(aFrom, aTo, bFrom, bTo) {
  return aFrom.getTime() <= bTo.getTime() && bFrom.getTime() <= aTo.getTime();
}

/**
 * `YYYY-MM-DD` en fuseau LOCAL — et non `toISOString()`, qui passe par UTC
 * et rend la veille après 22 h en France l'hiver.
 * @param {Date} d
 */
export function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * `Date` à minuit local depuis `YYYY-MM-DD`. `null` si la chaîne est
 * invalide — et non `Invalid Date`, qui contamine silencieusement les calculs.
 * @param {string} iso
 */
export function fromIsoDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) || d.getDate() !== Number(m[3]) ? null : d;
}
