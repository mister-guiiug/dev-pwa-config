/**
 * Transport HTTP nu : deux appels vers VOTRE serveur.
 *
 * Sans SDK, sans dépendance, sans fournisseur. C'est le transport à prendre
 * quand le backend est une API maison, une fonction serverless, ou un serveur
 * `web-push` classique — c'est-à-dire la majorité des cas où l'on n'a pas déjà
 * Firebase ou Supabase.
 *
 * Les en-têtes de corrélation sont joints quand l'app les a installés : un
 * abonnement qui échoue doit être rapprochable de la session qui l'a tenté.
 */
import { correlationHeaders } from '../correlation.js';

/**
 * @param {{ subscribeUrl: string, unsubscribeUrl?: string, headers?: object|(() => object),
 *   vapidKey?: string, fetch?: Function }} options
 */
export function httpPushTransport(options) {
  const {
    subscribeUrl,
    unsubscribeUrl = subscribeUrl,
    vapidKey,
    fetch: fetchImpl,
  } = options ?? {};
  if (!subscribeUrl) {
    throw new Error('push/webpush: `subscribeUrl` est requis');
  }

  const doFetch = (...args) => (fetchImpl ?? globalThis.fetch)(...args);

  async function headers() {
    const extra =
      typeof options.headers === 'function'
        ? await options.headers()
        : (options.headers ?? {});
    return {
      'content-type': 'application/json',
      ...correlationHeaders(),
      ...extra,
    };
  }

  async function send(url, method, body) {
    const response = await doFetch(url, {
      method,
      headers: await headers(),
      body: JSON.stringify(body),
      // L'abonnement appartient à l'utilisateur connecté : le cookie de
      // session doit partir avec, y compris en cross-origin.
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(
        `push/webpush: ${response.status} ${response.statusText}`
      );
    }
    return response;
  }

  return {
    key: () => vapidKey,
    save: (subscription, context) =>
      send(subscribeUrl, 'POST', { subscription, ...context }),
    remove: (subscription, context) =>
      send(unsubscribeUrl, 'DELETE', { subscription, ...context }),
  };
}
