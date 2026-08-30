/**
 * iCalendar (RFC 5545) — l'agenda que quatre apps ont réécrit chacune de son
 * côté, et jamais tout à fait de la même façon.
 *
 * LES QUATRE PROVENANCES, ET CE QUE CHACUNE APPORTE OU RATE :
 *
 *   - `bac-sable/src/shared/lib/ics.ts` — la plus propre, et la seule testée :
 *     dates UTC, pliage compté en OCTETS, `DTSTAMP` calculé une fois. C'est
 *     l'ossature de ce module.
 *   - `mister-footcoach/src/utils/ical.ts` — heures LOCALES FLOTTANTES,
 *     `STATUS` (un match annulé reste au calendrier, barré), et une fin
 *     calculée depuis une durée en minutes. Ni pliage, ni `DTSTAMP`.
 *   - `miss-uwh/src/features/export/icalExport.ts` — journées entières depuis
 *     des dates ISO, `DTEND` au lendemain, et surtout `DTSTAMP` INJECTABLE :
 *     un export déterministe est un export testable. Son pliage, lui, compte
 *     les caractères — il coupe les accents en deux.
 *   - `mister-doc/supabase/functions/calendar/index.ts` — le flux d'abonnement :
 *     `METHOD`, `X-WR-TIMEZONE`, `REFRESH-INTERVAL`, `CATEGORIES`, `TRANSP`, et
 *     des créneaux de nuit qui franchissent minuit. Ni pliage, et un `DTSTAMP`
 *     recalculé à chaque événement — deux horodatages différents dans un même
 *     fichier engendré d'un seul coup.
 *
 * SEPT CHOSES QUI CASSENT CHEZ L'UTILISATEUR, PAS CHEZ LE DÉVELOPPEUR :
 *
 * 1. **Trois façons d'écrire une date, et le choix n'est pas cosmétique.**
 *    `20260510T100000Z` est un INSTANT (UTC) ; `20260510T100000` est une heure
 *    FLOTTANTE — 10 h là où on la lit, quel que soit le fuseau ; `20260510`
 *    est une JOURNÉE. Un entraînement à 18 h est flottant : il reste à 18 h
 *    pour le parent en déplacement. Un créneau de garde partagé entre fuseaux
 *    est un instant. Écrire l'un pour l'autre décale l'agenda de deux heures
 *    six mois par an, et seulement chez ceux qui voyagent.
 *
 * 2. **Le `DTEND` d'une journée entière est EXCLUSIF.** Un événement « le
 *    31 janvier » finit le 1er février. Écrire le 31 des deux côtés produit
 *    une durée nulle qu'une partie des clients n'affiche pas du tout — c'est
 *    pour ça que `miss-uwh` et `mister-doc` calculent tous les deux un
 *    lendemain à la main. Ici, c'est le défaut.
 *
 * 3. **Le pliage se compte en OCTETS** (§3.1), exactement comme en vCard
 *    (RFC 6350 §3.2) : c'est le MÊME texte de RFC, donc la MÊME fonction —
 *    `foldLine` vient de `./vcard.js` plutôt que d'être réécrite une
 *    cinquième fois. Un pliage qui compte les caractères coupe un « é » en
 *    deux et le client importe le mojibake sans broncher. Pour un agenda
 *    français, ce n'est pas un cas limite.
 *
 * 4. **`DTSTAMP` est OBLIGATOIRE** (§3.6.1) et doit être le MÊME pour tout un
 *    fichier : c'est la date de FABRICATION, pas celle de l'événement. Il est
 *    injectable — sans quoi deux exports identiques diffèrent d'un octet et
 *    aucun test ne peut comparer.
 *
 * 5. **Un `UID` stable MET À JOUR, un `UID` instable DUPLIQUE.** Réimporter le
 *    même agenda doit corriger les événements, pas en créer une seconde
 *    collection. C'est la seule propriété dont la valeur doit survivre aux
 *    versions de l'app.
 *
 * 6. **`URL` n'est PAS une valeur texte** (§3.3.13) : y échapper la virgule
 *    casse le lien. Trois des quatre sources échappent tout indistinctement.
 *
 * 7. **L'arithmétique de fin en heure LOCALE saute avec l'heure d'été.** Une
 *    séance à 01 h 30 + 60 min, la nuit du changement d'heure, tombe à 03 h 30
 *    avec `new Date(y, m, d, h, min + durée)`. La CI tourne en UTC et ne le
 *    voit jamais. Ici l'arithmétique d'une heure flottante se fait sur le
 *    cadran, pas sur un instant.
 *
 * CE QUE ÇA N'EST PAS. Pas de `RRULE` : aucune des quatre apps n'en émet — la
 * récurrence est dépliée en occurrences en amont, par le domaine. Pas de
 * `VALARM` : aucune non plus, et un rappel imposé par l'export est un rappel
 * que l'utilisateur n'a pas demandé. Pas de `VTIMEZONE` : décrire Europe/Paris
 * demande des blocs de règles à tenir à jour avec la base tz, alors que les
 * deux écritures qui marchent partout — UTC, ou flottant plus
 * `X-WR-TIMEZONE` — couvrent les quatre usages. Et pas de lecture complète :
 * `unfoldLines` et `unescapeText` suffisent à vérifier un aller-retour.
 *
 * SANS DÉPENDANCE, SANS DOM. Le résultat se télécharge avec `download.js` →
 * `downloadText(ics, 'agenda.ics', ICAL_MIME)`.
 */
