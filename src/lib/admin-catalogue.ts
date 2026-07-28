import type { SupabaseClient } from '@supabase/supabase-js';
import {
  deleteCatalogueImage,
  uploadCatalogueImage,
  type CatalogueImageSection,
} from './storage';

export const catalogueResources = [
  'countries',
  'restaurants',
  'experiences',
  'packages',
] as const;

export type CatalogueResource = (typeof catalogueResources)[number];
export type CatalogueRecord = Record<string, unknown> & {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  featured?: boolean;
  image_path?: string | null;
  image_alt?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  created_at?: string;
  updated_at?: string;
};

export const resourceLabels: Record<
  CatalogueResource,
  { singular: string; plural: string; parent?: CatalogueResource }
> = {
  countries: { singular: 'Country', plural: 'Countries' },
  restaurants: {
    singular: 'Restaurant',
    plural: 'Restaurants',
    parent: 'countries',
  },
  experiences: {
    singular: 'Experience',
    plural: 'Experiences',
    parent: 'restaurants',
  },
  packages: {
    singular: 'Package',
    plural: 'Packages',
    parent: 'experiences',
  },
};

const parentField: Partial<Record<CatalogueResource, string>> = {
  restaurants: 'country_id',
  experiences: 'restaurant_id',
  packages: 'experience_id',
};

const childResource: Partial<Record<CatalogueResource, CatalogueResource>> = {
  countries: 'restaurants',
  restaurants: 'experiences',
  experiences: 'packages',
};

export function isCatalogueResource(
  value: unknown,
): value is CatalogueResource {
  return (
    typeof value === 'string' &&
    catalogueResources.includes(value as CatalogueResource)
  );
}

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function listAdminRecords(
  supabase: SupabaseClient,
  resource: CatalogueResource,
) {
  const { data, error } = await supabase
    .from(resource)
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Could not load ${resource}.`);
  return (data ?? []) as CatalogueRecord[];
}

export async function getAdminRecord(
  supabase: SupabaseClient,
  resource: CatalogueResource,
  id: string,
) {
  const { data, error } = await supabase
    .from(resource)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Could not load this ${resourceLabels[resource].singular.toLowerCase()}.`);
  return data as CatalogueRecord | null;
}

export async function getParentOptions(
  supabase: SupabaseClient,
  resource: CatalogueResource,
) {
  const parent = resourceLabels[resource].parent;
  if (!parent) return [];

  const { data, error } = await supabase
    .from(parent)
    .select('id,name,active')
    .order('name');

  if (error) throw new Error(`Could not load ${resourceLabels[parent].plural.toLowerCase()}.`);
  return (data ?? []) as Array<{ id: string; name: string; active: boolean }>;
}

export async function getChildCount(
  supabase: SupabaseClient,
  resource: CatalogueResource,
  id: string,
) {
  const child = childResource[resource];
  if (!child) return { child: null, count: 0 };

  const foreignKey = parentField[child];
  const { count, error } = await supabase
    .from(child)
    .select('id', { count: 'exact', head: true })
    .eq(foreignKey!, id);

  if (error) throw new Error('Could not check related records.');
  return { child, count: count ?? 0 };
}

