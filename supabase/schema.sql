-- On The Lawn: database schema for Supabase (Postgres + Auth).
-- Mirrors src/lib/types.ts. Run in the Supabase SQL editor, then wire the actions in
-- src/lib/store.ts to these tables (see README, "Going live").

create extension if not exists pgcrypto;

-- People -------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text not null default 'Other',
  bio text not null default '',
  link text,
  intents text[] not null default '{}',         -- GuideIntent keys from Otis' guide
  otis jsonb not null,                           -- OtisLook: hat, overalls, tool, band, companion, card
  created_at timestamptz not null default now()
);

-- Lawns (events) -----------------------------------------------------------
create table if not exists public.lawns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                     -- invite code, e.g. PINE42
  title text not null check (char_length(title) between 3 and 60),
  about text not null default '',
  host_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  venue text not null,
  address text not null default '',
  color text not null default 'lawn',
  visibility text not null default 'public' check (visibility in ('public', 'invite')),
  capacity int check (capacity is null or capacity > 0),
  contribution_mode text not null default 'free' check (contribution_mode in ('free', 'donate')),
  contribution_amount int not null default 0 check (contribution_amount >= 0), -- honest system: pledged, not verified
  created_at timestamptz not null default now()
);

-- The gate code lives apart so only the host can read it.
create table if not exists public.lawn_gates (
  lawn_id uuid primary key references public.lawns (id) on delete cascade,
  gate text not null
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  lawn_id uuid not null references public.lawns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('invited', 'going', 'here')),
  invited_by uuid references public.profiles (id) on delete set null,
  spot_x real not null default 0.5,
  spot_y real not null default 0.5,
  created_at timestamptz not null default now(),
  checked_in_at timestamptz,
  unique (lawn_id, user_id)
);

create table if not exists public.email_invites (
  id uuid primary key default gen_random_uuid(),
  lawn_id uuid not null references public.lawns (id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lawn_id, email)
);

-- Gardens ------------------------------------------------------------------
create table if not exists public.seeds (
  id uuid primary key default gen_random_uuid(),
  lawn_id uuid not null references public.lawns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  intent text not null check (intent in ('feedback', 'advice', 'mentor', 'mentee', 'collab', 'launch')),
  title text not null check (char_length(title) between 4 and 80),
  details text not null default '',
  link text,
  created_at timestamptz not null default now(),
  bloomed_at timestamptz,
  partners uuid[] not null default '{}'
);

create table if not exists public.waterings (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid not null references public.seeds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 280),
  created_at timestamptz not null default now()
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  lawn_id uuid not null references public.lawns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('joined', 'checked_in', 'planted', 'watered', 'bloomed', 'hosted')),
  seed_id uuid references public.seeds (id) on delete cascade,
  other_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists memberships_lawn_idx on public.memberships (lawn_id);
create index if not exists memberships_user_idx on public.memberships (user_id);
create index if not exists seeds_lawn_idx on public.seeds (lawn_id);
create index if not exists waterings_seed_idx on public.waterings (seed_id);
create index if not exists activity_lawn_idx on public.activity (lawn_id, created_at desc);

-- Access helpers -----------------------------------------------------------
create or replace function public.is_member(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.lawn_id = l and m.user_id = auth.uid())
      or exists (select 1 from lawns x where x.id = l and x.host_id = auth.uid());
$$;

-- The garden opens for the host and anyone who checked in.
create or replace function public.can_enter_garden(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from lawns x where x.id = l and x.host_id = auth.uid())
      or exists (select 1 from memberships m where m.lawn_id = l and m.user_id = auth.uid() and m.status = 'here');
$$;

