// iCalendar (RFC 5545) — la promotion de QUATRE générateurs `.ics`.
//
// Ce fichier vérifie deux choses distinctes : que le module respecte la RFC
// là où les quatre sources divergeaient (pliage en octets, `DTEND` exclusif,
// `DTSTAMP` unique, `URL` non échappée), et que CHACUN des quatre usages
// existants passe — sinon la promotion n'en est pas une, c'est un cinquième
// générateur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ICAL_MIME,
  addDays,
  addMinutes,
  escapeText,
  foldLine,
  icalDate,
  toIcalEvent,
  toIcalendar,
  unescapeText,
  unfoldLines,
} from '../ical.js';

/** Horodatage figé : un export testable est un export déterministe. */
const DTSTAMP = '20260101T120000Z';

/** Les propriétés d'un `.ics`, dépliées puis découpées `NOM[;params]:valeur`. */
function properties(ics) {
  return unfoldLines(ics)
    .filter(line => line !== '')
    .map(line => {
      const colon = line.indexOf(':');
      const head = line.slice(0, colon);
      const semi = head.indexOf(';');
      return {
        name: semi === -1 ? head : head.slice(0, semi),
        params: semi === -1 ? '' : head.slice(semi + 1),
        value: line.slice(colon + 1),
      };
    });
}

/** La valeur d'une propriété, déséchappée — l'aller-retour complet. */
function valueOf(ics, name) {
  const found = properties(ics).find(p => p.name === name);
  return found ? unescapeText(found.value) : undefined;
}

/* ── Échappement (§3.3.11) ─────────────────────────────────────────────── */

test('les quatre caractères s’échappent, la contre-oblique EN PREMIER', () => {
  // Inverser l'ordre échapperait les contre-obliques qu'on vient d'ajouter.
  assert.equal(escapeText('a\\b;c,d\ne'), 'a\\\\b\\;c\\,d\\ne');
});

test('les trois écritures du retour à la ligne deviennent \\n', () => {
  // `mister-footcoach` ne traite que `\n` : un texte collé depuis Windows
  // laissait passer le CR, qui coupe la propriété chez le lecteur.
  assert.equal(escapeText('a\r\nb\rc\nd'), 'a\\nb\\nc\\nd');
});

test('null et undefined donnent une chaîne vide, pas « undefined »', () => {
  assert.equal(escapeText(null), '');
  assert.equal(escapeText(undefined), '');
});

test('unescapeText rend le texte d’origine, \\N compris', () => {
  const original = 'Soirée; tournoi, fin\nbuvette \\ cuisine';
  assert.equal(unescapeText(escapeText(original)), original);
  assert.equal(unescapeText('a\\Nb'), 'a\nb');
});

/* ── Pliage (§3.1) ─────────────────────────────────────────────────────── */

test('toute ligne d’un calendrier tient en 75 OCTETS', () => {
  const ics = toIcalendar(
    [
      {
        uid: 'long',
        summary: 'x'.repeat(300),
        description: 'é'.repeat(200),
        start: new Date(Date.UTC(2026, 8, 19, 14, 0, 0)),
        end: new Date(Date.UTC(2026, 8, 19, 16, 30, 0)),
      },
    ],
    { dtstamp: DTSTAMP }
  );
  for (const line of ics.split('\r\n')) {
    assert.ok(
      new TextEncoder().encode(line).length <= 75,
      `ligne trop longue (${line.length} caractères)`
    );
  }
});

test('le pliage ne coupe JAMAIS un accent en deux', () => {
  // Le pliage de `miss-uwh` découpe à 73 CARACTÈRES : sur 200 « é » (deux
  // octets chacun) il produit des lignes de 146 octets, et un `slice()` sur
  // une chaîne d'emoji couperait une paire de substitution en son milieu.
  const accents = 'é'.repeat(200);
  const ics = toIcalendar(
    [{ uid: 'a', summary: accents, start: '2026-01-31' }],
    {
      dtstamp: DTSTAMP,
    }
  );
  assert.ok(!ics.includes('�'), 'caractère de remplacement dans la sortie');
  assert.equal(valueOf(ics, 'SUMMARY'), accents);
});

test('déplier puis replier redonne la même ligne', () => {
  const line = `DESCRIPTION:${'péniche '.repeat(40)}`;
  assert.equal(unfoldLines(foldLine(line))[0], line);
});

/* ── Dates : les trois natures ─────────────────────────────────────────── */

