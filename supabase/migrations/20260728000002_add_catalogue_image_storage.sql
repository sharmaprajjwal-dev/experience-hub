-- Public catalogue image storage with administrator-only writes.
-- Public bucket downloads are intentional; uploads and deletes remain
-- protected by storage.objects Row Level Security policies.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'experience-images',
  'experience-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Administrators can upload catalogue images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'experience-images'
  and (storage.foldername(name))[1] in (
    'countries',
    'restaurants',
    'experiences',
    'packages'
  )
  and lower(storage.extension(name)) in ('jpg', 'png', 'webp')
  and name ~ '^(countries|restaurants|experiences|packages)/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|webp)$'
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

create policy "Administrators can delete catalogue images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'experience-images'
  and name ~ '^(countries|restaurants|experiences|packages)/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|webp)$'
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

-- Keep legacy hero_image values while preparing normalized fields for future
-- catalogue editing. The object path is canonical; a public URL is derived.
alter table public.countries
  add column image_path text,
  add column image_alt text,
  add column image_width integer,
  add column image_height integer,
  add constraint countries_image_path_format check (
    image_path is null
    or image_path ~ '^countries/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|webp)$'
  ),
  add constraint countries_image_metadata_complete check (
    (image_path is null and image_alt is null)
    or (
      image_path is not null
      and nullif(trim(image_alt), '') is not null
    )
  ),
  add constraint countries_image_dimensions_valid check (
    (image_width is null and image_height is null)
    or (
      image_path is not null
      and image_width > 0
      and image_height > 0
    )
  );

alter table public.restaurants
  add column image_path text,
  add column image_alt text,
  add column image_width integer,
  add column image_height integer,
  add constraint restaurants_image_path_format check (
    image_path is null
    or image_path ~ '^restaurants/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|webp)$'
  ),
  add constraint restaurants_image_metadata_complete check (
    (image_path is null and image_alt is null)
    or (
      image_path is not null
      and nullif(trim(image_alt), '') is not null
    )
  ),
  add constraint restaurants_image_dimensions_valid check (
    (image_width is null and image_height is null)
    or (
      image_path is not null
      and image_width > 0
      and image_height > 0
    )
  );

alter table public.experiences
  add column image_path text,
  add column image_alt text,
  add column image_width integer,
  add column image_height integer,
  add constraint experiences_image_path_format check (
    image_path is null
    or image_path ~ '^experiences/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|webp)$'
  ),
  add constraint experiences_image_metadata_complete check (
    (image_path is null and image_alt is null)
    or (
      image_path is not null
      and nullif(trim(image_alt), '') is not null
    )
  ),
  add constraint experiences_image_dimensions_valid check (
    (image_width is null and image_height is null)
    or (
      image_path is not null
      and image_width > 0
      and image_height > 0
    )
  );

alter table public.packages
  add column image_path text,
  add column image_alt text,
  add column image_width integer,
  add column image_height integer,
  add constraint packages_image_path_format check (
    image_path is null
    or image_path ~ '^packages/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|webp)$'
  ),
  add constraint packages_image_metadata_complete check (
    (image_path is null and image_alt is null)
    or (
      image_path is not null
      and nullif(trim(image_alt), '') is not null
    )
  ),
  add constraint packages_image_dimensions_valid check (
    (image_width is null and image_height is null)
    or (
      image_path is not null
      and image_width > 0
      and image_height > 0
    )
  );