-- Check in with the gate code. The only way to reach status 'here'.
create or replace function public.check_in(l uuid, code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select upper(g.gate) = upper(trim(code)) into ok from lawn_gates g where g.lawn_id = l;
  if not coalesce(ok, false) then return false; end if;
  insert into memberships (lawn_id, user_id, status, checked_in_at, spot_x, spot_y)
  values (l, auth.uid(), 'here', now(), random() * 0.8 + 0.1, random() * 0.8 + 0.1)
  on conflict (lawn_id, user_id) do update set status = 'here', checked_in_at = now();
  insert into activity (lawn_id, user_id, kind) values (l, auth.uid(), 'checked_in');
  return true;
end $$;

-- Find a lawn by invite code without exposing private lawns in listings.
create or replace function public.lawn_by_code(c text) returns setof public.lawns
language sql stable security definer set search_path = public as $$
  select * from lawns where upper(code) = upper(c) limit 1;
$$;

-- Row level security ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.lawns enable row level security;
alter table public.lawn_gates enable row level security;
alter table public.memberships enable row level security;
alter table public.email_invites enable row level security;
alter table public.seeds enable row level security;
alter table public.waterings enable row level security;
alter table public.activity enable row level security;

create policy "profiles are visible to signed-in people" on public.profiles for select to authenticated using (true);
create policy "you create your own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "you edit your own profile" on public.profiles for update to authenticated using (id = auth.uid());

create policy "public lawns and your lawns are visible" on public.lawns for select to authenticated
  using (visibility = 'public' or public.is_member(id));
create policy "anyone signed in can host" on public.lawns for insert to authenticated with check (host_id = auth.uid());
create policy "hosts edit their lawns" on public.lawns for update to authenticated using (host_id = auth.uid());
create policy "hosts delete their lawns" on public.lawns for delete to authenticated using (host_id = auth.uid());

create policy "only the host sees the gate" on public.lawn_gates for select to authenticated
  using (exists (select 1 from lawns x where x.id = lawn_id and x.host_id = auth.uid()));
create policy "only the host sets the gate" on public.lawn_gates for all to authenticated
  using (exists (select 1 from lawns x where x.id = lawn_id and x.host_id = auth.uid()))
  with check (exists (select 1 from lawns x where x.id = lawn_id and x.host_id = auth.uid()));

create policy "see who's on lawns you can see" on public.memberships for select to authenticated
  using (exists (select 1 from lawns x where x.id = lawn_id and (x.visibility = 'public' or public.is_member(x.id))));
-- RSVP yourself, or invite people to a lawn you're on. Nobody inserts 'here' directly.
create policy "rsvp or invite" on public.memberships for insert to authenticated
  with check (
    (user_id = auth.uid() and status = 'going')
    or (status = 'invited' and invited_by = auth.uid() and public.is_member(lawn_id))
  );
create policy "accept your invite" on public.memberships for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status in ('invited', 'going'));
create policy "leave a lawn" on public.memberships for delete to authenticated using (user_id = auth.uid());

create policy "members see the invite list" on public.email_invites for select to authenticated using (public.is_member(lawn_id));
create policy "members invite by email" on public.email_invites for insert to authenticated
  with check (invited_by = auth.uid() and public.is_member(lawn_id));

create policy "garden is visible after check-in" on public.seeds for select to authenticated using (public.can_enter_garden(lawn_id));
create policy "plant in gardens you've entered" on public.seeds for insert to authenticated
  with check (user_id = auth.uid() and public.can_enter_garden(lawn_id));
create policy "planters bloom their seeds" on public.seeds for update to authenticated using (user_id = auth.uid());
create policy "planters pull their seeds" on public.seeds for delete to authenticated using (user_id = auth.uid());

create policy "waterings are visible in the garden" on public.waterings for select to authenticated
  using (exists (select 1 from seeds s where s.id = seed_id and public.can_enter_garden(s.lawn_id)));
create policy "water other people's seeds" on public.waterings for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from seeds s where s.id = seed_id and s.user_id <> auth.uid() and s.bloomed_at is null and public.can_enter_garden(s.lawn_id))
  );

create policy "garden news for people inside" on public.activity for select to authenticated using (public.can_enter_garden(lawn_id) or public.is_member(lawn_id));
create policy "log your own activity" on public.activity for insert to authenticated with check (user_id = auth.uid() and public.is_member(lawn_id));

-- Live gardens: stream new seeds, waterings, and blooms to everyone inside.
alter publication supabase_realtime add table public.seeds, public.waterings, public.activity, public.memberships;