test('un Date est un INSTANT : il s’écrit en UTC, avec le Z', () => {
  assert.equal(
    icalDate(new Date(Date.UTC(2026, 8, 19, 14, 0, 0))),
    '20260919T140000Z'
  );
});

test('une date ISO reste une JOURNÉE, sans passer par Date', () => {
  // `new Date('2026-01-31')` est minuit UTC et `new Date('2026-01-31T00:00')`
  // minuit local : la même date donnerait deux jours différents.
  assert.equal(icalDate('2026-01-31'), '20260131');
});

test('un horodatage sans décalage reste FLOTTANT', () => {
  // Les secondes sont facultatives à l'entrée, obligatoires à la sortie.
  assert.equal(icalDate('2026-05-10T18:00'), '20260510T180000');
  assert.equal(icalDate('2026-05-10T18:30:45'), '20260510T183045');
});

test('un décalage explicite est résolu en UTC', () => {
  assert.equal(icalDate('2026-05-10T18:00:00+02:00'), '20260510T160000Z');
  assert.equal(icalDate('2026-05-10T16:00:00Z'), '20260510T160000Z');
});

test('une valeur déjà iCalendar n’est pas retouchée', () => {
  assert.equal(icalDate('20260510T180000'), '20260510T180000');
  assert.equal(icalDate('20260510T160000Z'), '20260510T160000Z');
  assert.equal(icalDate('20260131'), '20260131');
});

test('allDay tronque à la journée, quelle que soit l’entrée', () => {
  assert.equal(
    icalDate(new Date(Date.UTC(2026, 8, 19, 14, 0, 0)), { allDay: true }),
    '20260919'
  );
  assert.equal(icalDate('2026-05-10T18:00', { allDay: true }), '20260510');
});

test('une entrée illisible donne une chaîne vide, jamais « Invalid Date »', () => {
  assert.equal(icalDate('nawak'), '');
  assert.equal(icalDate(''), '');
  assert.equal(icalDate(null), '');
});

/* ── Arithmétique ──────────────────────────────────────────────────────── */

test('addMinutes franchit l’heure, le jour et le mois', () => {
  assert.equal(addMinutes('2026-05-10T10:30', 120), '20260510T123000');
  assert.equal(addMinutes('2026-05-10T23:30', 60), '20260511T003000');
  assert.equal(addMinutes('2026-12-31T23:00', 120), '20270101T010000');
});

test('addMinutes ne saute PAS avec l’heure d’été', () => {
  // Le 29 mars 2026 à 02 h, la France passe à 03 h. `new Date(2026, 2, 29,
  // 1, 30 + 60)` — l'arithmétique de `mister-footcoach` — rend 03 h 30 pour
  // qui exécute en Europe/Paris, et 02 h 30 en CI (UTC) : un test qui passe
  // au bureau et un agenda faux chez l'utilisateur. Une heure FLOTTANTE se
  // calcule sur le cadran.
  assert.equal(addMinutes('2026-03-29T01:30', 60), '20260329T023000');
});

test('addMinutes conserve le Z d’un instant', () => {
  assert.equal(addMinutes('20260510T233000Z', 60), '20260511T003000Z');
});

test('addDays garde une journée entière entière', () => {
  assert.equal(addDays('2026-01-31', 1), '20260201');
  assert.equal(addDays('2026-02-28', 1), '20260301');
  assert.equal(addDays('2026-12-31', 1), '20270101');
});

/* ── Le cas bac-sable : événements horodatés en UTC ────────────────────── */

test('bac-sable — un calendrier UTC valide, terminé par CRLF', () => {
  const ics = toIcalendar(
    [
      {
        uid: 'evt-1',
        summary: 'Chasse au trésor',
        start: new Date(Date.UTC(2026, 8, 19, 14, 0, 0)),
        end: new Date(Date.UTC(2026, 8, 19, 16, 30, 0)),
      },
    ],
    { dtstamp: DTSTAMP, uidDomain: 'mister-family-map' }
  );
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART:20260919T140000Z'));
  assert.ok(ics.includes('DTEND:20260919T163000Z'));
  assert.ok(ics.includes('UID:evt-1@mister-family-map'));
  assert.equal(valueOf(ics, 'SUMMARY'), 'Chasse au trésor');
});

