/**
 * Une date iCalendar acceptée en entrée : `Date`, millisecondes, date ISO
 * (`2026-01-31`), horodatage ISO flottant (`2026-05-10T18:00`) ou daté
 * (`2026-05-10T18:00:00+02:00`), ou déjà une valeur iCalendar (`20260131`,
 * `20260510T180000`, `20260510T160000Z`).
 */
export type IcalDateInput = string | number | Date;

/** Les trois seules valeurs légales pour un `VEVENT` (§3.8.1.11). */
export type IcalStatus = 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';

export interface IcalEvent {
  /**
   * Identifiant STABLE d'un export à l'autre : c'est lui qui fait qu'un
   * réimport met à jour au lieu de dupliquer. À défaut, une empreinte du
   * contenu — stable elle aussi, mais qui bouge dès que le titre change.
   */
  uid?: string;
  summary?: string;
  start: IcalDateInput;
  /**
   * Fin EXCLUSIVE. Sur une journée entière, un événement du 31 janvier finit
   * le 1er février ; c'est le défaut si la fin est absente.
   */
  end?: IcalDateInput;
  /**
   * Fin calculée depuis le début. Sur une journée entière, arrondie au jour
   * supérieur. Ignorée si `end` est fourni.
   */
  durationMinutes?: number;
  /** Force la journée entière (`VALUE=DATE`). Déduit d'une date sans heure. */
  allDay?: boolean;
  description?: string;
  location?: string;
  /** Valeur URI : jamais échappée, sinon la virgule d'une URL la casse. */
  url?: string;
  status?: IcalStatus;
  /** Une chaîne ou plusieurs ; les virgules internes sont échappées. */
  categories?: string | readonly string[];
  /** `TRANSP:TRANSPARENT` — un créneau observé ne remplit pas sa disponibilité. */
  transparent?: boolean;
  /**
   * Rappels `VALARM`, SEULEMENT si l'app les demande : sans cette propriété,
   * l'événement n'en porte aucun. À réserver aux exports dont le rappel est
   * l'objet, une échéance par exemple. Google Agenda ignore les rappels d'un
   * fichier importé et applique les siens ; Apple Calendar, Outlook et
   * Thunderbird les honorent.
   */
  alarms?: readonly IcalAlarm[];
}

/** Un rappel `ACTION:DISPLAY`, compté depuis le DÉBUT de l'événement. */
export interface IcalAlarm {
  /**
   * Minutes AVANT le début (`0` : au début ; négatif : après). Sur une journée
   * entière, le début est minuit : la veille à 9 h, c'est `24 * 60 - 9 * 60`.
   * Une valeur non finie écarte le rappel.
   */
  minutesBefore: number;
  /** Le texte affiché. À défaut, le titre de l'événement. */
  description?: string;
}

export interface IcalEventOptions {
  /** Date de FABRICATION du fichier, en UTC. Injectable = export testable. */
  dtstamp?: IcalDateInput;
  /** Ajouté aux `uid` qui n'ont pas déjà un `@` : `evt-1` → `evt-1@miss-uwh`. */
  uidDomain?: string;
}

export interface IcalendarOptions<T = IcalEvent> extends IcalEventOptions {
  /** `X-WR-CALNAME` : sans lui, le calendrier importé porte le nom du fichier. */
  name?: string;
  /** `PRODID` : le logiciel qui a écrit le fichier. Obligatoire, donc défauté. */
  prodId?: string;
  /** `PUBLISH` pour un flux. `REQUEST` transforme l'export en INVITATION. */
  method?: 'PUBLISH' | 'REQUEST' | 'CANCEL' | 'REPLY' | (string & {});
  /** `X-WR-TIMEZONE` : le fuseau où lire les heures flottantes du flux. */
  timeZone?: string;
  /** Durée ISO 8601 (`PT1H`) écrite en `REFRESH-INTERVAL` ET `X-PUBLISHED-TTL`. */
  refreshInterval?: string;
  /** Convertit chaque élément en événement. */
  map?: (item: T) => IcalEvent;
}

/** `text/calendar;charset=utf-8`, pour `downloadText`. */
export declare const ICAL_MIME: string;

/**
 * Échappe une valeur TEXTE (§3.3.11) : `\`, `;`, `,` et le retour à la ligne.
 * Un retour à la ligne non échappé termine la propriété — le champ libre
 * devient alors capable d'injecter n'importe quoi dans l'agenda.
 */
export declare function escapeText(value: unknown): string;

/** L'inverse. `\N` compte comme `\n`, la RFC accepte les deux. */
export declare function unescapeText(text: unknown): string;

/**
 * Normalise une date en valeur iCalendar. Le résultat se lit à sa LONGUEUR :
 * 8 caractères = une journée entière, un `Z` final = un instant UTC, sinon
 * une heure flottante.
 */
export declare function icalDate(
  value: unknown,
  options?: { allDay?: boolean }
): string;

/**
 * Ajoute des minutes en conservant la nature de la valeur. L'arithmétique se
 * fait sur le cadran : pas de saut à l'heure d'été.
 */
export declare function addMinutes(value: unknown, minutes: number): string;

/** Ajoute des jours ; une journée entière reste une journée entière. */
export declare function addDays(value: unknown, days: number): string;

/** Un `VEVENT` seul, plié et terminé par CRLF. */
export declare function toIcalEvent(
  event: IcalEvent,
  options?: IcalEventOptions
): string;

/** Un fichier `.ics` complet, terminé par CRLF. */
export declare function toIcalendar<T = IcalEvent>(
  events: readonly T[],
  options?: IcalendarOptions<T>
): string;

/**
 * Plie une ligne à 75 OCTETS (§3.1) — le MÊME pliage que la vCard, réexporté
 * pour qu'un module d'agenda n'ait pas à importer un module de contacts.
 */
export declare function foldLine(line: string, limit?: number): string;

/** Déplie les lignes d'un `.ics`. À faire AVANT toute analyse. */
export declare function unfoldLines(text: string): string[];