export async function saveAdminRecord({
  supabase,
  resource,
  id,
  formData,
  existing,
}: {
  supabase: SupabaseClient;
  resource: CatalogueResource;
  id?: string;
  formData: FormData;
  existing?: CatalogueRecord | null;
}) {
  const values = parseRecordValues(resource, formData);
  if (!values.ok) return values;

  if (resource === 'packages') {
    const experienceId = String(values.data.experience_id);
    const { data: experience, error: experienceError } = await supabase
      .from('experiences')
      .select('restaurant_id')
      .eq('id', experienceId)
      .maybeSingle();
    const { data: restaurant, error: restaurantError } = experience
      ? await supabase
          .from('restaurants')
          .select('country_id')
          .eq('id', experience.restaurant_id)
          .maybeSingle()
      : { data: null, error: null };
    const { data: country, error: countryError } = restaurant
      ? await supabase
          .from('countries')
          .select('currency_code')
          .eq('id', restaurant.country_id)
          .maybeSingle()
      : { data: null, error: null };

    if (
      experienceError ||
      restaurantError ||
      countryError ||
      !experience ||
      !restaurant ||
      !country
    ) {
      return failure('The package relationship could not be validated.');
    }
    if (values.data.currency !== country.currency_code) {
      return failure(
        `Use ${country.currency_code}, the currency configured for the selected experience’s country.`,
      );
    }
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from(resource)
    .select('id')
    .eq('slug', values.data.slug)
    .neq('id', id ?? '00000000-0000-0000-0000-000000000000')
    .maybeSingle();

  if (duplicateError) {
    return failure('Slug uniqueness could not be checked. Please try again.');
  }
  if (duplicate) {
    return failure('That slug is already in use. Choose a different slug.');
  }

  const image = formData.get('image');
  const imageAlt = text(formData, 'image_alt');
  let uploadedPath: string | null = null;
  let uploadedPublicUrl: string | null = null;

  if (image instanceof File && image.size > 0) {
    if (!imageAlt) return failure('Image alt text is required for an uploaded image.');

    const upload = await uploadCatalogueImage({
      supabase,
      file: image,
      section: resource as CatalogueImageSection,
    });
    if (!upload.ok) return failure(upload.error);
    uploadedPath = upload.path;
    uploadedPublicUrl = upload.publicUrl;
  }

  const currentPath =
    typeof existing?.image_path === 'string' ? existing.image_path : null;
  const retainedPath = uploadedPath ?? currentPath;
  if (retainedPath && !imageAlt) {
    if (uploadedPath) await deleteCatalogueImage({ supabase, path: uploadedPath });
    return failure('Image alt text is required while an image is attached.');
  }

  const width = positiveInteger(formData, 'image_width');
  const height = positiveInteger(formData, 'image_height');
  const payload = {
    ...values.data,
    hero_image:
      uploadedPublicUrl ??
      (typeof existing?.hero_image === 'string'
        ? existing.hero_image
        : 'media-journal'),
    image_path: retainedPath,
    image_alt: retainedPath ? imageAlt : null,
    image_width: retainedPath
      ? width ?? existing?.image_width ?? null
      : null,
    image_height: retainedPath
      ? height ?? existing?.image_height ?? null
      : null,
  };

  const mutation = id
    ? supabase.from(resource).update(payload).eq('id', id).select('id').single()
    : supabase.from(resource).insert(payload).select('id').single();
  const { data, error } = await mutation;

  if (error || !data) {
    if (uploadedPath) await deleteCatalogueImage({ supabase, path: uploadedPath });
    console.error(
      `[ExperienceHub admin] ${id ? 'Update' : 'Create'} failed (${error?.code ?? 'unknown code'}).`,
    );
    return failure(
      'The record could not be saved. Review the fields and database policies, then try again.',
    );
  }

  if (uploadedPath && currentPath && currentPath !== uploadedPath) {
    await deleteCatalogueImage({ supabase, path: currentPath });
  }

  return { ok: true as const, id: data.id as string };
}

export async function deleteAdminRecord({
  supabase,
  resource,
  record,
}: {
  supabase: SupabaseClient;
  resource: CatalogueResource;
  record: CatalogueRecord;
}) {
  const related = await getChildCount(supabase, resource, record.id);
  if (related.count > 0 && related.child) {
    return failure(
      `This ${resourceLabels[resource].singular.toLowerCase()} still has ${related.count} related ${resourceLabels[related.child].plural.toLowerCase()}. Deactivate it or remove those child records first.`,
    );
  }

  const { error } = await supabase.from(resource).delete().eq('id', record.id);
  if (error) {
    console.error(
      `[ExperienceHub admin] Delete failed (${error.code ?? 'unknown code'}).`,
    );
    return failure(
      'The record could not be deleted. Deactivate it instead or check for related records.',
    );
  }

  if (typeof record.image_path === 'string') {
    await deleteCatalogueImage({ supabase, path: record.image_path });
  }

  return { ok: true as const };
}

function parseRecordValues(resource: CatalogueResource, formData: FormData) {
  const name = text(formData, 'name');
  const slug = text(formData, 'slug');
  const shortDescription = text(formData, 'short_description');

  if (!name || !slug || !shortDescription) {
    return failure('Name, slug, and short description are required.');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return failure('Use a lowercase slug containing letters, numbers, and hyphens only.');
  }

  const common = {
    name,
    slug,
    short_description: shortDescription,
    active: checked(formData, 'active'),
  };

  if (resource === 'countries') {
    const countryCode = text(formData, 'country_code').toUpperCase();
    const currencyCode = text(formData, 'currency_code').toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode) || !/^[A-Z]{3}$/.test(currencyCode)) {
      return failure('Country code must have 2 letters and currency must have 3 letters.');
    }
    return {
      ok: true as const,
      data: {
        ...common,
        country_code: countryCode,
        currency_code: currencyCode,
      },
    };
  }

  const parentId = text(formData, parentField[resource]!);
  if (!parentId) return failure('Choose a parent record.');

  if (resource === 'restaurants') {
    const city = text(formData, 'city');
    if (!city) return failure('City is required.');
    return {
      ok: true as const,
      data: {
        ...common,
        country_id: parentId,
        city,
        fictional: checked(formData, 'fictional'),
      },
    };
  }

  if (resource === 'experiences') {
    const type = text(formData, 'type');
    const longDescription = text(formData, 'long_description');
    if (!type || !longDescription) {
      return failure('Experience type and full description are required.');
    }
    return {
      ok: true as const,
      data: {
        ...common,
        restaurant_id: parentId,
        type,
        long_description: longDescription,
        featured: checked(formData, 'featured'),
      },
    };
  }

  const fullDescription = text(formData, 'full_description');
  const price = nonnegativeNumber(formData, 'price');
  const guests = positiveInteger(formData, 'number_of_guests');
  const includedItems = text(formData, 'included_items')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const currency = text(formData, 'currency').toUpperCase();
  const duration = text(formData, 'duration');
  const guestRange = text(formData, 'suggested_guest_range');
  const whoItSuits = text(formData, 'who_it_suits');

  if (
    !fullDescription ||
    price === null ||
    guests === null ||
    includedItems.length === 0 ||
    !/^[A-Z]{3}$/.test(currency) ||
    !duration ||
    !guestRange ||
    !whoItSuits
  ) {
    return failure(
      'Complete all required package fields and include at least one item.',
    );
  }

  const bookingStatus = text(formData, 'booking_status');
  const priceStatus = text(formData, 'price_status');
  if (!['available', 'coming-soon', 'unavailable'].includes(bookingStatus)) {
    return failure('Choose a valid booking status.');
  }
  if (!['placeholder', 'confirmed'].includes(priceStatus)) {
    return failure('Choose whether the price is placeholder or confirmed.');
  }

  return {
    ok: true as const,
    data: {
      ...common,
      experience_id: parentId,
      full_description: fullDescription,
      price,
      price_status: priceStatus,
      currency,
      number_of_guests: guests,
      suggested_guest_range: guestRange,
      duration,
      who_it_suits: whoItSuits,
      included_items: includedItems,
      optional_notes: text(formData, 'optional_notes') || null,
      featured: checked(formData, 'featured'),
      booking_status: bookingStatus,
    },
  };
}

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === 'on';
}

function positiveInteger(formData: FormData, name: string) {
  const value = Number(text(formData, name));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function nonnegativeNumber(formData: FormData, name: string) {
  const raw = text(formData, name);
  const value = Number(raw);
  return raw !== '' && Number.isFinite(value) && value >= 0 ? value : null;
}

function failure(error: string) {
  return { ok: false as const, error };
}
