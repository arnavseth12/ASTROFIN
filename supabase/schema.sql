-- ASTRO accounts and research library.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  interests text[] not null default '{}',
  level text not null default '',
  goal text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.libraries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row level security: every person can only see and change their own rows.
alter table public.profiles enable row level security;
alter table public.libraries enable row level security;

drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "libraries read own" on public.libraries;
drop policy if exists "libraries insert own" on public.libraries;
drop policy if exists "libraries update own" on public.libraries;

create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "libraries read own" on public.libraries for select using (auth.uid() = user_id);
create policy "libraries insert own" on public.libraries for insert with check (auth.uid() = user_id);
create policy "libraries update own" on public.libraries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create the profile automatically when someone signs up. The sign-up form
-- sends name, interests, level and goal as user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, interests, level, goal)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', ''), 60),
    case when jsonb_typeof(new.raw_user_meta_data -> 'interests') = 'array'
      then array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'interests'))
      else '{}'::text[] end,
    left(coalesce(new.raw_user_meta_data ->> 'level', ''), 40),
    left(coalesce(new.raw_user_meta_data ->> 'goal', ''), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets a signed-in person delete their own account and everything attached to it.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
