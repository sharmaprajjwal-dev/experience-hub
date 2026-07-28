-- Administrator authorization for ExperienceHub.
-- Authentication remains in Supabase Auth. This table stores application
-- authorization only, and browser clients cannot assign or change roles.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_allowed check (role in ('member', 'admin'))
);

create index profiles_admin_role_idx
  on public.profiles (role)
  where role = 'admin';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_catalogue_updated_at();

-- Existing Auth users receive a non-privileged profile. An administrator must
-- be promoted explicitly through the trusted Supabase SQL Editor.
insert into public.profiles (id, display_name, role)
select
  users.id,
  nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
  'member'
from auth.users as users
on conflict (id) do nothing;

create or replace function public.handle_new_experiencehub_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    'member'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger experiencehub_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_experiencehub_user();

revoke execute on function public.handle_new_experiencehub_user()
from public, anon, authenticated;

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "Users can read only their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

-- Intentionally no INSERT, UPDATE, or DELETE policy is granted to application
-- users. Role assignment happens only through a trusted administrative path.
