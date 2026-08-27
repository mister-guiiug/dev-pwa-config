/**
 * Coffre local : des secrets chiffrés AU REPOS, dans un stockage qui ne l'est pas.
 *
 * PROMU, PAS INVENTÉ. `miss-supaboss/src/api/crypto/patVault.ts` — 184 lignes
 * en production — chiffre les jetons d'accès personnels en AES-256-GCM avec une
 * clé dérivée d'une phrase secrète par PBKDF2-SHA-256, gardée EN MÉMOIRE SEULE.
 * Son en-tête énonçait déjà ses limites avec une honnêteté rare ; elles sont
 * reprises mot pour mot plus bas, parce qu'un module de chiffrement qui tait ce
 * qu'il ne protège pas est pire qu'aucun module.
 *
 * TROIS CHANGEMENTS À LA PROMOTION :
 *
 * 1. **Un coffre, pas LE coffre.** L'original était un singleton avec sa clé de
 *    stockage en dur et une clé de chiffrement dans une variable de module.
 *    `createVault()` rend une instance : deux coffres peuvent coexister — l'un
 *    pour les jetons, l'autre pour un brouillon — sans partager leur phrase.
 * 2. **Le stockage est injecté.** L'original appelait `localStorage`
 *    directement, ce qui le rendait intestable hors navigateur et aveugle au
 *    mode privé. Il passe par `./storage.js`, qui absorbe déjà les quatre
 *    façons dont `localStorage` lève.
 * 3. **Le nombre d'itérations est PERSISTÉ et relu**, comme dans l'original —
 *    et c'est capital : augmenter la constante dans une version future ne doit
 *    pas rendre illisibles les coffres existants. Le vérificateur est déchiffré
 *    avec les paramètres qui l'ont produit, pas avec ceux d'aujourd'hui.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE ÇA PROTÈGE, ET CE QUE ÇA NE PROTÈGE PAS.
 *
 *   ✔ la fuite PASSIVE : sauvegarde ou synchronisation de `localStorage`,
 *     lecture du stockage par un script tiers, appareil perdu ou revendu ;
 *   ✘ un XSS ACTIF pendant une session déverrouillée : le script appelle
 *     `decrypt` comme le ferait l'app. Le chiffrement au repos n'est PAS une
 *     parade au XSS actif, et rien de ce qui vit dans la page ne l'est ;
 *   ✘ la phrase oubliée : les données sont irrécupérables. C'est le prix d'une
 *     clé qui n'est stockée nulle part.
 *
 * Autrement dit : ceci élève le coût d'une fuite de stockage, cela ne remplace
 * ni une CSP, ni un jeton à courte durée de vie, ni un secret côté serveur.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * SANS DOM, SANS DÉPENDANCE. Web Crypto suffit — navigateurs et Node ≥ 19.
 */
import { createStore } from './storage.js';

/** Itérations PBKDF2 par défaut. L'OWASP recommande ≥ 210 000 pour SHA-256. */
export const DEFAULT_ITERATIONS = 210_000;

const SALT_BYTES = 16;
const IV_BYTES = 12;
/** Témoin chiffré à l'activation : son déchiffrement valide la phrase. */
const VERIFIER = 'dwc-vault-ok';
const META_KEY = 'meta';

const subtle = () => globalThis.crypto?.subtle;

/* ── Encodages ─────────────────────────────────────────────────────────── */