test('bac-sable — journée entière forcée depuis des Date', () => {
  const ics = toIcalendar(
    [
      {
        uid: 'evt-1',
        summary: 'Kermesse',
        allDay: true,
        start: new Date(Date.UTC(2026, 8, 19)),
        end: new Date(Date.UTC(2026, 8, 20)),
      },
    ],
    { dtstamp: DTSTAMP }
  );
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260919'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20260920'));
});

test('bac-sable — l’URL n’est PAS échappée', () => {
  // `URL` est une valeur URI (§3.3.13) : `\,` casse le lien. Les sources
  // échappaient tout indistinctement.
  const ics = toIcalendar(
    [
      {
        uid: 'u',
        summary: 'Sortie',
        start: '2026-01-31',
        url: 'https://exemple.fr/carte?p=1,2',
      },
    ],
    { dtstamp: DTSTAMP }
  );
  assert.ok(ics.includes('URL:https://exemple.fr/carte?p=1,2'));
});

/* ── Le cas mister-footcoach : heures flottantes, durée, STATUS ────────── */

test('footcoach — heure flottante et fin calculée depuis la durée', () => {
  const ics = toIcalendar(
    [
      {
        uid: 'match-m1@mister-footcoach',
        summary: '⚽ vs FC Rivale',
        start: '2026-05-10T10:00',
        durationMinutes: 120,
        location: 'Stade, 1 rue X',
        description: 'Statut : engage\nPhase : Championnat',
        status: 'CONFIRMED',
      },
    ],
    { name: 'U13 A', dtstamp: DTSTAMP }
  );
  // Pas de `Z` : 10 h reste 10 h, même pour le parent en déplacement.
  assert.ok(ics.includes('DTSTART:20260510T100000'));
  assert.ok(!ics.includes('DTSTART:20260510T100000Z'));
  assert.ok(ics.includes('DTEND:20260510T120000'));
  assert.ok(ics.includes('STATUS:CONFIRMED'));
  assert.equal(valueOf(ics, 'X-WR-CALNAME'), 'U13 A');
  // La virgule du lieu et le retour à la ligne de la description survivent.
  assert.equal(valueOf(ics, 'LOCATION'), 'Stade, 1 rue X');
  assert.equal(
    valueOf(ics, 'DESCRIPTION'),
    'Statut : engage\nPhase : Championnat'
  );
});

test('footcoach — un match annulé reste au calendrier, marqué CANCELLED', () => {
  const ics = toIcalendar(
    [
      {
        uid: 'match-m2',
        summary: 'Match',
        start: '2026-05-10T10:00',
        durationMinutes: 120,
        status: 'CANCELLED',
      },
    ],
    { dtstamp: DTSTAMP }
  );
  assert.ok(ics.includes('STATUS:CANCELLED'));
});

test('footcoach — un uid qui porte déjà son domaine n’en reçoit pas un second', () => {
  const ics = toIcalendar(
    [{ uid: 'match-m1@mister-footcoach', summary: 'M', start: '2026-05-10' }],
    { dtstamp: DTSTAMP, uidDomain: 'mister-footcoach' }
  );
  assert.equal(valueOf(ics, 'UID'), 'match-m1@mister-footcoach');
});

/* ── Le cas miss-uwh : journées entières depuis des dates ISO ──────────── */

test('miss-uwh — une date ISO seule suffit : DTEND au lendemain', () => {
  const ics = toIcalendar(
    [
      {
        uid: 'e1',
        summary: 'Assemblée générale',
        start: '2026-01-31',
        location: 'Piscine',
      },
    ],
    { name: 'CHS', dtstamp: DTSTAMP, uidDomain: 'miss-uwh' }
  );
  assert.ok(ics.includes('UID:e1@miss-uwh'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260131'));
  // EXCLUSIF : un événement du 31 finit le 1er.
  assert.ok(ics.includes('DTEND;VALUE=DATE:20260201'));
  assert.ok(ics.includes('LOCATION:Piscine'));
  assert.ok(ics.endsWith('\r\n'));
});

test('miss-uwh — passage de mois, et les champs absents restent absents', () => {
  const ics = toIcalendar([{ uid: 'e1', summary: 'AG', start: '2026-02-28' }], {
    dtstamp: DTSTAMP,
  });
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260228'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20260301'));
  assert.ok(!ics.includes('LOCATION:'));
  assert.ok(!ics.includes('DESCRIPTION:'));
  assert.ok(!ics.includes('STATUS:'));
});

