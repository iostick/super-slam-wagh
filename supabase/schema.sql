-- Super Slam Wagh: tablas, permisos y funciones de la liga.
-- Todo vive en el esquema "league", separado de las tablas de War Army (public),
-- así que se puede instalar en el mismo proyecto de Supabase sin mezclar nada.
-- No añade triggers a auth.users: el perfil de la liga se crea al entrar con Discord.
-- Pégalo entero en Supabase > SQL Editor > New query y pulsa Run.
-- Se puede volver a ejecutar sin perder datos.

create schema if not exists league;
grant usage on schema league to anon, authenticated, service_role;

-- ---------- Tipos ----------
do $$ begin
  create type league.user_role as enum ('player', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type league.season_status as enum ('draft', 'registration', 'league', 'playoffs', 'finished');
exception when duplicate_object then null; end $$;

do $$ begin
  create type league.round_phase as enum ('swiss', 'playoff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type league.match_status as enum ('pending', 'reported', 'confirmed', 'double_loss', 'bye');
exception when duplicate_object then null; end $$;

-- ---------- Perfiles (uno por cuenta de Discord) ----------
create table if not exists league.profiles (
  id uuid primary key references auth.users on delete cascade,
  discord_id text unique,
  username text,
  display_name text not null,
  avatar_url text,
  role league.user_role not null default 'player',
  guild_member boolean not null default false,
  created_at timestamptz not null default now()
);

-- La app la llama al iniciar sesión: crea el perfil de la liga con el nombre y el avatar de Discord
-- (o actualiza el avatar). Solo para cuentas con Discord, así que las cuentas de War Army
-- que no entran en la liga no tienen perfil aquí. La primera cuenta que entra queda como administrador.
create or replace function league.ensure_profile() returns void
language plpgsql security definer set search_path = league, public as $$
declare
  meta jsonb;
begin
  select i.identity_data into meta from auth.identities i
    where i.user_id = auth.uid() and i.provider = 'discord'
    order by i.created_at desc limit 1;
  if meta is null then raise exception 'Entra con tu cuenta de Discord para unirte a la liga'; end if;

  insert into league.profiles (id, discord_id, username, display_name, avatar_url, role)
  values (
    auth.uid(),
    coalesce(meta->>'provider_id', meta->>'sub'),
    meta->>'name',
    coalesce(meta->'custom_claims'->>'global_name', meta->>'full_name', meta->>'name', 'Jugador'),
    meta->>'avatar_url',
    case when exists (select 1 from league.profiles) then 'player'::league.user_role else 'admin'::league.user_role end
  )
  on conflict (id) do update set username = excluded.username, avatar_url = excluded.avatar_url;
end $$;

create or replace function league.is_admin() returns boolean
language sql stable security definer set search_path = league, public as $$
  select exists (select 1 from league.profiles where id = auth.uid() and role = 'admin')
$$;

-- ---------- Temporadas ----------
create table if not exists league.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status league.season_status not null default 'draft',
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
create table if not exists league.rounds (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references league.seasons on delete cascade,
  phase league.round_phase not null,
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
create table if not exists league.registrations (
  season_id uuid not null references league.seasons on delete cascade,
  player_id uuid not null references league.profiles on delete cascade,
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
create table if not exists league.matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references league.rounds on delete cascade,
  table_no int not null default 1,
  player_a uuid not null references league.profiles,
  player_b uuid references league.profiles, -- null = descanso (bye)
  vp_a int,
  vp_b int,
  status league.match_status not null default 'pending',
  reported_by uuid references league.profiles,
  reported_at timestamptz,
  confirmed_by uuid references league.profiles,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (player_b is null or player_b <> player_a)
);
create index if not exists matches_round on league.matches (round_id);

-- ---------- Permisos (Row Level Security) ----------
alter table league.profiles enable row level security;
alter table league.seasons enable row level security;
alter table league.rounds enable row level security;
alter table league.registrations enable row level security;
alter table league.matches enable row level security;

-- Todo lo de la liga es visible para cualquier usuario con sesión iniciada
drop policy if exists "Ver perfiles" on league.profiles;
create policy "Ver perfiles" on league.profiles for select to authenticated using (true);
drop policy if exists "Editar mi perfil" on league.profiles;
create policy "Editar mi perfil" on league.profiles for update to authenticated
  using (id = auth.uid() or league.is_admin()) with check (id = auth.uid() or league.is_admin());
drop policy if exists "Ver temporadas" on league.seasons;
create policy "Ver temporadas" on league.seasons for select to authenticated using (true);
drop policy if exists "Admin gestiona temporadas" on league.seasons;
create policy "Admin gestiona temporadas" on league.seasons for all to authenticated
  using (league.is_admin()) with check (league.is_admin());

drop policy if exists "Ver rondas" on league.rounds;
create policy "Ver rondas" on league.rounds for select to authenticated using (true);
drop policy if exists "Admin gestiona rondas" on league.rounds;
create policy "Admin gestiona rondas" on league.rounds for all to authenticated
  using (league.is_admin()) with check (league.is_admin());

drop policy if exists "Ver inscripciones" on league.registrations;
create policy "Ver inscripciones" on league.registrations for select to authenticated using (true);
drop policy if exists "Admin gestiona inscripciones" on league.registrations;
create policy "Admin gestiona inscripciones" on league.registrations for all to authenticated
  using (league.is_admin()) with check (league.is_admin());
-- Cada jugador se inscribe y cambia su lista mientras la inscripción esté abierta
drop policy if exists "Inscribirme" on league.registrations;
create policy "Inscribirme" on league.registrations for insert to authenticated
  with check (player_id = auth.uid() and exists (
    select 1 from league.seasons s where s.id = season_id and s.status = 'registration' and now() < s.registration_closes_at));
drop policy if exists "Cambiar mi lista" on league.registrations;
create policy "Cambiar mi lista" on league.registrations for update to authenticated
  using (player_id = auth.uid() and exists (
    select 1 from league.seasons s where s.id = season_id and s.status = 'registration' and now() < s.registration_closes_at))
  with check (player_id = auth.uid());

drop policy if exists "Ver partidas" on league.matches;
create policy "Ver partidas" on league.matches for select to authenticated using (true);
drop policy if exists "Admin gestiona partidas" on league.matches;
create policy "Admin gestiona partidas" on league.matches for all to authenticated
  using (league.is_admin()) with check (league.is_admin());
-- (Los jugadores reportarán y confirmarán resultados con funciones que llegan en el paso 3.)

-- ---------- Funciones ----------
-- Dar o quitar el rol de administrador (solo un admin puede hacerlo)
create or replace function league.set_role(target uuid, new_role league.user_role) returns void
language plpgsql security definer set search_path = league, public as $$
begin
  if not league.is_admin() then raise exception 'Solo un administrador puede cambiar roles'; end if;
  if target = auth.uid() and new_role <> 'admin' and (select count(*) from league.profiles where role = 'admin') = 1 then
    raise exception 'Eres el único administrador';
  end if;
  update league.profiles set role = new_role where id = target;
end $$;

-- Marca si el jugador está en el servidor de Discord de la liga (lo comprueba la app al iniciar sesión)
create or replace function league.set_guild_member(member boolean) returns void
language sql security definer set search_path = league, public as $$
  update league.profiles set guild_member = member where id = auth.uid()
$$;

-- Guarda la temporada y sustituye su calendario de rondas en una sola operación
create or replace function league.save_season(season jsonb, season_rounds jsonb) returns uuid
language plpgsql security definer set search_path = league, public as $$
declare
  sid uuid := nullif(season->>'id', '')::uuid;
begin
  if not league.is_admin() then raise exception 'Solo un administrador puede guardar temporadas'; end if;
  if sid is not null and exists (
    select 1 from league.matches m join league.rounds r on r.id = m.round_id where r.season_id = sid) then
    raise exception 'La temporada ya tiene partidas; el calendario no se puede regenerar';
  end if;

  if sid is null then
    insert into league.seasons (name, status, registration_closes_at, league_starts_on, swiss_rounds, round_days,
      playoff_size, playoff_round_days, breaks, points_win, points_draw, points_loss, points_limit, reminder_hours)
    values (season->>'name', (season->>'status')::league.season_status, (season->>'registration_closes_at')::timestamptz,
      (season->>'league_starts_on')::date, (season->>'swiss_rounds')::int, (season->>'round_days')::int,
      (season->>'playoff_size')::int, (season->>'playoff_round_days')::int, coalesce(season->'breaks', '[]'::jsonb),
      (season->>'points_win')::int, (season->>'points_draw')::int, (season->>'points_loss')::int,
      (season->>'points_limit')::int, (season->>'reminder_hours')::int)
    returning id into sid;
  else
    update league.seasons set
      name = season->>'name', status = (season->>'status')::league.season_status,
      registration_closes_at = (season->>'registration_closes_at')::timestamptz,
      league_starts_on = (season->>'league_starts_on')::date, swiss_rounds = (season->>'swiss_rounds')::int,
      round_days = (season->>'round_days')::int, playoff_size = (season->>'playoff_size')::int,
      playoff_round_days = (season->>'playoff_round_days')::int, breaks = coalesce(season->'breaks', '[]'::jsonb),
      points_win = (season->>'points_win')::int, points_draw = (season->>'points_draw')::int,
      points_loss = (season->>'points_loss')::int, points_limit = (season->>'points_limit')::int,
      reminder_hours = (season->>'reminder_hours')::int
    where id = sid;
    delete from league.rounds where season_id = sid;
  end if;

  insert into league.rounds (season_id, phase, number, label, starts_on, ends_on, deadline)
  select sid, (r->>'phase')::league.round_phase, (r->>'number')::int, r->>'label',
    (r->>'starts_on')::date, (r->>'ends_on')::date, (r->>'deadline')::timestamptz
  from jsonb_array_elements(season_rounds) r;

  return sid;
end $$;

-- ---------- Acceso a las tablas desde la API ----------
grant select, insert, update, delete on all tables in schema league to authenticated;
grant all on all tables in schema league to service_role;
grant execute on all functions in schema league to authenticated, service_role;
-- Un jugador solo puede cambiar su nombre visible; el rol se cambia con set_role()
revoke update on league.profiles from authenticated;
grant update (display_name) on league.profiles to authenticated;
