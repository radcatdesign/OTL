-- On The Lawn: database schema for Supabase (Postgres + Auth + Storage).
-- Mirrors src/lib/types.ts and the permission rules in src/lib/perms.ts.
-- Run it in the Supabase SQL editor, then wire the actions in src/lib/store.ts
-- to these tables and functions (see README, "Going live").

create extension if not exists pgcrypto;
create extension if not exists citext;

-- People -------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  email citext not null,
  role text not null default 'Other',
  bio text not null default '',
  link text,
  intents text[] not null default '{}',         -- GuideIntent keys from Otis' guide
  otis jsonb not null,                           -- OtisLook: hat, overalls, tool, band, companion, card
  created_at timestamptz not null default now()
);

-- Groups and roles ---------------------------------------------------------
-- host and cohost: full admin. moderator: creates lawns and answers chat, can't
-- invite, remove, or ban. member: joins lawns, chats, plants seeds.
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,48}$'),
  name text not null check (char_length(name) between 3 and 40),
  tagline text not null default '',
  about text not null default '',
  color text not null default 'lawn',
  city text not null default 'Bend, OR',
  reply_to citext not null,                      -- where campaign replies land
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'cohost', 'moderator', 'member')),
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
-- Exactly one host per group.
create unique index if not exists one_host_per_group on public.group_members (group_id) where role = 'host';

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  email citext not null,
  role text not null default 'member' check (role in ('cohost', 'moderator', 'member')),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  sent_count int not null default 1,
  created_at timestamptz not null default now(),
  unique (group_id, email)
);

create table if not exists public.group_bans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  email citext not null,
  name text not null default '',
  reason text not null default '',
  banned_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (group_id, email)
);

-- Lawns (events) -----------------------------------------------------------
create table if not exists public.lawns (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  code text not null unique,                     -- invite code, e.g. PINE42
  title text not null check (char_length(title) between 3 and 60),
  about text not null default '',
  host_id uuid not null references public.profiles (id) on delete cascade,
  cohost_ids uuid[] not null default '{}',       -- shown under "Hosted by"
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  venue text not null,
  address text not null default '',
  lat double precision,
  lng double precision,
  cover jsonb not null default '{"kind":"art","art":"lawn"}', -- {kind:'art',art} or {kind:'photo',path}
  color text not null default 'lawn',
  visibility text not null default 'public' check (visibility in ('public', 'invite')),
  capacity int check (capacity is null or capacity > 0),
  chat_enabled boolean not null default true,
  photos_enabled boolean not null default true,
  contribution_mode text not null default 'free' check (contribution_mode in ('free', 'donate')),
  contribution_amount int not null default 0 check (contribution_amount >= 0), -- honest system: pledged, not verified
  created_at timestamptz not null default now()
);

-- The gate code lives apart so only lawn staff can read it.
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
  email citext not null,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lawn_id, email)
);

-- Lawn chat and photo wall -------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  lawn_id uuid not null references public.lawns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 1000),
  reply_to uuid references public.messages (id) on delete set null,
  hidden_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  lawn_id uuid not null references public.lawns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null,                            -- storage object in the lawn-photos bucket
  caption text not null default '' check (char_length(caption) <= 140),
  created_at timestamptz not null default now()
);

create table if not exists public.photo_likes (
  photo_id uuid not null references public.photos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
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
  partners uuid[] not null default '{}',
  spot_x real check (spot_x between 0 and 1),   -- where it sits in the walkable garden
  spot_y real check (spot_y between 0 and 1)
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

-- Email list and campaigns -------------------------------------------------
create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default 'sky',
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  email citext not null,
  name text not null default '',
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  source text not null default 'manual' check (source in ('member', 'rsvp', 'import', 'manual')),
  user_id uuid references public.profiles (id) on delete set null,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (group_id, email)
);

create table if not exists public.contact_list_members (
  list_id uuid not null references public.contact_lists (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  primary key (list_id, contact_id)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null default 'Untitled campaign',
  subject text not null default '',
  preheader text not null default '',
  from_name text not null,
  accent text not null default 'lawn',
  blocks jsonb not null default '[]',            -- CampaignBlock[]
  audience jsonb not null default '{"all":true,"listIds":[]}',
  html text,                                     -- rendered when scheduled or sent, with {{first_name}} left for the sender
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipients int not null default 0,
  opens int not null default 0,
  clicks int not null default 0,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'scheduled' or scheduled_at is not null)
);

