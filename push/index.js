/**
 * Notifications push — le PORT, agnostique du service de livraison.
 *
 * PROVENANCE : AUCUNE. C'est écrit en toutes lettres parce que la règle de ce
 * dépôt est « le socle promeut, il n'invente pas », et qu'ici il invente.
 * Zéro ligne de code push dans les dépôts relevés : pas un
 * `PushManager.subscribe`, pas un `Notification.requestPermission`, pas une
 * clé VAPID. Ce module est donc du NEUF ASSUMÉ, demandé explicitement, et non
 * une convergence constatée qu'on aurait absorbée.
 *
 * CE QUE ÇA CHANGE POUR SA CONCEPTION. N'ayant aucun usage réel à généraliser,
 * la seule protection contre l'invention gratuite est de ne rien décider à la
 * place des apps :
 *
 *   - le TRANSPORT est un adaptateur (`push/firebase`, `push/supabase`,
 *     `push/webpush`), exactement comme `MapProvider` l'est pour Leaflet et
 *     MapLibre. Le paquet n'impose ni Firebase, ni Supabase, ni serveur ;
 *   - ce fichier ne dépend de RIEN : il porte le contrat, la permission, le
 *     cycle de vie de l'abonnement et les conversions de clés VAPID — c'est-à-
 *     dire uniquement ce que la plateforme impose et que toutes les apps
 *     referaient à l'identique ;
 *   - aucun composant d'interface n'est livré : demander la permission au bon
 *     moment est une décision de produit, pas de socle.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE LA PLATEFORME IMPOSE, ET QU'ON NE PEUT PAS CONTOURNER.
 *
 *   - **Un service worker actif.** Le push arrive au worker, pas à la page ;
 *     sans worker enregistré, il n'y a pas d'abonnement possible.
 *   - **HTTPS**, sauf `localhost`.
 *   - **iOS ≥ 16.4, et SEULEMENT en app installée.** Safari refuse le push aux
 *     onglets : sur iPhone, l'utilisateur doit avoir ajouté l'app à l'écran
 *     d'accueil. C'est la limite qui surprend le plus, et `pushSupport()` la
 *     rapporte explicitement plutôt que de rendre un « non » indistinct.
 *   - **La permission ne se redemande pas.** Une fois refusée, seul
 *     l'utilisateur peut revenir dessus dans les réglages du navigateur : une
 *     app qui demande au chargement brûle sa seule cartouche.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** États possibles de la permission de notification. */
export const PERMISSION = {
  granted: 'granted',
  denied: 'denied',
  prompt: 'default',
  unsupported: 'unsupported',
};

/**
 * Convertit une clé VAPID publique (base64url) en `Uint8Array`.
 *
 * POURQUOI CETTE FONCTION EXISTE PARTOUT. `PushManager.subscribe` exige un
 * `applicationServerKey` binaire, alors que toutes les consoles (Firebase,
 * web-push, Supabase) livrent la clé en base64url. Chaque projet réécrit donc
 * les mêmes douze lignes, et la moitié oublie que base64url n'est PAS base64 :
 * `-` et `_` remplacent `+` et `/`, et le remplissage est absent.
 */
export function urlBase64ToUint8Array(base64Url) {
  const padded = String(base64Url).padEnd(
    Math.ceil(String(base64Url).length / 4) * 4,
    '='
  );
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** L'inverse : des octets vers base64url, pour sérialiser une clé d'abonnement. */
export function uint8ArrayToUrlBase64(bytes) {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1)
    binary += String.fromCharCode(view[i]);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Ce que ce navigateur sait faire — et, quand il ne sait pas, POURQUOI.
 *
 * Un booléen unique ne permet pas de dire à l'utilisateur d'iPhone « ajoutez
 * l'app à votre écran d'accueil », qui est la seule réponse utile dans son cas.
 */
export function pushSupport(env = globalThis) {
  const nav = env.navigator;
  const hasServiceWorker = Boolean(nav?.serviceWorker);
  const hasPushManager = 'PushManager' in env;
  const hasNotification = 'Notification' in env;

  // iOS/iPadOS n'autorise le push qu'en mode autonome (app installée). Le
  // détecter par la capacité, pas par l'agent utilisateur : si `PushManager`
  // manque alors que le worker est là, sur un appareil Apple, c'est ça.
  const standalone =
    env.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    nav?.standalone === true;

  if (hasServiceWorker && hasPushManager && hasNotification) {
    return { supported: true, reason: null, standalone };
  }
  if (!hasServiceWorker) {
    return { supported: false, reason: 'no-service-worker', standalone };
  }
  if (!hasPushManager) {
    return {
      supported: false,
      // Le cas iPhone-en-onglet : ce n'est pas « votre navigateur ne peut
      // pas », c'est « pas encore installée ».
      reason: standalone ? 'no-push-manager' : 'requires-installed-app',
      standalone,
    };
  }
  return { supported: false, reason: 'no-notification-api', standalone };
}

/** L'état actuel de la permission, sans jamais la demander. */
export function permissionState(env = globalThis) {
  if (!('Notification' in env)) return PERMISSION.unsupported;
  return env.Notification.permission;
}

/**
 * Demande la permission — à n'appeler que sur un geste de l'utilisateur.
 *
 * Ne redemande PAS quand la réponse est déjà connue : `requestPermission` sur
 * un état `denied` ne montre rien et rend `denied`, ce qui donne l'illusion
 * d'avoir réessayé.
 */
export async function requestPermission(env = globalThis) {
  const current = permissionState(env);
  if (current !== PERMISSION.prompt) return current;
  try {
    return await env.Notification.requestPermission();
  } catch {
    return PERMISSION.denied;
  }
}

/**
 * Sérialise un `PushSubscription` en objet transmissible au serveur.
 *
 * `toJSON()` du navigateur suffirait, mais il rend `keys` en base64url sans
 * garantie inter-navigateurs ; on repasse par les octets bruts pour un format
 * stable, celui qu'attendent web-push et les consoles.
 */
export function serializeSubscription(subscription) {
  if (!subscription) return null;
  const key = subscription.getKey?.bind(subscription);
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      p256dh: key?.('p256dh') ? uint8ArrayToUrlBase64(key('p256dh')) : '',
      auth: key?.('auth') ? uint8ArrayToUrlBase64(key('auth')) : '',
    },
  };
}

