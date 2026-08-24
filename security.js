/**
 * Utilitaires de sécurité — échappement, validation, masquage.
 *
 * PROMU, PAS INVENTÉ. Trois apps portaient un `src/utils/security.ts`, dont
 * **deux identiques à l'octet**, et dont l'en-tête disait déjà littéralement
 * « Utilitaires de sécurité pour tous les projets ». Un fichier qui se déclare
 * partagé et qu'on recopie trois fois : c'est exactement ce que ce paquet
 * existe pour absorber.
 *
 * DEUX CORRECTIONS À LA PROMOTION, parce que promouvoir un défaut le
 * généraliserait à seize apps :
 *
 * 1. `sanitizeHtml` s'appelait « sanitize » et créait un élément DOM pour
 *    lire son `innerHTML`. Le nom promettait ce que la fonction ne fait pas —
 *    elle ÉCHAPPE, elle ne nettoie pas — et le DOM la rendait inutilisable en
 *    test Node, en service worker ou en rendu serveur. Elle devient
 *    `escapeHtml`, pure, et sa limite est écrite noir sur blanc.
 * 2. `isBotRequest` reniflait l'agent utilisateur. Un agent se déclare ce
 *    qu'il veut : cette fonction ne prouve rien et n'est pas reprise. Un vrai
 *    besoin anti-robot se traite côté serveur.
 *
 * SANS DOM, SANS DÉPENDANCE. Les fonctions asynchrones (`hashString`,
 * `generateSecureId`) demandent la Web Crypto API, présente dans les
 * navigateurs et dans Node ≥ 19.
 */

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Échappe les caractères qui ont un sens en HTML.
 *
 * CE QUE ÇA FAIT : rend une chaîne sûre à INSÉRER COMME TEXTE, y compris dans
 * un attribut. CE QUE ÇA NE FAIT PAS : nettoyer du HTML pour l'injecter via
 * `innerHTML` — ça n'est pas un assainisseur, et aucune fonction de trente
 * lignes ne l'est. Pour afficher du texte, React échappe déjà tout seul ; cette
 * fonction sert aux cas où l'on construit une chaîne à la main.
 */
export function escapeHtml(input) {
  return String(input ?? '').replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
}

/** Échappe les caractères spéciaux d'une expression régulière. */
export function escapeRegex(text) {
  return String(text ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Nettoie une saisie utilisateur : rogne, plafonne la longueur, échappe.
 * Le plafond évite qu'un champ libre serve de vecteur de déni de service au
 * stockage local ou à une requête.
 */
export function sanitizeInput(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';
  return escapeHtml(input.trim().slice(0, maxLength));
}

/**
 * Identifiant aléatoire imprévisible (128 bits, hexadécimal).
 * `crypto.randomUUID` quand il existe, sinon `getRandomValues` —
 * jamais `Math.random`, qui n'est pas imprévisible.
 */
export function generateSecureId() {
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) {
    throw new Error(
      '[dwc] Web Crypto indisponible : generateSecureId ne peut pas produire de valeur imprévisible.'
    );
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Empreinte SHA-256 hexadécimale d'une chaîne. */
export async function hashString(text) {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle) {
    throw new Error(
      '[dwc] crypto.subtle indisponible : hashString impossible.'
    );
  }
  const data = new TextEncoder().encode(String(text ?? ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

/** `true` si l'URL est absolue ET en HTTPS. */
export function isValidHttpsUrl(url) {
  try {
    return new URL(String(url)).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validation d'adresse électronique, volontairement permissive : elle écarte
 * les saisies manifestement fausses, elle ne prouve pas qu'une adresse existe.
 * Seul l'envoi d'un message le prouve.
 *
 * SANS EXPRESSION RÉGULIÈRE, et ce n'est pas un goût. Les copies utilisaient
 * `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, dont les deux dernières classes se
 * recouvrent : un point appartient à `[^\s@]`. Sur une saisie qui ÉCHOUE, le
 * moteur explore donc chaque découpage possible, en temps quadratique — mesuré
 * à 19 ms pour 4 ko, 1 s pour 32 ko, ×4 à chaque doublement. Un champ où l'on
 * colle une adresse suffit à figer l'onglet ; CodeQL l'a signalé à la
 * promotion. Les quatre tests ci-dessous font le même travail en un seul
 * parcours.
 */
export function isValidEmail(email) {
  const value = String(email ?? '');
  if (/\s/.test(value)) return false;
  const at = value.indexOf('@');
  // Une partie locale non vide, un seul arobase.
  if (at <= 0 || value.indexOf('@', at + 1) !== -1) return false;
  const domain = value.slice(at + 1);
  const dot = domain.indexOf('.');
  // Un point, ni en tête ni en queue du domaine.
  return dot > 0 && dot < domain.length - 1;
}

/** Domaine d'une adresse électronique valide, sinon `null`. */
export function extractDomainFromEmail(email) {
  if (!isValidEmail(email)) return null;
  return String(email).toLowerCase().split('@')[1] ?? null;
}

/** Masque une adresse pour l'affichage (`j****n@exemple.fr`). */
export function maskEmail(email) {
  const value = String(email ?? '');
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  const masked =
    local.length > 2
      ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
      : '*'.repeat(local.length);
  return `${masked}@${domain}`;
}

/** Masque un numéro de téléphone, en gardant les deux derniers chiffres. */
export function maskPhone(phone) {
  const value = String(phone ?? '');
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return value;
  return `${'*'.repeat(digits.length - 2)}${digits.slice(-2)}`;
}

/**
 * Retire d'un objet ce qui ressemble à une donnée personnelle ou à un secret,
 * avant journalisation.
 *
 * Pensé pour `react/observability` : son journal d'erreurs conserve un
 * `context` arbitraire dans `localStorage`, où une valeur de formulaire n'a
 * rien à faire. La liste est volontairement grossière — mieux vaut masquer un
 * champ anodin que laisser fuir un jeton.
 */
export function redact(value, extraKeys = []) {
  const SENSITIVE =
    /(pass|pwd|secret|token|auth|bearer|cookie|session|api[-_]?key|credit|card|iban|ssn|email|phone|tel)/i;
  const extra = new Set(extraKeys.map(key => String(key).toLowerCase()));

  const walk = (input, depth) => {
    if (depth > 6 || input === null || typeof input !== 'object') return input;
    if (Array.isArray(input)) return input.map(item => walk(item, depth + 1));
    const out = {};
    for (const [key, item] of Object.entries(input)) {
      out[key] =
        SENSITIVE.test(key) || extra.has(key.toLowerCase())
          ? '[masqué]'
          : walk(item, depth + 1);
    }
    return out;
  };
  return walk(value, 0);
}