-- One row per recipient. Written by the sending function, updated by the email provider's webhooks.
create table if not exists public.campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  email citext not null,
  provider_id text,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  unique (campaign_id, email)
);

create index if not exists group_members_user_idx on public.group_members (user_id);
create index if not exists lawns_group_idx on public.lawns (group_id, starts_at);
create index if not exists memberships_lawn_idx on public.memberships (lawn_id);
create index if not exists memberships_user_idx on public.memberships (user_id);
create index if not exists messages_lawn_idx on public.messages (lawn_id, created_at);
create index if not exists photos_lawn_idx on public.photos (lawn_id, created_at desc);
create index if not exists seeds_lawn_idx on public.seeds (lawn_id);
create index if not exists waterings_seed_idx on public.waterings (seed_id);
create index if not exists activity_lawn_idx on public.activity (lawn_id, created_at desc);
create index if not exists contacts_group_idx on public.contacts (group_id, status);
create index if not exists campaigns_due_idx on public.campaigns (scheduled_at) where status = 'scheduled';

-- Permission helpers ---------------------------------------------------------
-- Same rules as src/lib/perms.ts. Policies below call these.

create or replace function public.group_role(g uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from group_members where group_id = g and user_id = auth.uid();
$$;

create or replace function public.can(g uuid, ability text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when ability in ('editGroup', 'manageRoles', 'inviteMembers', 'removeMembers', 'banMembers', 'manageEmail', 'sendCampaigns')
      then public.group_role(g) in ('host', 'cohost')
    when ability in ('createEvents', 'moderateChat', 'viewStats')
      then public.group_role(g) in ('host', 'cohost', 'moderator')
    else false
  end;
$$;

-- The host can act on anyone else. Co-hosts can act on moderators and members, not on each other.
create or replace function public.outranks(g uuid, target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.group_role(g)
    when 'host' then coalesce((select role from group_members where group_id = g and user_id = target), 'member') <> 'host'
    when 'cohost' then coalesce((select role from group_members where group_id = g and user_id = target), 'member') in ('moderator', 'member')
    else false
  end;
$$;

create or replace function public.is_banned(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_bans b
    where b.group_id = g and (b.user_id = auth.uid() or b.email = (auth.jwt() ->> 'email')::citext)
  );
$$;

create or replace function public.lawn_can(l uuid, ability text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can((select group_id from lawns where id = l), ability);
$$;

-- Lawn staff: its host, its listed co-hosts, and the group's hosts, co-hosts, and moderators.
create or replace function public.is_lawn_staff(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from lawns x where x.id = l and (x.host_id = auth.uid() or auth.uid() = any (x.cohost_ids)))
      or public.lawn_can(l, 'createEvents');
$$;

create or replace function public.is_member(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.lawn_id = l and m.user_id = auth.uid())
      or public.is_lawn_staff(l);
$$;

-- The garden opens for lawn staff and anyone who checked in.
create or replace function public.can_enter_garden(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_lawn_staff(l)
      or exists (select 1 from memberships m where m.lawn_id = l and m.user_id = auth.uid() and m.status = 'here');
$$;

create or replace function public.lawn_visible(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from lawns x where x.id = l and (x.visibility = 'public' or public.is_member(x.id)))
     and not public.is_banned((select group_id from lawns where id = l));
$$;

-- Actions that touch more than one table -------------------------------------

-- Starting a group makes you its host.
create or replace function public.on_group_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into group_members (group_id, user_id, role) values (new.id, new.created_by, 'host');
  return new;
end $$;
drop trigger if exists group_created on public.groups;
create trigger group_created after insert on public.groups for each row execute function public.on_group_created();

-- Joining a group or RSVPing to one of its lawns puts you on its email list.
create or replace function public.add_contact_for(g uuid, u uuid, src text) returns void
language sql security definer set search_path = public as $$
  insert into contacts (group_id, email, name, source, user_id)
  select g, p.email, p.name, src, p.id from profiles p where p.id = u
  on conflict (group_id, email) do update set user_id = excluded.user_id;
$$;

create or replace function public.on_member_added() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.add_contact_for(new.group_id, new.user_id, 'member');
  return new;
end $$;
drop trigger if exists member_added on public.group_members;
create trigger member_added after insert on public.group_members for each row execute function public.on_member_added();

create or replace function public.on_rsvp() returns trigger
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  select group_id into g from lawns where id = new.lawn_id;
  if exists (select 1 from group_bans b join profiles p on p.id = new.user_id
             where b.group_id = g and (b.user_id = new.user_id or b.email = p.email)) then
    raise exception 'banned from this group';
  end if;
  if new.status <> 'invited' then
    insert into group_members (group_id, user_id, role) values (g, new.user_id, 'member') on conflict do nothing;
    perform public.add_contact_for(g, new.user_id, 'rsvp');
  end if;
  return new;
end $$;
drop trigger if exists rsvp_added on public.memberships;
create trigger rsvp_added before insert on public.memberships for each row execute function public.on_rsvp();

-- Change someone's role. Handing over hosting demotes the old host to co-host.
create or replace function public.set_member_role(g uuid, target uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can(g, 'manageRoles') then raise exception 'not allowed'; end if;
  if new_role = 'host' then
    if public.group_role(g) <> 'host' then raise exception 'only the host can hand over hosting'; end if;
    update group_members set role = 'cohost' where group_id = g and user_id = auth.uid();
  elsif target <> auth.uid() and not public.outranks(g, target) then
    raise exception 'only the host can change a co-host';
  end if;
  update group_members set role = new_role where group_id = g and user_id = target;
end $$;

-- The ban hammer: out of the group, off upcoming lawns, chat hidden, no more email.
create or replace function public.ban_member(g uuid, target uuid, why text) returns void
language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  if not public.can(g, 'banMembers') or target = auth.uid() or not public.outranks(g, target) then
    raise exception 'not allowed';
  end if;
  select * into p from profiles where id = target;
  insert into group_bans (group_id, user_id, email, name, reason, banned_by)
  values (g, target, p.email, p.name, coalesce(nullif(trim(why), ''), 'No reason given'), auth.uid())
  on conflict (group_id, email) do nothing;
  delete from group_members where group_id = g and user_id = target;
  delete from memberships m using lawns x
    where m.lawn_id = x.id and x.group_id = g and m.user_id = target and x.ends_at > now();
  update messages m set hidden_by = auth.uid() from lawns x
    where m.lawn_id = x.id and x.group_id = g and m.user_id = target and m.hidden_by is null;
  update contacts set status = 'unsubscribed' where group_id = g and email = p.email;
end $$;

-- Accept any pending group invites for the signed-in email. Call after sign-in.
create or replace function public.accept_group_invites() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into group_members (group_id, user_id, role, invited_by)
  select i.group_id, auth.uid(), i.role, i.invited_by from group_invites i
  where i.email = (auth.jwt() ->> 'email')::citext and i.status = 'pending'
    and not exists (select 1 from group_bans b where b.group_id = i.group_id and b.email = i.email)
  on conflict (group_id, user_id) do nothing;
  get diagnostics n = row_count;
  update group_invites set status = 'accepted' where email = (auth.jwt() ->> 'email')::citext and status = 'pending';
  return n;
end $$;

-- Check in with the gate code. The only way to reach status 'here'.
create or replace function public.check_in(l uuid, code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if public.is_banned((select group_id from lawns where id = l)) then return false; end if;
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

-- Unsubscribe from the link in the email footer. Called by the unsubscribe edge function.
create or replace function public.unsubscribe(token uuid) returns boolean
language sql security definer set search_path = public as $$
  with u as (update contacts set status = 'unsubscribed' where unsubscribe_token = token returning 1)
  select exists (select 1 from u);
$$;

-- Row level security ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.group_bans enable row level security;
alter table public.lawns enable row level security;
alter table public.lawn_gates enable row level security;
alter table public.memberships enable row level security;
alter table public.email_invites enable row level security;
alter table public.messages enable row level security;
alter table public.photos enable row level security;
alter table public.photo_likes enable row level security;
alter table public.seeds enable row level security;
alter table public.waterings enable row level security;
alter table public.activity enable row level security;
alter table public.contact_lists enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_list_members enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_sends enable row level security;

-- profiles
create policy "profiles are visible to signed-in people" on public.profiles for select to authenticated using (true);
create policy "you create your own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "you edit your own profile" on public.profiles for update to authenticated using (id = auth.uid());

-- groups
create policy "groups are visible" on public.groups for select to authenticated using (true);
create policy "anyone signed in can start a group" on public.groups for insert to authenticated with check (created_by = auth.uid());
create policy "admins edit the group" on public.groups for update to authenticated using (public.can(id, 'editGroup'));
create policy "the host deletes the group" on public.groups for delete to authenticated using (public.group_role(id) = 'host');

-- group_members (role changes go through set_member_role)
create policy "members see each other" on public.group_members for select to authenticated using (public.group_role(group_id) is not null);
create policy "join a group" on public.group_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'member' and not public.is_banned(group_id));
create policy "leave, or admins remove" on public.group_members for delete to authenticated
  using ((user_id = auth.uid() and role <> 'host') or (public.can(group_id, 'removeMembers') and public.outranks(group_id, user_id)));

-- group_invites and bans (bans are written by ban_member)
create policy "admins see invites" on public.group_invites for select to authenticated using (public.can(group_id, 'inviteMembers'));
create policy "admins invite" on public.group_invites for insert to authenticated
  with check (invited_by = auth.uid() and public.can(group_id, 'inviteMembers') and (role <> 'cohost' or public.group_role(group_id) in ('host', 'cohost')));
create policy "admins resend or revoke" on public.group_invites for update to authenticated using (public.can(group_id, 'inviteMembers'));
create policy "admins see bans" on public.group_bans for select to authenticated using (public.can(group_id, 'banMembers'));
create policy "admins lift bans" on public.group_bans for delete to authenticated using (public.can(group_id, 'banMembers'));

-- lawns
create policy "public lawns and your lawns are visible" on public.lawns for select to authenticated
  using ((visibility = 'public' or public.is_member(id)) and not public.is_banned(group_id));
create policy "staff create lawns" on public.lawns for insert to authenticated
  with check (host_id = auth.uid() and public.can(group_id, 'createEvents'));
create policy "staff edit lawns" on public.lawns for update to authenticated using (public.is_lawn_staff(id));
create policy "staff delete lawns" on public.lawns for delete to authenticated using (public.is_lawn_staff(id));

create policy "only staff see the gate" on public.lawn_gates for select to authenticated using (public.is_lawn_staff(lawn_id));
create policy "only staff set the gate" on public.lawn_gates for all to authenticated
  using (public.is_lawn_staff(lawn_id)) with check (public.is_lawn_staff(lawn_id));

-- memberships
create policy "see who's on lawns you can see" on public.memberships for select to authenticated using (public.lawn_visible(lawn_id));
-- RSVP yourself, or invite people to a lawn you're on. Nobody inserts 'here' directly.
create policy "rsvp or invite" on public.memberships for insert to authenticated
  with check (
    (user_id = auth.uid() and status = 'going' and public.lawn_visible(lawn_id))
    or (status = 'invited' and invited_by = auth.uid() and public.is_member(lawn_id))
  );
create policy "accept your invite" on public.memberships for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status in ('invited', 'going'));
create policy "leave a lawn" on public.memberships for delete to authenticated using (user_id = auth.uid());

create policy "members see the invite list" on public.email_invites for select to authenticated using (public.is_member(lawn_id));
create policy "members invite by email" on public.email_invites for insert to authenticated
  with check (invited_by = auth.uid() and public.is_member(lawn_id));

-- chat: guests who RSVP'd and staff can post; staff and moderators can hide anything, you can hide your own.
create policy "chat is visible on lawns you can see" on public.messages for select to authenticated
  using (public.lawn_visible(lawn_id) and (hidden_by is null or user_id = auth.uid() or public.lawn_can(lawn_id, 'moderateChat')));
create policy "guests and staff post" on public.messages for insert to authenticated
  with check (user_id = auth.uid() and hidden_by is null and public.is_member(lawn_id)
              and exists (select 1 from lawns x where x.id = lawn_id and x.chat_enabled));
create policy "hide your own or moderate" on public.messages for update to authenticated
  using (user_id = auth.uid() or public.lawn_can(lawn_id, 'moderateChat'))
  with check (user_id = auth.uid() or public.lawn_can(lawn_id, 'moderateChat'));

-- photos
create policy "photos are visible on lawns you can see" on public.photos for select to authenticated using (public.lawn_visible(lawn_id));
create policy "guests and staff post photos" on public.photos for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(lawn_id)
              and exists (select 1 from lawns x where x.id = lawn_id and x.photos_enabled));
create policy "delete your own or moderate" on public.photos for delete to authenticated
  using (user_id = auth.uid() or public.lawn_can(lawn_id, 'moderateChat'));
create policy "likes are visible" on public.photo_likes for select to authenticated using (true);
create policy "like" on public.photo_likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike" on public.photo_likes for delete to authenticated using (user_id = auth.uid());

-- gardens
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

-- email list and campaigns: hosts and co-hosts only
create policy "admins manage lists" on public.contact_lists for all to authenticated
  using (public.can(group_id, 'manageEmail')) with check (public.can(group_id, 'manageEmail'));
create policy "admins manage contacts" on public.contacts for all to authenticated
  using (public.can(group_id, 'manageEmail')) with check (public.can(group_id, 'manageEmail'));
create policy "admins manage list membership" on public.contact_list_members for all to authenticated
  using (exists (select 1 from contact_lists l where l.id = list_id and public.can(l.group_id, 'manageEmail')))
  with check (exists (select 1 from contact_lists l where l.id = list_id and public.can(l.group_id, 'manageEmail')));
create policy "admins manage campaigns" on public.campaigns for all to authenticated
  using (public.can(group_id, 'sendCampaigns') and status in ('draft', 'scheduled'))
  with check (public.can(group_id, 'sendCampaigns') and status in ('draft', 'scheduled'));
create policy "admins see sent campaigns" on public.campaigns for select to authenticated using (public.can(group_id, 'sendCampaigns'));
create policy "admins see send results" on public.campaign_sends for select to authenticated
  using (exists (select 1 from campaigns c where c.id = campaign_id and public.can(c.group_id, 'sendCampaigns')));
-- campaign_sends rows are written only by the service role (the send-campaigns edge function).

-- Storage --------------------------------------------------------------------
-- Buckets: lawn-photos (photo wall), covers (hero images), email-images (campaign images, public so inboxes can load them).
insert into storage.buckets (id, name, public) values
  ('lawn-photos', 'lawn-photos', false),
  ('covers', 'covers', true),
  ('email-images', 'email-images', true)
on conflict (id) do nothing;

-- Paths are <lawn_id>/<file> for photos and covers, <group_id>/<file> for email images.
create policy "see photos on lawns you can see" on storage.objects for select to authenticated
  using (bucket_id = 'lawn-photos' and public.lawn_visible(((storage.foldername(name))[1])::uuid));
create policy "upload photos to your lawns" on storage.objects for insert to authenticated
  with check (bucket_id = 'lawn-photos' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "staff upload covers" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.is_lawn_staff(((storage.foldername(name))[1])::uuid));
create policy "admins upload email images" on storage.objects for insert to authenticated
  with check (bucket_id = 'email-images' and public.can(((storage.foldername(name))[1])::uuid, 'sendCampaigns'));

-- Realtime -------------------------------------------------------------------
-- Live gardens and chat: stream new seeds, waterings, blooms, messages, and photos to everyone inside.
alter publication supabase_realtime add table public.seeds, public.waterings, public.activity, public.memberships, public.messages, public.photos;

-- Scheduled sends --------------------------------------------------------------
-- Every minute, pg_cron calls the send-campaigns edge function, which picks up
-- campaigns with status 'scheduled' and scheduled_at <= now(), sends them in
-- batches with Resend, writes campaign_sends, and marks them 'sent'.
-- Enable pg_cron and pg_net in the dashboard, store the project URL and service
-- key in Vault, then run:
--
-- select cron.schedule('send-due-campaigns', '* * * * *', $$
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-campaigns',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_key'))
--   );
-- $$);
