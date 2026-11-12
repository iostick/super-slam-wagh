-- Super Slam Wagh: tablas, permisos y funciones de la liga.
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run.
-- Se puede volver a ejecutar sin perder datos.

-- ---------- Tipos ----------
do $$ begin
  create type public.user_role as enum ('player', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.season_status as enum ('draft', 'registration', 'league', 'playoffs', 'finished');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.round_phase as enum ('swiss', 'playoff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.match_status as enum ('pending', 'reported', 'confirmed', 'double_loss', 'bye');
exception when duplicate_object then null; end $$;

-- ---------- Perfiles (uno por cuenta de Discord) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  discord_id text unique,
  username text,
  display_name text not null,
  avatar_url text,
  role public.user_role not null default 'player',
  guild_member boolean not null default false,
  created_at timestamptz not null default now()
);

-- Al registrarse con Discord se crea el perfil con su nombre y avatar.
-- La primera cuenta que entra queda como administrador.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, discord_id, username, display_name, avatar_url, role)
  values (
    new.id,
    meta->>'provider_id',
    meta->>'name',
    coalesce(meta->'custom_claims'->>'global_name', meta->>'full_name', meta->>'name', split_part(new.email, '@', 1), 'Jugador'),
    meta->>'avatar_url',
    case when exists (select 1 from public.profiles) then 'player'::public.user_role else 'admin'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ---------- Temporadas ----------
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status public.season_status not null default 'draft',
  registration_closes_at timestamptz not null,
  league_starts_on date not null,
  swiss_rounds int not null default 4 check (swiss_rounds between 1 and 15),
  round_days int not null default 14 check (round_days between 1 and 60),
  playoff_size int not null default 4 check (playoff_size in (0, 2, 4, 8, 16)),
  playoff_round_days int not null default 14 check (playoff_round_days between 1 and 60),
  breaks jsonb not null default '[]'::jsonb, -- [{ "from": "2026-12-24", "to": "2026-12-30", "label": "Navidad" }]
  points_win int not null default 3,
  points_draw int not null default 1,
  points_loss int not null default 0,
  points_limit int not null default 2000,
  reminder_hours int not null default 48,
  created_at timestamptz not null default now()
);

-- ---------- Rondas (jornadas suizas y eliminatorias) ----------
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons on delete cascade,
  phase public.round_phase not null,
  number int not null,
  label text not null,
  starts_on date not null,
  ends_on date not null,
  deadline timestamptz not null, -- después de esta hora, partida sin resultado = doble derrota
  paired_at timestamptz,
  closed_at timestamptz,
  unique (season_id, phase, number),
  check (ends_on >= starts_on)
);

-- ---------- Inscripciones y listas ----------
create table if not exists public.registrations (
  season_id uuid not null references public.seasons on delete cascade,
  player_id uuid not null references public.profiles on delete cascade,
  faction text,
  detachment text,
  list_text text,
  list_points int,
  dropped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (season_id, player_id)
);

-- ---------- Partidas ----------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds on delete cascade,
  table_no int not null default 1,
  player_a uuid not null references public.profiles,
  player_b uuid references public.profiles, -- null = descanso (bye)
  vp_a int,
  vp_b int,
  status public.match_status not null default 'pending',
  reported_by uuid references public.profiles,
  reported_at timestamptz,
  confirmed_by uuid references public.profiles,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (player_b is null or player_b <> player_a)
);
create index if not exists matches_round on public.matches (round_id);

-- ---------- Permisos (Row Level Security) ----------
alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.rounds enable row level security;
alter table public.registrations enable row level security;
alter table public.matches enable row level security;

-- Todo lo de la liga es visible para cualquier usuario con sesión iniciada
drop policy if exists "Ver perfiles" on public.profiles;
create policy "Ver perfiles" on public.profiles for select to authenticated using (true);
drop policy if exists "Editar mi perfil" on public.profiles;
create policy "Editar mi perfil" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
-- Un jugador solo puede cambiar su nombre visible; el rol se cambia con set_role()
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "Ver temporadas" on public.seasons;
create policy "Ver temporadas" on public.seasons for select to authenticated using (true);
drop policy if exists "Admin gestiona temporadas" on public.seasons;
create policy "Admin gestiona temporadas" on public.seasons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Ver rondas" on public.rounds;
create policy "Ver rondas" on public.rounds for select to authenticated using (true);
drop policy if exists "Admin gestiona rondas" on public.rounds;
create policy "Admin gestiona rondas" on public.rounds for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Ver inscripciones" on public.registrations;
create policy "Ver inscripciones" on public.registrations for select to authenticated using (true);
drop policy if exists "Admin gestiona inscripciones" on public.registrations;
create policy "Admin gestiona inscripciones" on public.registrations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Cada jugador se inscribe y cambia su lista mientras la inscripción esté abierta
drop policy if exists "Inscribirme" on public.registrations;
create policy "Inscribirme" on public.registrations for insert to authenticated
  with check (player_id = auth.uid() and exists (
    select 1 from public.seasons s where s.id = season_id and s.status = 'registration' and now() < s.registration_closes_at));