function toB64(bytes) {
  let binary = '';
  // Par tranches : `String.fromCharCode(...bytes)` dépasse la pile d'appels
  // au-delà de quelques dizaines de milliers d'octets. L'original n'avait pas
  // le cas — il ne chiffrait que des jetons — mais un coffre générique, si.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Vues adossées à un `ArrayBuffer` « pur ».
 *
 * Depuis TypeScript 5.7, `lib.dom` n'accepte plus `Uint8Array<ArrayBufferLike>`
 * — potentiellement un `SharedArrayBuffer` — comme `BufferSource`. La remarque
 * vient de l'original et vaut toujours pour les consommateurs typés.
 */
function fromB64(b64) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function utf8(text) {
  const encoded = new TextEncoder().encode(text);
  const out = new Uint8Array(encoded.length);
  out.set(encoded);
  return out;
}

/* ── Primitives ────────────────────────────────────────────────────────── */

async function deriveKey(passphrase, salt, iterations) {
  const base = await subtle().importKey(
    'raw',
    utf8(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle().deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    // `false` : la clé n'est PAS exportable. Même un script qui l'atteint ne
    // peut pas la sérialiser pour l'emporter.
    false,
    ['encrypt', 'decrypt']
  );
}

async function aesEncrypt(key, plaintext) {
  // Un IV neuf à CHAQUE chiffrement. Réutiliser un IV en GCM ne dégrade pas la
  // confidentialité, il la détruit — les clairs se retrouvent par XOR.
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = new Uint8Array(
    await subtle().encrypt({ name: 'AES-GCM', iv }, key, utf8(plaintext))
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return toB64(packed);
}

async function aesDecrypt(key, blob) {
  const packed = fromB64(blob);
  const plain = await subtle().decrypt(
    { name: 'AES-GCM', iv: packed.slice(0, IV_BYTES) },
    key,
    packed.slice(IV_BYTES)
  );
  return new TextDecoder().decode(plain);
}

/* ── Le coffre ─────────────────────────────────────────────────────────── */

/**
 * Un coffre. La clé dérivée ne vit qu'en mémoire : il faut déverrouiller à
 * chaque ouverture de l'application.
 *
 * @param {{ prefix?: string, iterations?: number, kind?: 'local'|'session' }} [options]
 */
export function createVault(options = {}) {
  const store = createStore(options.prefix ?? 'dwc_vault_', {
    kind: options.kind ?? 'local',
  });
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;

  /** @type {CryptoKey|null} Jamais sérialisée, jamais persistée. */
  let memoryKey = null;

  const meta = () => store.get(META_KEY, null);

  return {
    /** Web Crypto est-il là ? (`false` en HTTP non sécurisé, par exemple.) */
    supported: () => Boolean(subtle()),

    /** Le coffre a-t-il été activé sur cet appareil ? */
    isEnabled: () => meta() !== null,

    /** La clé est-elle en mémoire — c'est-à-dire le coffre est-il ouvert ? */
    isUnlocked: () => memoryKey !== null,

    /**
     * Active le coffre avec une phrase neuve. L'appelant chiffre ensuite ses
     * données existantes via `encrypt`.
     */
    async enable(passphrase) {
      if (!subtle()) throw new Error('secure-storage: Web Crypto indisponible');
      const salt = globalThis.crypto.getRandomValues(
        new Uint8Array(SALT_BYTES)
      );
      const key = await deriveKey(passphrase, salt, iterations);
      const written = store.set(META_KEY, {
        v: 1,
        salt: toB64(salt),
        iterations,
        verifier: await aesEncrypt(key, VERIFIER),
      });
      // Sans métadonnées persistées, le coffre serait déverrouillé cette fois
      // et introuvable la suivante : mieux vaut refuser franchement.
      if (!written) throw new Error('secure-storage: stockage indisponible');
      memoryKey = key;
    },

    /**
     * Déverrouille. Rend `false` sur phrase incorrecte — sans rien révéler de
     * plus : l'échec d'authentification GCM et l'absence de coffre se
     * ressemblent volontairement.
     */
    async unlock(passphrase) {
      const current = meta();
      if (!current || !subtle()) return false;
      try {
        // Les paramètres RELUS, pas ceux d'aujourd'hui : augmenter
        // `DEFAULT_ITERATIONS` dans une version future ne doit pas rendre
        // illisibles les coffres déjà en place.
        const key = await deriveKey(
          passphrase,
          fromB64(current.salt),
          current.iterations
        );
        if ((await aesDecrypt(key, current.verifier)) !== VERIFIER)
          return false;
        memoryKey = key;
        return true;
      } catch {
        return false;
      }
    },

    /** Oublie la clé. Le contenu chiffré reste, il faudra rouvrir. */
    lock() {
      memoryKey = null;
    },

    /**
     * Désactive : retire les métadonnées et la clé. Les données chiffrées
     * écrites par ce coffre deviennent DÉFINITIVEMENT illisibles — c'est
     * l'appelant qui décide de les déchiffrer avant, ou de les jeter.
     */
    disable() {
      store.remove(META_KEY);
      memoryKey = null;
    },

    /** Chiffre. Lève `vault-locked` si le coffre n'est pas ouvert. */
    async encrypt(plaintext) {
      if (!memoryKey) throw new Error('vault-locked');
      return aesEncrypt(memoryKey, plaintext);
    },

    /** Déchiffre. Lève `vault-locked` fermé, ou sur blob altéré (GCM authentifie). */
    async decrypt(blob) {
      if (!memoryKey) throw new Error('vault-locked');
      return aesDecrypt(memoryKey, blob);
    },

    /** Chiffre et range sous `key`. `false` si le stockage refuse. */
    async setItem(key, value) {
      return store.setRaw(key, await this.encrypt(JSON.stringify(value)));
    },

    /**
     * Relit et déchiffre. Rend `fallback` quand la clé est absente OU que le
     * blob est illisible — un coffre réactivé avec une autre phrase laisse
     * derrière lui des blobs indéchiffrables, et ce n'est pas une panne.
     */
    async getItem(key, fallback = null) {
      const blob = store.getRaw(key);
      if (blob === null) return fallback;
      try {
        return JSON.parse(await this.decrypt(blob));
      } catch {
        return fallback;
      }
    },

    /** Retire une entrée chiffrée. */
    removeItem(key) {
      store.remove(key);
    },

    /** Les entrées du coffre, métadonnées exclues. */
    keys() {
      return store.keys().filter(key => key !== META_KEY);
    },
  };
}