import { foldLine, unfoldLines } from './vcard.js';

// Le pliage et le dépliage sont ceux de la vCard, au mot près de la RFC. On
// les RÉEXPORTE pour qu'une app qui écrit du `.ics` n'ait pas à importer un
// module de contacts pour plier ses lignes.
export { foldLine, unfoldLines };

const CRLF = '\r\n';

/** Le type MIME d'un `.ics`, pour `downloadText`. */
export const ICAL_MIME = 'text/calendar;charset=utf-8';

/**
 * `PRODID` par défaut. Il identifie le LOGICIEL qui a écrit le fichier, pas
 * l'app : une app qui veut le sien le passe en option (les quatre sources ont
 * chacune le leur).
 */
const DEFAULT_PRODID = '-//mister-guiiug//dev-wpa-config//FR';

/* ── Valeurs ───────────────────────────────────────────────────────────── */

/**
 * Échappe une valeur TEXTE (§3.3.11) : `\`, `;`, `,` et le retour à la ligne.
 *
 * L'ordre compte. La contre-oblique d'abord — sinon on échapperait celles
 * qu'on vient d'ajouter. Le retour à la ligne ensuite (il en ajoute une), les
 * séparateurs en dernier.
 *
 * Ce n'est pas de la cosmétique : la virgule et le point-virgule SÉPARENT des
 * valeurs, et un retour à la ligne non échappé termine la propriété — le texte
 * qui suit devient une propriété à part entière, ce qui rend un champ libre
 * capable d'injecter n'importe quoi dans l'agenda.
 *
 * @param {unknown} value
 */
export function escapeText(value) {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? icalDate(value) : String(value);
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * L'inverse : rend son texte à une valeur lue dans un `.ics`.
 *
 * `\N` compte comme `\n` — la RFC accepte les deux, et un générateur sur deux
 * écrit la majuscule.
 *
 * @param {unknown} text
 */
export function unescapeText(text) {
  return String(text ?? '').replace(/\\([\\;,nN])/g, (_match, char) =>
    char === 'n' || char === 'N' ? '\n' : char
  );
}

/**
 * Une valeur URI (§3.3.13) : on ne l'échappe PAS.
 *
 * Une virgule est légale dans une URL et `\,` la casse. Seuls les CR/LF
 * partent — eux injecteraient une propriété.
 *
 * @param {unknown} value
 */
function uriValue(value) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, '')
    .trim();
}

/* ── Dates ─────────────────────────────────────────────────────────────── */

/** Formats déjà iCalendar : on ne retouche pas ce qui est correct. */
const COMPACT_DATE = /^\d{8}$/;
const COMPACT_DATETIME = /^\d{8}T\d{6}Z?$/;
/** ISO sans heure : `2026-01-31`. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** ISO avec heure ET décalage explicite : un INSTANT, à résoudre en UTC. */
const ISO_ZONED =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
/** ISO avec heure et SANS décalage : une heure FLOTTANTE, gardée telle quelle. */
const ISO_LOCAL =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

const DAY_MS = 86_400_000;

/**
 * @param {number} value
 * @param {number} [size]
 */
