-- ExperienceHub demonstration catalogue.
-- Prices are explicitly marked as placeholders and are not confirmed business
-- prices. Harbour & Pine and its New Zealand offering are fictional concepts.

insert into public.countries (
  id,
  name,
  slug,
  country_code,
  short_description,
  hero_image,
  currency_code,
  active
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'Nepal',
    'nepal',
    'NP',
    'Warm hospitality, spirited tables, and generous dining experiences shaped by the pleasure of gathering.',
    'media-nepal',
    'NPR',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'New Zealand',
    'new-zealand',
    'NZ',
    'Calm coastal settings, thoughtful local produce, and unhurried experiences made for meaningful occasions.',
    'media-new-zealand',
    'NZD',
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  country_code = excluded.country_code,
  short_description = excluded.short_description,
  hero_image = excluded.hero_image,
  currency_code = excluded.currency_code,
  active = excluded.active;

insert into public.restaurants (
  id,
  country_id,
  name,
  slug,
  city,
  short_description,
  hero_image,
  fictional,
  active
)
values
  (
    '00000000-0000-4000-8000-000000000101',
    (select id from public.countries where slug = 'nepal'),
    'The Pizza House',
    'the-pizza-house',
    'Kathmandu',
    'A welcoming Kathmandu restaurant known for relaxed hospitality, shareable favourites, and tables made for gathering.',
    'media-nepal',
    false,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    (select id from public.countries where slug = 'new-zealand'),
    'Harbour & Pine',
    'harbour-and-pine',
    'Auckland',
    'Fictional demo content: an imagined Auckland dining room shaped around coastal produce, quiet interiors, and an unhurried harbour outlook.',
    'media-new-zealand',
    true,
    true
  )
on conflict (slug) do update set
  country_id = excluded.country_id,
  name = excluded.name,
  city = excluded.city,
  short_description = excluded.short_description,
  hero_image = excluded.hero_image,
  fictional = excluded.fictional,
  active = excluded.active;

insert into public.experiences (
  id,
  restaurant_id,
  name,
  slug,
  type,
  short_description,
  long_description,
  hero_image,
  featured,
  active
)
values
  (
    '00000000-0000-4000-8000-000000000201',
    (select id from public.restaurants where slug = 'the-pizza-house'),
    'Signature Brunch Experience',
    'signature-brunch-experience',
    'Brunch',
    'A lively late-morning table with shareable favourites, thoughtful details, and room to linger.',
    'The Signature Brunch Experience brings the easy warmth of The Pizza House to a generous late-morning gathering. Shared dishes arrive at a relaxed pace, with packages designed around families, couples, and groups of friends.',
    'media-nepal',
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    (select id from public.restaurants where slug = 'harbour-and-pine'),
    'Harbourlight Dinner for Two',
    'harbourlight-dinner-for-two',
    'Dinner',
    'Fictional demo content: a refined couple''s evening with a coastal menu, candlelit pacing, and a quiet harbour mood.',
    'Harbourlight Dinner for Two is an imagined premium evening at the fictional Harbour & Pine in Auckland. The concept pairs a seasonal coastal menu with thoughtful pacing, an intimate table, and time to enjoy the harbour mood together.',
    'media-new-zealand',
    true,
    true
  )
on conflict (slug) do update set
  restaurant_id = excluded.restaurant_id,
  name = excluded.name,
  type = excluded.type,
  short_description = excluded.short_description,
  long_description = excluded.long_description,
  hero_image = excluded.hero_image,
  featured = excluded.featured,
  active = excluded.active;

insert into public.packages (
  id,
  experience_id,
  name,
  slug,
  short_description,
  full_description,
  price,
  price_status,
  currency,
  number_of_guests,
  suggested_guest_range,
  duration,
  who_it_suits,
  included_items,
  optional_notes,
  featured,
  active,
  booking_status
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    (select id from public.experiences where slug = 'signature-brunch-experience'),
    'Family Brunch Package',
    'family-brunch-package',
    'A generous shared brunch arranged for a relaxed family table.',
    'Designed for families who want an easy celebration without rushing, this package brings together shareable brunch favourites, drinks, and a sweet finish for the table.',
    6500,
    'placeholder',
    'NPR',
    4,
    '4–6 guests',
    '2 hours 30 minutes',
    'Families looking for a relaxed, family-friendly brunch with generous shared selections and space to spend time together.',
    array[
      'Family-style shared selection of signature brunch dishes',
      'Hot or cold drink for every guest',
      'Dessert selection for the table'
    ],
    'Placeholder demo price only; this is not a confirmed price from The Pizza House.',
    true,
    true,
    'coming-soon'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    (select id from public.experiences where slug = 'signature-brunch-experience'),
    'Couple Brunch Package',
    'couple-brunch-package',
    'A relaxed brunch for two with shared plates and a thoughtful sweet finish.',
    'An intimate late-morning experience for two, pairing a more considered presentation of savoury brunch dishes with drinks and dessert in the welcoming atmosphere of The Pizza House.',
    3600,
    'placeholder',
    'NPR',
    2,
    '2 guests',
    '2 hours',
    'Two people seeking a quieter, couple-focused brunch with an intimate presentation and time to linger.',
    array[
      'Intimately presented savoury brunch selection',
      'Hot or cold drink for each guest',
      'Dessert to share'
    ],
    'Placeholder demo price only; this is not a confirmed price from The Pizza House.',
    false,
    true,
    'coming-soon'
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    (select id from public.experiences where slug = 'signature-brunch-experience'),
    'Friends Brunch Package',
    'friends-brunch-package',
    'A sociable spread of shareable favourites for a group of friends.',
    'Built for an upbeat table, this package offers a generous mix of brunch favourites, refreshing drinks, and a shared dessert with plenty of time to catch up.',
    5600,
    'placeholder',
    'NPR',
    4,
    '4–6 guests',
    '2 hours',
    'A small group of friends looking for shared dishes, drinks, and an easy social atmosphere.',
    array[
      'Selection of shareable brunch dishes',
      'One drink for each guest',
      'Shared dessert selection'
    ],
    'Placeholder demo price only; this is not a confirmed price from The Pizza House.',
    false,
    true,
    'coming-soon'
  ),
  (
    '00000000-0000-4000-8000-000000000304',
    (select id from public.experiences where slug = 'harbourlight-dinner-for-two'),
    'Couple Dinner Package',
    'couple-dinner-package',
    'Fictional demo content: an intimate coastal dinner concept for two.',
    'A fictional premium dining package at Harbour & Pine, featuring a paced seasonal menu, a welcome drink, and a finishing course served in an intimate harbour-inspired setting.',
    220,
    'placeholder',
    'NZD',
    2,
    '2 guests',
    '2 hours 30 minutes',
    'Couples exploring a premium, unhurried demo dinner concept with an intimate coastal mood.',
    array[
      'Concept welcome drink for two',
      'Concept three-course seasonal dinner',
      'Concept tea or coffee to finish'
    ],
    'Fictional demo content and placeholder price only; no live restaurant offer or confirmed business price is represented.',
    true,
    true,
    'coming-soon'
  )
on conflict (slug) do update set
  experience_id = excluded.experience_id,
  name = excluded.name,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  price = excluded.price,
  price_status = excluded.price_status,
  currency = excluded.currency,
  number_of_guests = excluded.number_of_guests,
  suggested_guest_range = excluded.suggested_guest_range,
  duration = excluded.duration,
  who_it_suits = excluded.who_it_suits,
  included_items = excluded.included_items,
  optional_notes = excluded.optional_notes,
  featured = excluded.featured,
  active = excluded.active,
  booking_status = excluded.booking_status;
