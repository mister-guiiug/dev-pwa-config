-- Table « keep_alive » pour l'anti-pause Supabase Free.
-- À appliquer une fois PAR PROJET (SQL editor du dashboard, ou migration).
-- Le workflow réutilisable pwa-supabase-keepalive.yml fait un SELECT anon
-- dessus tous les ~3 jours → vraie requête DB → reset du compteur d'inactivité.
-- Aucune donnée sensible ; l'anon key est protégée par cette policy en lecture.

create table if not exists public.keep_alive (
  id bigint generated always as identity primary key,
  pinged_at timestamptz not null default now()
);

alter table public.keep_alive enable row level security;

-- Lecture seule pour le rôle anonyme (suffisant : un SELECT exécute une requête).
drop policy if exists "anon read keep_alive" on public.keep_alive;
create policy "anon read keep_alive"
  on public.keep_alive
  for select
  to anon
  using (true);

-- Une ligne de seed (optionnelle : le SELECT compte comme activité même vide).
insert into public.keep_alive default values
on conflict do nothing;