function pad(value, size = 2) {
  return String(value).padStart(size, '0');
}

/**
 * Un `Date` est un INSTANT : il s'écrit en UTC, avec le `Z` qui le dit.
 *
 * @param {Date} date
 * @param {boolean} allDay
 */
function fromDate(date, allDay) {
  if (Number.isNaN(date.getTime())) return '';
  const day = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  if (allDay) return day;
  return `${day}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

/**
 * Normalise une date en valeur iCalendar : `20260131` (journée),
 * `20260510T100000` (heure flottante) ou `20260510T100000Z` (instant UTC).
 *
 * LE PIÈGE QUE ÇA DÉSAMORCE. `new Date('2026-01-31')` est minuit UTC, mais
 * `new Date('2026-01-31T00:00')` est minuit LOCAL : la même date écrite de
 * deux façons donne deux jours différents à l'ouest de Greenwich. Une chaîne
 * de date ne passe donc JAMAIS par `Date` ici — c'est le contournement que
 * `miss-uwh` écrit à la main (`new Date(\`${iso}T00:00:00Z\`)`).
 *
 * Le résultat se lit à sa LONGUEUR : 8 caractères = une journée entière, donc
 * `VALUE=DATE`.
 *
 * @param {unknown} value date ISO, horodatage ISO, valeur iCalendar, `Date` ou ms
 * @param {{ allDay?: boolean }} [options] force la troncature à la journée
 */
export function icalDate(value, options = {}) {
  const allDay = options.allDay === true;
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) return fromDate(value, allDay);
  if (typeof value === 'number') return fromDate(new Date(value), allDay);

  const text = String(value).trim();

  if (COMPACT_DATE.test(text)) return text;
  if (COMPACT_DATETIME.test(text)) return allDay ? text.slice(0, 8) : text;

  const isoDate = ISO_DATE.exec(text);
  if (isoDate) return `${isoDate[1]}${isoDate[2]}${isoDate[3]}`;

  // Un décalage explicite est une INSTRUCTION : `+02:00` veut dire « cet
  // instant-là », pas « ce cadran-là ». On le résout, on écrit du UTC.
  if (ISO_ZONED.test(text)) return fromDate(new Date(text), allDay);

  const isoLocal = ISO_LOCAL.exec(text);
  if (isoLocal) {
    const day = `${isoLocal[1]}${isoLocal[2]}${isoLocal[3]}`;
    if (allDay) return day;
    return `${day}T${isoLocal[4]}${isoLocal[5]}${isoLocal[6] ?? '00'}`;
  }

  // Dernier recours : ce que `Date` sait lire. Une entrée illisible rend une
  // chaîne vide, jamais `Invalid Date` écrit dans le fichier.
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : fromDate(parsed, allDay);
}

/**
 * Une valeur de 8 caractères est une journée entière (`VALUE=DATE`).
 *
 * @param {string} stamp
 */
function isDateValue(stamp) {
  return stamp.length === 8;
}

/**
 * Décale une valeur iCalendar, EN CONSERVANT sa nature.
 *
 * L'arithmétique se fait sur le cadran (UTC), même pour une heure flottante :
 * c'est ce qui évite le saut d'heure d'été de `new Date(y, m, d, h, min + n)`.
 * Une journée entière décalée d'un nombre entier de jours reste une journée ;
 * décalée de minutes, elle devient un horodatage à partir de minuit.
 *
 * @param {string} stamp
 * @param {number} ms
 */
function shift(stamp, ms) {
  const text = String(stamp ?? '');
  if (text.length < 8) return '';
  const dateOnly = isDateValue(text);
  const zulu = text.endsWith('Z');
  const base = Date.UTC(
    Number(text.slice(0, 4)),
    Number(text.slice(4, 6)) - 1,
    Number(text.slice(6, 8)),
    dateOnly ? 0 : Number(text.slice(9, 11)),
    dateOnly ? 0 : Number(text.slice(11, 13)),
    dateOnly ? 0 : Number(text.slice(13, 15))
  );
  const moved = new Date(base + ms);
  if (Number.isNaN(moved.getTime())) return '';
  const day = `${moved.getUTCFullYear()}${pad(moved.getUTCMonth() + 1)}${pad(moved.getUTCDate())}`;
  if (dateOnly && ms % DAY_MS === 0) return day;
  return `${day}T${pad(moved.getUTCHours())}${pad(moved.getUTCMinutes())}${pad(moved.getUTCSeconds())}${zulu ? 'Z' : ''}`;
}

