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
  name text not null,
  description text,
  character_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_sessions (
  id uuid primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  scheduled_at date,
  notes text,
  shop_ids text[] not null default '{}',
  character_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_gm_modules (
  id uuid primary key,
  name text not null,
  scope text not null default 'global',
  campaign_id uuid references public.campaigns(id) on delete cascade,
  session_id uuid references public.campaign_sessions(id) on delete cascade,
  character_id text,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;
alter table public.campaign_sessions enable row level security;
alter table public.custom_gm_modules enable row level security;

drop policy if exists "gms manage campaigns" on public.campaigns;
create policy "gms manage campaigns"
on public.campaigns for all
using (public.is_gm(auth.uid()))
with check (public.is_gm(auth.uid()));

drop policy if exists "gms manage campaign sessions" on public.campaign_sessions;
create policy "gms manage campaign sessions"
on public.campaign_sessions for all
using (public.is_gm(auth.uid()))
with check (public.is_gm(auth.uid()));

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