/**
 * Un client push, branché sur un TRANSPORT.
 *
 * Le transport est un objet à trois méthodes — c'est tout le contrat :
 *
 *   save(subscription, context)   enregistre l'abonnement côté serveur
 *   remove(subscription, context) le retire
 *   key?()                        rend la clé VAPID publique, si le transport
 *                                 la connaît (Supabase la lit d'un réglage,
 *                                 Firebase la porte lui-même)
 *
 * Les adaptateurs livrés (`push/firebase`, `push/supabase`, `push/webpush`)
 * implémentent ce contrat ; une app avec son propre backend en écrit un en
 * quinze lignes, sans rien importer.
 *
 * @param {{ transport: object, vapidKey?: string, serviceWorkerUrl?: string,
 *   scope?: string, env?: object }} options
 */
export function createPushClient(options) {
  const { transport, vapidKey, env = globalThis } = options ?? {};
  if (!transport) {
    throw new Error('push: un transport est requis (voir push/firebase, …)');
  }

  /** L'enregistrement du worker — celui de l'app, jamais un nouveau. */
  async function registration() {
    const sw = env.navigator?.serviceWorker;
    if (!sw) return null;
    if (options.serviceWorkerUrl) {
      return sw.register(options.serviceWorkerUrl, { scope: options.scope });
    }
    // `ready` attend le worker DÉJÀ enregistré par l'app (vite-plugin-pwa).
    // En enregistrer un second créerait deux workers concurrents sur la même
    // portée — et le push arriverait à celui qui n'a pas le gestionnaire.
    return sw.ready;
  }

  return {
    support: () => pushSupport(env),
    permission: () => permissionState(env),
    requestPermission: () => requestPermission(env),

    /** L'abonnement en cours, ou `null`. N'en crée aucun. */
    async current() {
      try {
        const reg = await registration();
        return (await reg?.pushManager?.getSubscription()) ?? null;
      } catch {
        return null;
      }
    },

    /**
     * S'abonne et enregistre l'abonnement côté serveur.
     *
     * Rend `{ ok, reason, subscription }` plutôt que de lever : refuser les
     * notifications est un choix ordinaire de l'utilisateur, pas une panne, et
     * ça ne doit pas remonter dans le rapport d'erreurs.
     */
    async subscribe(context = {}) {
      const support = pushSupport(env);
      if (!support.supported) {
        return { ok: false, reason: support.reason, subscription: null };
      }

      const permission = await requestPermission(env);
      if (permission !== PERMISSION.granted) {
        return {
          ok: false,
          reason: 'permission-' + permission,
          subscription: null,
        };
      }

      const key = vapidKey ?? (await transport.key?.());
      if (!key) {
        return { ok: false, reason: 'missing-vapid-key', subscription: null };
      }

      try {
        const reg = await registration();
        const subscription =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            // `false` est refusé par tous les navigateurs pour le push web :
            // un abonnement doit être visible par l'utilisateur.
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(key),
          }));

        await transport.save(serializeSubscription(subscription), context);
        return { ok: true, reason: null, subscription };
      } catch (error) {
        return {
          ok: false,
          reason:
            error?.name === 'NotAllowedError'
              ? 'permission-denied'
              : 'subscribe-failed',
          subscription: null,
        };
      }
    },

    /**
     * Se désabonne, côté serveur d'abord.
     *
     * L'ORDRE COMPTE. Désinscrire le navigateur en premier perdrait le point de
     * terminaison qu'il faut donner au serveur pour qu'il oublie l'abonnement :
     * il continuerait d'envoyer dans le vide, et l'utilisateur qui a dit non
     * recevrait encore.
     */
    async unsubscribe(context = {}) {
      try {
        const reg = await registration();
        const subscription = await reg?.pushManager?.getSubscription();
        if (!subscription) return { ok: true, reason: 'not-subscribed' };

        await transport.remove(serializeSubscription(subscription), context);
        await subscription.unsubscribe();
        return { ok: true, reason: null };
      } catch {
        return { ok: false, reason: 'unsubscribe-failed' };
      }
    },
  };
}
