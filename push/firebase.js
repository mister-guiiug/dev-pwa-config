/**
 * Transport Firebase Cloud Messaging.
 *
 * Peer OPTIONNEL : `firebase`. Le `messaging` est INJECTÉ — l'app initialise
 * déjà son application Firebase, et en initialiser une seconde lèverait.
 *
 * FCM NE FONCTIONNE PAS COMME LE PUSH WEB STANDARD, et c'est la raison d'être
 * de cet adaptateur : au lieu d'un `PushSubscription`, il donne un JETON
 * d'inscription, qu'il fabrique lui-même à partir de son propre service worker
 * (`firebase-messaging-sw.js`). L'abonnement du navigateur existe bien, mais
 * c'est le SDK qui le gère.
 *
 * Ce transport prend donc la main sur `key()` — le SDK n'a pas besoin qu'on lui
 * passe la clé VAPID au `subscribe`, il l'a déjà — et enregistre le JETON, pas
 * le point de terminaison.
 *
 * DEUX SERVICE WORKERS. `firebase-messaging-sw.js` cohabite avec celui de
 * vite-plugin-pwa. Ce n'est pas un défaut de configuration : ils ont des
 * portées différentes et FCM exige le sien. Ne pas tenter de les fusionner.
 */

/**
 * @param {{ messaging: object, getToken: Function, deleteToken?: Function,
 *   vapidKey: string, save: Function, remove: Function,
 *   serviceWorkerRegistration?: object }} options
 */
export function firebasePushTransport(options) {
  const { messaging, getToken, deleteToken, vapidKey, save, remove } =
    options ?? {};
  if (!messaging || typeof getToken !== 'function') {
    throw new Error(
      'push/firebase: `messaging` et `getToken` sont requis — ' +
        "importez-les de 'firebase/messaging' et passez-les ici"
    );
  }
  if (typeof save !== 'function' || typeof remove !== 'function') {
    // Firebase stocke les jetons ? Non : c'est à l'app de les ranger quelque
    // part (Firestore, sa propre API). Le taire ferait croire à une
    // persistance qui n'existe pas.
    throw new Error(
      'push/firebase: `save` et `remove` sont requis — FCM ne conserve pas les jetons'
    );
  }

  let lastToken = null;

  return {
    // Le SDK porte la clé : le port n'a pas à la repasser au navigateur.
    key: () => vapidKey,

    async save(subscription, context) {
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: options.serviceWorkerRegistration,
      });
      if (!token) throw new Error('push/firebase: aucun jeton obtenu');
      lastToken = token;
      // Le point de terminaison web accompagne le jeton : il identifie
      // l'appareil de la même façon, et permet de dédupliquer si l'app migre
      // un jour vers le push web standard.
      await save({ token, endpoint: subscription?.endpoint ?? null }, context);
    },

    async remove(subscription, context) {
      await remove(
        { token: lastToken, endpoint: subscription?.endpoint ?? null },
        context
      );
      await deleteToken?.(messaging);
      lastToken = null;
    },
  };
}
