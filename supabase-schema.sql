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