test('miss-uwh — l’échappement du titre, à la lettre', () => {
  const ics = toIcalendar(
    [
      {
        uid: 'e1',
        summary: 'Soirée; tournoi, fin\nbuvette',
        start: '2026-01-31',
      },
    ],
    { dtstamp: DTSTAMP }
  );
  assert.ok(ics.includes('SUMMARY:Soirée\\; tournoi\\, fin\\nbuvette'));
});

test('miss-uwh — le DTSTAMP injecté est le SEUL du fichier', () => {
  const ics = toIcalendar(
    [
      { uid: 'a', summary: 'A', start: '2026-01-31' },
      { uid: 'b', summary: 'B', start: '2026-02-01' },
    ],
    { dtstamp: DTSTAMP }
  );
  const stamps = properties(ics)
    .filter(p => p.name === 'DTSTAMP')
    .map(p => p.value);
  assert.deepEqual(stamps, [DTSTAMP, DTSTAMP]);
});

/* ── Le cas mister-doc : flux d’abonnement ─────────────────────────────── */

test('mister-doc — l’en-tête d’un flux d’abonnement', () => {
  const ics = toIcalendar([], {
    name: 'mister-doc — Planning de gardes',
    prodId: '-//mister-doc//planning//FR',
    method: 'PUBLISH',
    timeZone: 'Europe/Paris',
    refreshInterval: 'PT1H',
    dtstamp: DTSTAMP,
  });
  assert.ok(ics.includes('PRODID:-//mister-doc//planning//FR'));
  assert.ok(ics.includes('METHOD:PUBLISH'));
  assert.ok(ics.includes('X-WR-TIMEZONE:Europe/Paris'));
  // La même durée, deux fois : les clients n'honorent pas tous la même.
  assert.ok(ics.includes('REFRESH-INTERVAL;VALUE=DURATION:PT1H'));
  assert.ok(ics.includes('X-PUBLISHED-TTL:PT1H'));
  // Un calendrier vide reste un calendrier VALIDE.
  assert.ok(ics.includes('VERSION:2.0'));
  assert.ok(!ics.includes('BEGIN:VEVENT'));
});

test('mister-doc — garde journée : CATEGORIES et TRANSP', () => {
  const ics = toIcalendar(
    [
      {
        uid: 'shift-1',
        summary: 'S1 Jour · Alice (10h)',
        start: '2026-05-10',
        categories: 'S1 Jour',
        transparent: true,
      },
    ],
    { dtstamp: DTSTAMP, uidDomain: 'mister-doc' }
  );
  assert.ok(ics.includes('UID:shift-1@mister-doc'));
  assert.ok(ics.includes('CATEGORIES:S1 Jour'));
  // Sans ça, un mois d'abonnement affiche un agenda entièrement occupé.
  assert.ok(ics.includes('TRANSP:TRANSPARENT'));
});

test('mister-doc — garde de nuit horodatée, franchissant minuit', () => {
  // S1N : 18 h 00 → 09 h 00 le lendemain, en heure locale flottante.
  const ics = toIcalendar(
    [
      {
        uid: 'shift-2',
        summary: 'S1 Nuit · Bob (15h)',
        start: '20260510T180000',
        end: '20260511T090000',
      },
    ],
    { timeZone: 'Europe/Paris', dtstamp: DTSTAMP }
  );
  assert.ok(ics.includes('DTSTART:20260510T180000'));
  assert.ok(ics.includes('DTEND:20260511T090000'));
});

test('mister-doc — plusieurs catégories : les séparateurs restent nus', () => {
  const ics = toIcalendar(
    [
      {
        uid: 'n',
        summary: 'Note',
        start: '2026-05-10',
        categories: ['Congé, annuel', 'Formation'],
      },
    ],
    { dtstamp: DTSTAMP }
  );
  // La virgule DANS une valeur est échappée, celle qui SÉPARE ne l'est pas.
  assert.ok(ics.includes('CATEGORIES:Congé\\, annuel,Formation'));
});

/* ── Structure et sûreté ───────────────────────────────────────────────── */

