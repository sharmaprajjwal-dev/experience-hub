-- ExperienceHub catalogue schema.
-- Public clients receive SELECT access only; all writes require a future,
-- trusted server-side workflow that is intentionally outside Milestone 6.

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  country_code text not null,
  short_description text not null,
  hero_image text not null,
  currency_code text not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint countries_slug_unique unique (slug),
  constraint countries_country_code_unique unique (country_code),
  constraint countries_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint countries_country_code_format check (
    country_code ~ '^[A-Z]{2}$'
  ),
  constraint countries_currency_code_format check (
    currency_code ~ '^[A-Z]{3}$'
  )
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries (id) on delete restrict,
  name text not null,
  slug text not null,
  city text not null,
  short_description text not null,
  hero_image text not null,
  fictional boolean not null default false,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_slug_unique unique (slug),
  constraint restaurants_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  name text not null,
  slug text not null,
  type text not null,
  short_description text not null,
  long_description text not null,
  hero_image text not null,
  featured boolean not null default false,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiences_slug_unique unique (slug),
  constraint experiences_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete restrict,
  name text not null,
  slug text not null,
  short_description text not null,
  full_description text not null,
  price numeric(12, 2) not null,
  price_status text not null default 'placeholder',
  currency text not null,
  number_of_guests integer not null,
  suggested_guest_range text not null,
  duration text not null,
  who_it_suits text not null,
  included_items text[] not null,
  optional_notes text,
  featured boolean not null default false,
  active boolean not null default false,
  booking_status text not null default 'coming-soon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packages_slug_unique unique (slug),
  constraint packages_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint packages_price_nonnegative check (price >= 0),
  constraint packages_price_status_allowed check (
    price_status in ('placeholder', 'confirmed')
  ),
  constraint packages_currency_format check (
    currency ~ '^[A-Z]{3}$'
  ),
  constraint packages_guest_count_positive check (number_of_guests > 0),
  constraint packages_included_items_present check (
    cardinality(included_items) > 0
  ),
  constraint packages_booking_status_allowed check (
    booking_status in ('available', 'coming-soon', 'unavailable')
  )
);

create index restaurants_active_country_idx
  on public.restaurants (country_id)
  where active;

create index experiences_active_restaurant_idx
  on public.experiences (restaurant_id)
  where active;

create index experiences_featured_idx
  on public.experiences (featured)
  where active and featured;

create index packages_active_experience_idx
  on public.packages (experience_id)
  where active;

create index packages_featured_idx
  on public.packages (featured)
  where active and featured;

create or replace function public.set_catalogue_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger countries_set_updated_at
before update on public.countries
for each row execute function public.set_catalogue_updated_at();

create trigger restaurants_set_updated_at
before update on public.restaurants
for each row execute function public.set_catalogue_updated_at();

create trigger experiences_set_updated_at
before update on public.experiences
for each row execute function public.set_catalogue_updated_at();

create trigger packages_set_updated_at
before update on public.packages
for each row execute function public.set_catalogue_updated_at();

revoke execute on function public.set_catalogue_updated_at()
from public, anon, authenticated;

alter table public.countries enable row level security;
alter table public.restaurants enable row level security;
alter table public.experiences enable row level security;
alter table public.packages enable row level security;

-- Remove mutation privileges from public application roles, even if a project
-- has permissive default grants. No INSERT, UPDATE, or DELETE policies follow.
revoke all on table public.countries from anon, authenticated;
revoke all on table public.restaurants from anon, authenticated;
revoke all on table public.experiences from anon, authenticated;
revoke all on table public.packages from anon, authenticated;

grant select on table public.countries to anon, authenticated;
grant select on table public.restaurants to anon, authenticated;
grant select on table public.experiences to anon, authenticated;
grant select on table public.packages to anon, authenticated;

create policy "Active countries are publicly readable"
on public.countries
for select
to anon, authenticated
using (active);

create policy "Active restaurants in active countries are publicly readable"
on public.restaurants
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.countries
    where countries.id = restaurants.country_id
      and countries.active
  )
);

create policy "Active experiences in active restaurants are publicly readable"
on public.experiences
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.restaurants
    join public.countries
      on countries.id = restaurants.country_id
    where restaurants.id = experiences.restaurant_id
      and restaurants.active
      and countries.active
  )
);

create policy "Active packages in active experiences are publicly readable"
on public.packages
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.experiences
    join public.restaurants
      on restaurants.id = experiences.restaurant_id
    join public.countries
      on countries.id = restaurants.country_id
    where experiences.id = packages.experience_id
      and experiences.active
      and restaurants.active
      and countries.active
  )
);