/**
 * Ajoute des minutes à une valeur iCalendar (franchit l'heure, le jour, le
 * mois et l'année). Remplace le `icalEnd` de `mister-footcoach`, sans son
 * saut d'heure d'été.
 *
 * @param {unknown} value
 * @param {number} minutes
 */
export function addMinutes(value, minutes) {
  return shift(icalDate(value), Math.round(minutes * 60_000));
}

/**
 * Ajoute des jours. Remplace les `nextDay` de `miss-uwh` et `mister-doc`.
 *
 * @param {unknown} value
 * @param {number} days
 */
export function addDays(value, days) {
  return shift(icalDate(value), Math.round(days) * DAY_MS);
}

/**
 * `DTSTAMP` DOIT être en UTC (§3.8.7.2) : une date de fabrication flottante
 * n'a aucun sens. Ce qui n'a pas de `Z` en reçoit un.
 *
 * @param {unknown} value
 */
function utcStamp(value) {
  const stamp = icalDate(value);
  if (stamp === '') return fromDate(new Date(), false);
  if (isDateValue(stamp)) return `${stamp}T000000Z`;
  return stamp.endsWith('Z') ? stamp : `${stamp}Z`;
}

/* ── UID ───────────────────────────────────────────────────────────────── */

/**
 * Empreinte FNV-1a 32 bits, en base 36.
 *
 * Sert UNIQUEMENT de repli quand l'appelant n'a pas d'identifiant : un `UID`
 * tiré au hasard changerait à chaque export et dupliquerait tout l'agenda à
 * chaque réimport. Dérivé du contenu, il est au moins STABLE.
 *
 * @param {string} text
 */