test('chaque VEVENT porte UID, DTSTAMP et DTSTART', () => {
  // `mister-footcoach` n'écrivait aucun `DTSTAMP` : la propriété est
  // OBLIGATOIRE (§3.6.1), et son absence ne se voit que sur les lecteurs
  // stricts.
  const ics = toIcalendar(
    [
      { uid: 'a', summary: 'A', start: '2026-01-31' },
      { uid: 'b', summary: 'B', start: '2026-05-10T10:00' },
    ],
    { dtstamp: DTSTAMP }
  );
  const names = properties(ics).map(p => p.name);
  for (const required of ['UID', 'DTSTAMP', 'DTSTART']) {
    assert.equal(
      names.filter(n => n === required).length,
      2,
      `${required} manquant sur un VEVENT`
    );
  }
  assert.equal(names.filter(n => n === 'BEGIN').length, 3);
  assert.equal(names.filter(n => n === 'END').length, 3);
});

test('sans uid, une empreinte STABLE du contenu — jamais un tirage au sort', () => {
  const event = { summary: 'Réunion', start: '2026-01-31' };
  const first = valueOf(toIcalendar([event], { dtstamp: DTSTAMP }), 'UID');
  const second = valueOf(toIcalendar([event], { dtstamp: DTSTAMP }), 'UID');
  assert.equal(first, second);
  assert.ok(first && first.length > 4);
});

test('un retour à la ligne dans un champ libre n’injecte pas de propriété', () => {
  const ics = toIcalendar(
    [
      {
        uid: 'x',
        summary: 'Sortie\r\nDTSTART;VALUE=DATE:19700101',
        start: '2026-01-31',
        url: 'https://exemple.fr/a\r\nX-EVIL:1',
      },
    ],
    { dtstamp: DTSTAMP }
  );
  // Le CR/LF du titre est échappé, celui de l'URL retiré : dans les deux cas
  // la charge utile reste UNE valeur, elle ne devient jamais une propriété.
  const names = properties(ics).map(p => p.name);
  assert.equal(names.filter(n => n === 'DTSTART').length, 1);
  assert.ok(!names.includes('X-EVIL'));
  assert.equal(valueOf(ics, 'DTSTART'), '20260131');
  assert.ok(ics.includes('SUMMARY:Sortie\\nDTSTART'));
});

test('toIcalEvent rend un VEVENT composable, sans enveloppe', () => {
  // C'est la granularité dont `mister-doc` a besoin : il assemble ses
  // événements lui-même avant de les joindre.
  const block = toIcalEvent(
    { uid: 'solo', summary: 'Seul', start: '2026-01-31' },
    { dtstamp: DTSTAMP }
  );
  assert.ok(block.startsWith('BEGIN:VEVENT\r\n'));
  assert.ok(block.endsWith('END:VEVENT\r\n'));
  assert.ok(!block.includes('VCALENDAR'));
});

test('map convertit les objets du domaine, comme toVCards', () => {
  const ics = toIcalendar([{ id: 'e1', nom: 'AG', jour: '2026-01-31' }], {
    dtstamp: DTSTAMP,
    map: item => ({ uid: item.id, summary: item.nom, start: item.jour }),
  });
  assert.ok(ics.includes('UID:e1'));
  assert.ok(ics.includes('SUMMARY:AG'));
});

test('le DTSTAMP est forcé en UTC : un horodatage de fabrication flottant n’existe pas', () => {
  const ics = toIcalendar([{ uid: 'a', summary: 'A', start: '2026-01-31' }], {
    dtstamp: '2026-01-01T12:00',
  });
  assert.equal(valueOf(ics, 'DTSTAMP'), '20260101T120000Z');
});

test('le type MIME est celui d’un .ics', () => {
  assert.equal(ICAL_MIME, 'text/calendar;charset=utf-8');
});

/* ── Aller-retour ──────────────────────────────────────────────────────── */

test('aller-retour : tout ce qui entre ressort, accents et séparateurs compris', () => {
  const original = {
    uid: 'aller-retour',
    summary: 'Réunion; bilan, 2ᵉ trimestre',
    description: `Ordre du jour :\n- comptes\n- ${'élection '.repeat(12)}`,
    location: 'Salle B, 3ᵉ étage',
    start: '2026-05-10T18:00',
    durationMinutes: 90,
  };
  const ics = toIcalendar([original], { dtstamp: DTSTAMP });

  assert.equal(valueOf(ics, 'SUMMARY'), original.summary);
  assert.equal(valueOf(ics, 'DESCRIPTION'), original.description);
  assert.equal(valueOf(ics, 'LOCATION'), original.location);
  assert.equal(valueOf(ics, 'DTSTART'), '20260510T180000');
  assert.equal(valueOf(ics, 'DTEND'), '20260510T193000');
});
