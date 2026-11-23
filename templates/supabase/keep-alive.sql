-- Table « keep_alive » pour l'anti-pause Supabase Free.
--
-- À poser EN MIGRATION (`supabase/migrations/NNNN_keep_alive.sql`), pas à la
-- main dans l'éditeur SQL : un script « à appliquer une fois par projet »
-- s'oublie. miss-bonus-quest l'a oublié, et son premier keep-alive
-- (23/11/2026) a rendu 404. Le squelette l'a en `0006_keep_alive.sql`
-- (pwa-starter-kit#138).
--
-- Le workflow réutilisable pwa-supabase-keepalive.yml fait un SELECT anon
-- dessus chaque jour → vraie requête DB → reset du compteur d'inactivité.
-- Aucune donnée sensible.
--
-- Rejouable sans effet de bord, donc sans danger sur un projet où la table a
-- déjà été créée à la main.

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

-- Deux verrous, pas un : une policy filtre des LIGNES, un privilège autorise
-- la COMMANDE. Sans le `revoke`, `anon` et `authenticated` gardent INSERT,
-- UPDATE, DELETE et TRUNCATE hérités par défaut, et la RLS ne couvre pas
-- TRUNCATE (relevé de miss-lookhouse, 13/09/2026).
--
-- Le `grant` est indispensable pour un projet né après le 30/10/2026 :
-- Supabase n'y expose plus d'office les tables neuves de `public` (relevé de
-- mister-molkky). Sans lui, le ping répond 401 (`42501`) au lieu de 200.
revoke all on table public.keep_alive from anon, authenticated;
grant select on table public.keep_alive to anon;

-- Une ligne de départ (le SELECT compterait comme activité même à vide, mais
-- une table peuplée rend le ping lisible depuis le dashboard).
-- `on conflict do nothing` ne rendait PAS cet insert idempotent : une clé
-- primaire `identity` ne conflicte jamais, donc rejouer le fichier ajoutait une
-- ligne à chaque fois. La condition, elle, tient.
insert into public.keep_alive (pinged_at)
select now()
where not exists (select 1 from public.keep_alive);