function fingerprint(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/**
 * @param {unknown} uid
 * @param {string|undefined} domain
 * @param {string} fallbackSeed
 */
function resolveUid(uid, domain, fallbackSeed) {
  const text = String(uid ?? '').trim();
  const base = text === '' ? `evt-${fingerprint(fallbackSeed)}` : text;
  // Le domaine ne s'ajoute qu'une fois : `bac-sable`, `miss-uwh` et
  // `mister-doc` le collent eux-mêmes, `mister-footcoach` le met déjà dans
  // l'identifiant. Les deux styles doivent pouvoir migrer sans se retrouver
  // avec `id@app@app`.
  if (!domain || base.includes('@')) return base;
  return `${base}@${domain}`;
}

/* ── Événement ─────────────────────────────────────────────────────────── */

/**
 * @param {import('./ical.js').IcalEvent} event
 * @param {{ dtstamp: string, uidDomain?: string }} context
 */
function eventLines(event, context) {
  const source = event ?? /** @type {import('./ical.js').IcalEvent} */ ({});
  const summary = source.summary ?? '';
  const start = icalDate(source.start, { allDay: source.allDay === true });
  const dateOnly = start !== '' && isDateValue(start);

  let end =
    source.end === undefined || source.end === null || source.end === ''
      ? ''
      : icalDate(source.end, { allDay: dateOnly });

  const duration = source.durationMinutes;
  if (end === '' && typeof duration === 'number' && Number.isFinite(duration)) {
    // Sur une journée entière, une durée en minutes n'a pas de sens : on la
    // arrondit au jour SUPÉRIEUR plutôt que de l'ignorer en silence.
    end = dateOnly
      ? addDays(start, Math.max(1, Math.ceil(duration / 1440)))
      : addMinutes(start, duration);
  }
  // Journée entière sans fin : le lendemain, parce que `DTEND` est EXCLUSIF.
  if (end === '' && dateOnly) end = addDays(start, 1);

  const categories = Array.isArray(source.categories)
    ? source.categories
    : source.categories
      ? [source.categories]
      : [];

  const lines = ['BEGIN:VEVENT'];
  lines.push(
    `UID:${escapeText(resolveUid(source.uid, context.uidDomain, `${start}|${summary}`))}`
  );
  lines.push(`DTSTAMP:${context.dtstamp}`);
  if (start) {
    lines.push(dateOnly ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`);
  }
  if (end) {
    lines.push(dateOnly ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`);
  }
  lines.push(`SUMMARY:${escapeText(summary)}`);
  if (source.description) {
    lines.push(`DESCRIPTION:${escapeText(source.description)}`);
  }
  if (source.location) lines.push(`LOCATION:${escapeText(source.location)}`);
  if (source.url) lines.push(`URL:${uriValue(source.url)}`);
  if (categories.length > 0) {
    // Les valeurs multiples se séparent par une virgule NON échappée : c'est
    // pour ça que la virgule est échappée DANS chaque valeur.
    lines.push(`CATEGORIES:${categories.map(escapeText).join(',')}`);
  }
  if (source.status) {
    lines.push(`STATUS:${String(source.status).toUpperCase()}`);
  }
  if (source.transparent) {
    // Un créneau que l'on OBSERVE (les gardes d'un collègue, le calendrier de
    // l'équipe) ne doit pas remplir sa propre disponibilité : sans ça, un mois
    // d'abonnement affiche un agenda entièrement occupé.
    lines.push('TRANSP:TRANSPARENT');
  }
  lines.push('END:VEVENT');
  return lines;
}

/**
 * Un `VEVENT` seul, plié et terminé par CRLF.
 *
 * Exporté parce que `mister-doc` compose ses événements un par un avant de les
 * assembler : la migration se fait alors propriété par propriété, sans
 * réécrire la boucle.
 *
 * @param {import('./ical.js').IcalEvent} event
 * @param {{ dtstamp?: unknown, uidDomain?: string }} [options]
 */
export function toIcalEvent(event, options = {}) {
  const context = {
    dtstamp: utcStamp(options.dtstamp ?? new Date()),
    uidDomain: options.uidDomain,
  };
  return (
    eventLines(event, context)
      .map(line => foldLine(line))
      .join(CRLF) + CRLF
  );
}

/* ── Calendrier ────────────────────────────────────────────────────────── */

/**
 * Un fichier `.ics` complet.
 *
 * `VERSION` et `PRODID` sont OBLIGATOIRES (§3.6) — un `VCALENDAR` sans l'un
 * des deux est refusé par les lecteurs stricts et accepté par les autres, ce
 * qui est la pire des deux situations pour le déboguer.
 *
 * @param {readonly any[]} events
 * @param {import('./ical.js').IcalendarOptions<any>} [options]
 */
export function toIcalendar(events, options = {}) {
  const {
    name,
    prodId = DEFAULT_PRODID,
    method,
    timeZone,
    refreshInterval,
    uidDomain,
    map,
  } = options;
  // Un SEUL horodatage pour tout le fichier : c'est la date de fabrication.
  const dtstamp = utcStamp(options.dtstamp ?? new Date());

  const head = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${escapeText(prodId)}`,
    'CALSCALE:GREGORIAN',
  ];
  // `METHOD` n'est pas décoratif : `PUBLISH` annonce un flux à consulter,
  // `REQUEST` une INVITATION — Outlook affiche alors « Accepter / Refuser »
  // sur un simple export de planning.
  if (method) head.push(`METHOD:${String(method).toUpperCase()}`);
  // `X-WR-*` ne sont pas dans la RFC : ce sont les extensions qu'Apple a
  // imposées par l'usage et que tout le monde honore. Sans `X-WR-CALNAME`, le
  // calendrier importé porte le nom du fichier.
  if (name) head.push(`X-WR-CALNAME:${escapeText(name)}`);
  // Le fuseau d'interprétation des heures FLOTTANTES du flux — la seule
  // alternative praticable à un bloc `VTIMEZONE` complet.
  if (timeZone) head.push(`X-WR-TIMEZONE:${escapeText(timeZone)}`);
  if (refreshInterval) {
    // La même durée, deux fois : la propriété RFC 7986 et l'extension
    // historique. Les clients n'honorent pas tous la même.
    head.push(`REFRESH-INTERVAL;VALUE=DURATION:${refreshInterval}`);
    head.push(`X-PUBLISHED-TTL:${refreshInterval}`);
  }

  const body = [...(events ?? [])]
    .map(item => toIcalEvent(map ? map(item) : item, { dtstamp, uidDomain }))
    .join('');

  return (
    head.map(line => foldLine(line)).join(CRLF) +
    CRLF +
    body +
    'END:VCALENDAR' +
    CRLF
  );
}
