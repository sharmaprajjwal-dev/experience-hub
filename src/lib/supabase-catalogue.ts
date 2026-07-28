import type { SupabaseClient } from '@supabase/supabase-js';
import { CATALOGUE_IMAGE_BUCKET } from './storage';
import type {
  ContentGraph,
  CountryEntry,
  ExperienceEntry,
  PackageEntry,
  RestaurantEntry,
} from './content';

interface CountryRow {
  id: string;
  name: string;
  slug: string;
  country_code: string;
  short_description: string;
  hero_image: string;
  currency_code: string;
  active: boolean;
  image_path: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
}

interface RestaurantRow {
  id: string;
  country_id: string;
  name: string;
  slug: string;
  city: string;
  short_description: string;
  hero_image: string;
  fictional: boolean;
  active: boolean;
  image_path: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
}

interface ExperienceRow {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  type: string;
  short_description: string;
  long_description: string;
  hero_image: string;
  featured: boolean;
  active: boolean;
  image_path: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
}

interface PackageRow {
  id: string;
  experience_id: string;
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  price: number | string;
  price_status: 'placeholder' | 'confirmed';
  currency: string;
  number_of_guests: number;
  suggested_guest_range: string;
  duration: string;
  who_it_suits: string;
  included_items: string[];
  optional_notes: string | null;
  featured: boolean;
  active: boolean;
  booking_status: 'available' | 'coming-soon' | 'unavailable';
  payment_enabled: boolean;
  payment_mode: 'dummy' | 'payment-link' | 'checkout-session' | 'contact';
  stripe_price_id: string | null;
  stripe_payment_link: string | null;
  trusted_amount_minor: number | string | null;
  hero_image: string;
  image_path: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
}

function toEntry<T>(
  collection: string,
  id: string,
  data: Record<string, unknown>,
) {
  return { collection, id, data } as T;
}

export async function getSupabaseContentGraph(
  supabase: SupabaseClient,
): Promise<ContentGraph> {
  const requestSignal = AbortSignal.timeout(5_000);
  const [countryResult, restaurantResult, experienceResult, packageResult] =
    await Promise.all([
      supabase
        .from('countries')
        .select('*')
        .eq('active', true)
        .abortSignal(requestSignal),
      supabase
        .from('restaurants')
        .select('*')
        .eq('active', true)
        .abortSignal(requestSignal),
      supabase
        .from('experiences')
        .select('*')
        .eq('active', true)
        .abortSignal(requestSignal),
      supabase
        .from('packages')
        .select('*')
        .eq('active', true)
        .abortSignal(requestSignal),
    ]);

  const results = [
    ['countries', countryResult],
    ['restaurants', restaurantResult],
    ['experiences', experienceResult],
    ['packages', packageResult],
  ] as const;

  for (const [table, result] of results) {
    if (result.error) {
      throw new Error(`Supabase could not read the ${table} catalogue table.`);
    }
  }

  const countryRows = (countryResult.data ?? []) as CountryRow[];
  const restaurantRows = (restaurantResult.data ?? []) as RestaurantRow[];
  const experienceRows = (experienceResult.data ?? []) as ExperienceRow[];
  const packageRows = (packageResult.data ?? []) as PackageRow[];

  const countrySlugById = new Map(
    countryRows.map((row) => [row.id, row.slug]),
  );
  const restaurantSlugById = new Map(
    restaurantRows.map((row) => [row.id, row.slug]),
  );
  const experienceSlugById = new Map(
    experienceRows.map((row) => [row.id, row.slug]),
  );
  const publicImage = (fallback: string, path: string | null) =>
    path
      ? supabase.storage
          .from(CATALOGUE_IMAGE_BUCKET)
          .getPublicUrl(path).data.publicUrl
      : fallback;

  const countries = countryRows.map((row) =>
    toEntry<CountryEntry>('countries', row.slug, {
      name: row.name,
      slug: row.slug,
      countryCode: row.country_code,
      shortDescription: row.short_description,
      heroImage: publicImage(row.hero_image, row.image_path),
      imageAlt: row.image_alt ?? undefined,
      imageWidth: row.image_width ?? undefined,
      imageHeight: row.image_height ?? undefined,
      currencyCode: row.currency_code,
      active: row.active,
    }),
  );

  const restaurants = restaurantRows.map((row) =>
    toEntry<RestaurantEntry>('restaurants', row.slug, {
      name: row.name,
      slug: row.slug,
      countrySlug: {
        collection: 'countries',
        id: countrySlugById.get(row.country_id) ?? '',
      },
      city: row.city,
      shortDescription: row.short_description,
      heroImage: publicImage(row.hero_image, row.image_path),
      imageAlt: row.image_alt ?? undefined,
      imageWidth: row.image_width ?? undefined,
      imageHeight: row.image_height ?? undefined,
      fictional: row.fictional,
      active: row.active,
    }),
  );

  const experiences = experienceRows.map((row) =>
    toEntry<ExperienceEntry>('experiences', row.slug, {
      name: row.name,
      slug: row.slug,
      restaurantSlug: {
        collection: 'restaurants',
        id: restaurantSlugById.get(row.restaurant_id) ?? '',
      },
      type: row.type,
      shortDescription: row.short_description,
      longDescription: row.long_description,
      heroImage: publicImage(row.hero_image, row.image_path),
      imageAlt: row.image_alt ?? undefined,
      imageWidth: row.image_width ?? undefined,
      imageHeight: row.image_height ?? undefined,
      featured: row.featured,
      active: row.active,
    }),
  );

  const packages = packageRows.map((row) =>
    toEntry<PackageEntry>('packages', row.slug, {
      name: row.name,
      slug: row.slug,
      experienceSlug: {
        collection: 'experiences',
        id: experienceSlugById.get(row.experience_id) ?? '',
      },
      shortDescription: row.short_description,
      fullDescription: row.full_description,
      price: Number(row.price),
      priceStatus: row.price_status,
      currency: row.currency,
      numberOfGuests: row.number_of_guests,
      suggestedGuestRange: row.suggested_guest_range,
      duration: row.duration,
      whoItSuits: row.who_it_suits,
      includedItems: row.included_items,
      optionalNotes: row.optional_notes ?? undefined,
      heroImage: publicImage(row.hero_image, row.image_path),
      imageAlt: row.image_alt ?? undefined,
      imageWidth: row.image_width ?? undefined,
      imageHeight: row.image_height ?? undefined,
      featured: row.featured,
      active: row.active,
      bookingStatus: row.booking_status,
      paymentEnabled: row.payment_enabled,
      paymentMode: row.payment_mode,
      stripePriceId: row.stripe_price_id ?? undefined,
      stripePaymentLink: row.stripe_payment_link ?? undefined,
      trustedAmountMinor:
        row.trusted_amount_minor === null
          ? undefined
          : Number(row.trusted_amount_minor),
    }),
  );

  return { countries, restaurants, experiences, packages };
}
