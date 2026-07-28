import type { SupabaseClient } from '@supabase/supabase-js';

export const CATALOGUE_IMAGE_BUCKET = 'experience-images';
export const MAX_CATALOGUE_IMAGE_BYTES = 5 * 1024 * 1024;
export const CATALOGUE_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp';

export const catalogueImageSections = [
  'countries',
  'restaurants',
  'experiences',
  'packages',
] as const;

export type CatalogueImageSection =
  (typeof catalogueImageSections)[number];

type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

type UploadResult =
  | {
      ok: true;
      path: string;
      publicUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

type DeleteResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

const extensionByMimeType: Record<SupportedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const storedPathPattern =
  /^(countries|restaurants|experiences|packages)\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function isCatalogueImageSection(
  value: unknown,
): value is CatalogueImageSection {
  return (
    typeof value === 'string' &&
    catalogueImageSections.includes(value as CatalogueImageSection)
  );
}

export async function uploadCatalogueImage({
  supabase,
  file,
  section,
}: {
  supabase: SupabaseClient;
  file: File;
  section: CatalogueImageSection;
}): Promise<UploadResult> {
  const validationError = await validateCatalogueImage(file);
  if (validationError) return { ok: false, error: validationError };

  const extension = extensionByMimeType[file.type as SupportedMimeType];
  const path = `${section}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(CATALOGUE_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error(
      `[ExperienceHub storage] Upload failed (${error.statusCode ?? 'unknown status'}).`,
    );
    return {
      ok: false,
      error:
        'The image could not be uploaded. Check the storage setup and try again.',
    };
  }

  const { data } = supabase.storage
    .from(CATALOGUE_IMAGE_BUCKET)
    .getPublicUrl(path);

  return {
    ok: true,
    path,
    publicUrl: data.publicUrl,
  };
}

export async function deleteCatalogueImage({
  supabase,
  path,
}: {
  supabase: SupabaseClient;
  path: string;
}): Promise<DeleteResult> {
  if (!storedPathPattern.test(path)) {
    return {
      ok: false,
      error: 'The stored image path is invalid.',
    };
  }

  const { error } = await supabase.storage
    .from(CATALOGUE_IMAGE_BUCKET)
    .remove([path]);

  if (error) {
    console.error(
      `[ExperienceHub storage] Delete failed (${error.statusCode ?? 'unknown status'}).`,
    );
    return {
      ok: false,
      error:
        'The image could not be deleted. Check your access and try again.',
    };
  }

  return { ok: true };
}

async function validateCatalogueImage(file: File) {
  if (!(file instanceof File) || file.size === 0) {
    return 'Choose a non-empty image file.';
  }

  if (file.size > MAX_CATALOGUE_IMAGE_BYTES) {
    return 'Images must be 5 MB or smaller.';
  }

  if (!(file.type in extensionByMimeType)) {
    return 'Use a JPEG, PNG, or WebP image.';
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hasExpectedSignature =
    (file.type === 'image/jpeg' &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff) ||
    (file.type === 'image/png' &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a) ||
    (file.type === 'image/webp' &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50);

  return hasExpectedSignature
    ? null
    : 'The file contents do not match the selected image format.';
}