drop policy if exists "Cambiar mi lista" on public.registrations;
create policy "Cambiar mi lista" on public.registrations for update to authenticated
  using (player_id = auth.uid() and exists (
    select 1 from public.seasons s where s.id = season_id and s.status = 'registration' and now() < s.registration_closes_at))
  with check (player_id = auth.uid());

drop policy if exists "Ver partidas" on public.matches;
create policy "Ver partidas" on public.matches for select to authenticated using (true);
drop policy if exists "Admin gestiona partidas" on public.matches;
create policy "Admin gestiona partidas" on public.matches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- (Los jugadores reportarán y confirmarán resultados con funciones que llegan en el paso 3.)

-- ---------- Funciones ----------
-- Dar o quitar el rol de administrador (solo un admin puede hacerlo)
create or replace function public.set_role(target uuid, new_role public.user_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede cambiar roles'; end if;
  if target = auth.uid() and new_role <> 'admin' and (select count(*) from public.profiles where role = 'admin') = 1 then
    raise exception 'Eres el único administrador';
  end if;
  update public.profiles set role = new_role where id = target;
end $$;

-- Marca si el jugador está en el servidor de Discord de la liga (lo comprueba la app al iniciar sesión)
create or replace function public.set_guild_member(member boolean) returns void
language sql security definer set search_path = public as $$
  update public.profiles set guild_member = member where id = auth.uid()
$$;

-- Guarda la temporada y sustituye su calendario de rondas en una sola operación
create or replace function public.save_season(season jsonb, season_rounds jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  sid uuid := nullif(season->>'id', '')::uuid;
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede guardar temporadas'; end if;
  if sid is not null and exists (
    select 1 from public.matches m join public.rounds r on r.id = m.round_id where r.season_id = sid) then
    raise exception 'La temporada ya tiene partidas; el calendario no se puede regenerar';
  end if;

  if sid is null then
    insert into public.seasons (name, status, registration_closes_at, league_starts_on, swiss_rounds, round_days,
      playoff_size, playoff_round_days, breaks, points_win, points_draw, points_loss, points_limit, reminder_hours)
    values (season->>'name', (season->>'status')::public.season_status, (season->>'registration_closes_at')::timestamptz,
      (season->>'league_starts_on')::date, (season->>'swiss_rounds')::int, (season->>'round_days')::int,
      (season->>'playoff_size')::int, (season->>'playoff_round_days')::int, coalesce(season->'breaks', '[]'::jsonb),
      (season->>'points_win')::int, (season->>'points_draw')::int, (season->>'points_loss')::int,
      (season->>'points_limit')::int, (season->>'reminder_hours')::int)
    returning id into sid;
  else
    update public.seasons set
      name = season->>'name', status = (season->>'status')::public.season_status,
      registration_closes_at = (season->>'registration_closes_at')::timestamptz,
      league_starts_on = (season->>'league_starts_on')::date, swiss_rounds = (season->>'swiss_rounds')::int,
      round_days = (season->>'round_days')::int, playoff_size = (season->>'playoff_size')::int,
      playoff_round_days = (season->>'playoff_round_days')::int, breaks = coalesce(season->'breaks', '[]'::jsonb),
      points_win = (season->>'points_win')::int, points_draw = (season->>'points_draw')::int,
      points_loss = (season->>'points_loss')::int, points_limit = (season->>'points_limit')::int,
      reminder_hours = (season->>'reminder_hours')::int
    where id = sid;
    delete from public.rounds where season_id = sid;
  end if;

  insert into public.rounds (season_id, phase, number, label, starts_on, ends_on, deadline)
  select sid, (r->>'phase')::public.round_phase, (r->>'number')::int, r->>'label',
    (r->>'starts_on')::date, (r->>'ends_on')::date, (r->>'deadline')::timestamptz
  from jsonb_array_elements(season_rounds) r;

  return sid;
end $$;
