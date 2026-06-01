create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "users read own app state" on public.app_state;
create policy "users read own app state"
on public.app_state for select
using (auth.uid() = user_id);

drop policy if exists "users write own app state" on public.app_state;
create policy "users write own app state"
on public.app_state for insert
with check (auth.uid() = user_id);

drop policy if exists "users update own app state" on public.app_state;
create policy "users update own app state"
on public.app_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  is_admin boolean not null default false,
  is_gm boolean not null default false,
  is_player boolean not null default true,
  updated_at timestamptz not null default now()
);

create extension if not exists pgcrypto;

alter table public.profiles enable row level security;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where profiles.user_id = is_admin.user_id
      and profiles.is_admin = true
  );
$$;

create or replace function public.is_gm(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where profiles.user_id = is_gm.user_id
      and profiles.is_gm = true
  );
$$;

drop policy if exists "gms read app state" on public.app_state;
create policy "gms read app state"
on public.app_state for select
using (public.is_gm(auth.uid()));

create table if not exists public.messages (
  id uuid primary key,
  workspace_id uuid,
  thread_id uuid not null,
  parent_id uuid references public.messages(id) on delete set null,
  campaign_id text,
  session_id text,
  character_id text,
  from_user_id uuid references auth.users(id) on delete set null,
  from_role text not null default 'player',
  to_user_id uuid references auth.users(id) on delete set null,
  to_role text,
  to_character_id text,
  body text not null,
  status text not null default 'unread',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.messages add column if not exists workspace_id uuid;

create table if not exists public.workspaces (
  id uuid primary key,
  name text not null,
  owner_id uuid references auth.users(id) on delete set null,
  preset_pack_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null default 'player',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid,
  email text not null,
  code text not null unique,
  role text not null default 'player',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspace_invites add column if not exists campaign_id uuid;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

create or replace function public.is_workspace_member(target_workspace_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = target_workspace_id
      and workspace_members.user_id = target_user_id
      and workspace_members.status = 'active'
  );
$$;

drop policy if exists "members read workspaces" on public.workspaces;
create policy "members read workspaces"
on public.workspaces for select
using (
  owner_id = auth.uid()
  or public.is_gm(auth.uid())
  or public.is_workspace_member(workspaces.id, auth.uid())
);

drop policy if exists "gms create workspaces" on public.workspaces;
create policy "gms create workspaces"
on public.workspaces for insert
with check (public.is_gm(auth.uid()) or owner_id = auth.uid());

drop policy if exists "owners update workspaces" on public.workspaces;
create policy "owners update workspaces"
on public.workspaces for update
using (owner_id = auth.uid() or public.is_gm(auth.uid()))
with check (owner_id = auth.uid() or public.is_gm(auth.uid()));

drop policy if exists "members read workspace members" on public.workspace_members;
create policy "members read workspace members"
on public.workspace_members for select
using (
  user_id = auth.uid()
  or public.is_gm(auth.uid())
  or public.is_workspace_member(workspace_members.workspace_id, auth.uid())
);

drop policy if exists "gms manage workspace members" on public.workspace_members;
create policy "gms manage workspace members"
on public.workspace_members for all
using (public.is_gm(auth.uid()))
with check (public.is_gm(auth.uid()));

drop policy if exists "gms manage workspace invites" on public.workspace_invites;
create policy "gms manage workspace invites"
on public.workspace_invites for all
using (public.is_gm(auth.uid()))
with check (public.is_gm(auth.uid()));

create or replace function public.accept_workspace_invite(invite_code text)
returns table (
  id uuid,
  workspace_id uuid,
  campaign_id uuid,
  email text,
  role text,
  status text,
  workspace_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_record record;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'Du musst eingeloggt sein, um eine Einladung anzunehmen.';
  end if;

  select lower(coalesce(users.email, profiles.email, ''))
  into current_email
  from auth.users
  left join public.profiles on profiles.user_id = users.id
  where users.id = auth.uid();

  select workspace_invites.*, workspaces.name as workspace_name
  into invite_record
  from public.workspace_invites
  join public.workspaces on workspaces.id = workspace_invites.workspace_id
  where upper(workspace_invites.code) = upper(trim(invite_code))
    and workspace_invites.status = 'open'
  limit 1;

  if not found then
    raise exception 'Einladungscode nicht gefunden oder nicht mehr offen.';
  end if;

  if lower(invite_record.email) <> current_email and not public.is_gm(auth.uid()) then
    raise exception 'Diese Einladung gehoert zu einer anderen E-Mail-Adresse.';
  end if;

  insert into public.workspace_members (workspace_id, user_id, email, role, status, updated_at)
  values (invite_record.workspace_id, auth.uid(), current_email, invite_record.role, 'active', now())
  on conflict (workspace_id, user_id) do update
  set
    email = excluded.email,
    role = excluded.role,
    status = 'active',
    updated_at = now();

  if invite_record.campaign_id is not null then
    insert into public.campaign_members (campaign_id, workspace_id, user_id, role, character_ids, status, updated_at)
    values (invite_record.campaign_id, invite_record.workspace_id, auth.uid(), invite_record.role, '{}', 'active', now())
    on conflict (campaign_id, user_id) do update
    set
      workspace_id = excluded.workspace_id,
      role = excluded.role,
      status = 'active',
      updated_at = now();
  end if;

  update public.workspace_invites
  set status = 'accepted', updated_at = now()
  where workspace_invites.id = invite_record.id;

  return query
  select
    invite_record.id,
    invite_record.workspace_id,
    invite_record.campaign_id,
    invite_record.email,
    invite_record.role,
    'accepted'::text,
    invite_record.workspace_name,
    invite_record.created_at,
    now();
end;
$$;

create index if not exists workspace_members_user_idx on public.workspace_members(user_id);
create index if not exists workspace_invites_workspace_idx on public.workspace_invites(workspace_id);

create index if not exists messages_from_user_idx on public.messages(from_user_id);
create index if not exists messages_to_user_idx on public.messages(to_user_id);
create index if not exists messages_character_idx on public.messages(character_id);
create index if not exists messages_to_character_idx on public.messages(to_character_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);

alter table public.messages enable row level security;

drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages"
on public.messages for select
using (
  public.is_gm(auth.uid())
  or from_user_id = auth.uid()
  or to_user_id = auth.uid()
);

drop policy if exists "participants create messages" on public.messages;
create policy "participants create messages"
on public.messages for insert
with check (
  public.is_gm(auth.uid())
  or from_user_id = auth.uid()
);

drop policy if exists "participants update messages" on public.messages;
create policy "participants update messages"
on public.messages for update
using (
  public.is_gm(auth.uid())
  or from_user_id = auth.uid()
  or to_user_id = auth.uid()
)
with check (
  public.is_gm(auth.uid())
  or from_user_id = auth.uid()
  or to_user_id = auth.uid()
);

create table if not exists public.campaigns (
  id uuid primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  character_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_sessions (
  id uuid primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  scheduled_at date,
  notes text,
  shop_ids text[] not null default '{}',
  character_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player',
  character_ids text[] not null default '{}',
  active_character_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table if not exists public.characters (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  campaign_status text not null default 'active',
  name text not null default '',
  level integer not null default 1,
  portrait_url text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_gm_modules (
  id uuid primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  item_type text not null default 'note',
  status text not null default 'draft',
  visibility text not null default 'gm',
  scope text not null default 'global',
  campaign_id uuid references public.campaigns(id) on delete cascade,
  session_id uuid references public.campaign_sessions(id) on delete cascade,
  character_id text,
  tags text[] not null default '{}',
  summary text,
  gm_notes text,
  player_text text,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_gm_modules add column if not exists item_type text not null default 'note';
alter table public.custom_gm_modules add column if not exists status text not null default 'draft';
alter table public.custom_gm_modules add column if not exists visibility text not null default 'gm';
alter table public.custom_gm_modules add column if not exists tags text[] not null default '{}';
alter table public.custom_gm_modules add column if not exists summary text;
alter table public.custom_gm_modules add column if not exists gm_notes text;
alter table public.custom_gm_modules add column if not exists player_text text;
alter table public.campaigns add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.campaign_sessions add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.custom_gm_modules add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.campaign_members add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.characters add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.characters add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.characters add column if not exists campaign_status text not null default 'active';
alter table public.characters add column if not exists level integer not null default 1;
alter table public.characters add column if not exists portrait_url text;
alter table public.characters add column if not exists data jsonb not null default '{}'::jsonb;
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'workspace_invites_campaign_id_fkey'
      and table_schema = 'public'
      and table_name = 'workspace_invites'
  ) then
    alter table public.workspace_invites
      add constraint workspace_invites_campaign_id_fkey
      foreign key (campaign_id) references public.campaigns(id) on delete cascade;
  end if;
end $$;

alter table public.campaigns enable row level security;
alter table public.campaign_sessions enable row level security;
alter table public.campaign_members enable row level security;
alter table public.characters enable row level security;
alter table public.custom_gm_modules enable row level security;

create index if not exists campaigns_workspace_idx on public.campaigns(workspace_id);
create index if not exists campaign_sessions_campaign_idx on public.campaign_sessions(campaign_id);
create index if not exists campaign_sessions_workspace_idx on public.campaign_sessions(workspace_id);
create index if not exists campaign_members_user_idx on public.campaign_members(user_id);
create index if not exists campaign_members_workspace_idx on public.campaign_members(workspace_id);
create index if not exists characters_workspace_idx on public.characters(workspace_id);
create index if not exists characters_owner_idx on public.characters(owner_id);
create index if not exists characters_updated_at_idx on public.characters(updated_at desc);

drop policy if exists "members read campaigns" on public.campaigns;
create policy "members read campaigns"
on public.campaigns for select
using (
  public.is_gm(auth.uid())
  or public.is_workspace_member(campaigns.workspace_id, auth.uid())
  or exists (
    select 1 from public.campaign_members
    where campaign_members.campaign_id = campaigns.id
      and campaign_members.user_id = auth.uid()
      and campaign_members.status = 'active'
  )
);

drop policy if exists "gms manage campaigns" on public.campaigns;
create policy "gms manage campaigns"
on public.campaigns for all
using (public.is_gm(auth.uid()))
with check (public.is_gm(auth.uid()));

drop policy if exists "members read campaign sessions" on public.campaign_sessions;
create policy "members read campaign sessions"
on public.campaign_sessions for select
using (
  public.is_gm(auth.uid())
  or public.is_workspace_member(campaign_sessions.workspace_id, auth.uid())
  or exists (
    select 1 from public.campaign_members
    where campaign_members.campaign_id = campaign_sessions.campaign_id
      and campaign_members.user_id = auth.uid()
      and campaign_members.status = 'active'
  )
);

drop policy if exists "gms manage campaign sessions" on public.campaign_sessions;
create policy "gms manage campaign sessions"
on public.campaign_sessions for all
using (public.is_gm(auth.uid()))
with check (public.is_gm(auth.uid()));

drop policy if exists "members read campaign members" on public.campaign_members;
create policy "members read campaign members"
on public.campaign_members for select
using (
  user_id = auth.uid()
  or public.is_gm(auth.uid())
  or public.is_workspace_member(campaign_members.workspace_id, auth.uid())
);

drop policy if exists "players manage own campaign membership" on public.campaign_members;
create policy "players manage own campaign membership"
on public.campaign_members for all
using (
  user_id = auth.uid()
  or public.is_gm(auth.uid())
)
with check (
  public.is_gm(auth.uid())
  or (
    user_id = auth.uid()
    and public.is_workspace_member(workspace_id, auth.uid())
  )
);

drop policy if exists "members read characters" on public.characters;
create policy "members read characters"
on public.characters for select
using (
  owner_id = auth.uid()
  or public.is_admin(auth.uid())
  or public.is_workspace_member(characters.workspace_id, auth.uid())
  or exists (
    select 1 from public.campaign_members
    where campaign_members.workspace_id = characters.workspace_id
      and campaign_members.user_id = auth.uid()
      and campaign_members.status = 'active'
      and characters.id = any(campaign_members.character_ids)
  )
);

drop policy if exists "members create characters" on public.characters;
create policy "members create characters"
on public.characters for insert
with check (
  owner_id = auth.uid()
  or public.is_workspace_member(workspace_id, auth.uid())
);

drop policy if exists "owners and workspace members update characters" on public.characters;
create policy "owners and workspace members update characters"
on public.characters for update
using (
  owner_id = auth.uid()
  or public.is_workspace_member(workspace_id, auth.uid())
)
with check (
  owner_id = auth.uid()
  or public.is_workspace_member(workspace_id, auth.uid())
);

drop policy if exists "owners and workspace members delete characters" on public.characters;
create policy "owners and workspace members delete characters"
on public.characters for delete
using (
  owner_id = auth.uid()
  or public.is_workspace_member(workspace_id, auth.uid())
);

drop policy if exists "gms manage custom gm modules" on public.custom_gm_modules;
create policy "gms manage custom gm modules"
on public.custom_gm_modules for all
using (public.is_gm(auth.uid()))
with check (public.is_gm(auth.uid()));

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select
using (auth.uid() = user_id);

drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles"
on public.profiles for select
using (public.is_admin(auth.uid()));

drop policy if exists "gms read profiles" on public.profiles;
create policy "gms read profiles"
on public.profiles for select
using (public.is_gm(auth.uid()));

drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles"
on public.profiles for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "gms update profiles" on public.profiles;
create policy "gms update profiles"
on public.profiles for update
using (public.is_gm(auth.uid()))
with check (public.is_gm(auth.uid()));

create or replace function public.list_auth_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_admin boolean,
  is_gm boolean,
  is_player boolean,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    users.id,
    coalesce(users.email, profiles.email, ''),
    users.created_at,
    users.last_sign_in_at,
    coalesce(profiles.is_admin, false),
    coalesce(profiles.is_gm, false),
    coalesce(profiles.is_player, true),
    coalesce(profiles.updated_at, users.updated_at)
  from auth.users
  left join public.profiles on profiles.user_id = users.id
  where public.is_admin(auth.uid())
  order by coalesce(users.email, profiles.email, '');
$$;

create or replace function public.admin_set_user_password(target_user_id uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Nur Admins duerfen Passwoerter setzen.';
  end if;
  if length(coalesce(new_password, '')) < 6 then
    raise exception 'Passwort muss mindestens 6 Zeichen lang sein.';
  end if;

  update auth.users
  set
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Nutzer nicht gefunden.';
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fateweaver-assets',
  'fateweaver-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read fateweaver assets" on storage.objects;
create policy "public read fateweaver assets"
on storage.objects for select
using (bucket_id = 'fateweaver-assets');

drop policy if exists "users upload own fateweaver assets" on storage.objects;
create policy "users upload own fateweaver assets"
on storage.objects for insert
with check (
  bucket_id = 'fateweaver-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "users update own fateweaver assets" on storage.objects;
create policy "users update own fateweaver assets"
on storage.objects for update
using (
  bucket_id = 'fateweaver-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'fateweaver-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "users delete own fateweaver assets" on storage.objects;
create policy "users delete own fateweaver assets"
on storage.objects for delete
using (
  bucket_id = 'fateweaver-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);
