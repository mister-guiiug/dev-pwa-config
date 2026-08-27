/**
 * Transport Supabase : les abonnements vivent dans une table, protégée par RLS.
 *
 * Peer OPTIONNEL : `@supabase/supabase-js`. Le client est INJECTÉ plutôt
 * qu'importé — l'app en a déjà un, en créer un second ouvrirait une seconde
 * connexion temps réel et dupliquerait la session.
 *
 * CE QUE SUPABASE NE FAIT PAS. Il n'y a pas de service de push chez Supabase :
 * il stocke l'abonnement, et c'est une Edge Function à vous qui l'utilisera
 * avec `web-push` et vos clés VAPID. Le SQL et la fonction sont donnés en
 * commentaire plus bas — ce paquet ne déploie rien.
 *
 * La table attendue :
 *
 *   create table public.push_subscriptions (
 *     endpoint    text primary key,
 *     user_id     uuid not null references auth.users (id) on delete cascade,
 *     p256dh      text not null,
 *     auth        text not null,
 *     user_agent  text,
 *     created_at  timestamptz not null default now()
 *   );
 *   alter table public.push_subscriptions enable row level security;
 *   -- Chacun ne voit et ne gère QUE ses propres abonnements.
 *   create policy "propre abonnement" on public.push_subscriptions
 *     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 *
 * `endpoint` en clé primaire, et non un identifiant technique : c'est ce que
 * le navigateur rend, il est unique par appareil ET par abonnement, et il
 * change quand l'utilisateur se réabonne. Un `upsert` dessus est idempotent.
 */

/**
 * @param {{ client: object, table?: string, userId?: string|(() => Promise<string|null>),
 *   vapidKey?: string }} options
 */
export function supabasePushTransport(options) {
  const { client, table = 'push_subscriptions', vapidKey } = options ?? {};
  if (!client?.from) {
    throw new Error('push/supabase: un client Supabase est requis');
  }

  /** L'utilisateur courant : donné, calculé, ou lu dans la session. */
  async function resolveUserId(context) {
    if (context?.userId) return context.userId;
    if (typeof options.userId === 'function') return options.userId();
    if (options.userId) return options.userId;
    const { data } = await client.auth.getUser();
    return data?.user?.id ?? null;
  }

  return {
    key: () => vapidKey,

    async save(subscription, context) {
      const userId = await resolveUserId(context);
      // Sans utilisateur, l'insertion violerait la contrainte NOT NULL et
      // la politique RLS : autant le dire ici, où le message est lisible.
      if (!userId) throw new Error('push/supabase: utilisateur inconnu');

      const { error } = await client.from(table).upsert(
        {
          endpoint: subscription.endpoint,
          user_id: userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: globalThis.navigator?.userAgent ?? null,
        },
        { onConflict: 'endpoint' }
      );
      if (error) throw new Error(`push/supabase: ${error.message}`);
    },

    async remove(subscription) {
      const { error } = await client
        .from(table)
        .delete()
        .eq('endpoint', subscription.endpoint);
      if (error) throw new Error(`push/supabase: ${error.message}`);
    },
  };
}
