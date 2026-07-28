import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const heroImage = z
  .string()
  .regex(/^media-[a-z0-9]+(?:-[a-z0-9]+)*$/);

const countries = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/countries',
  }),
  schema: z.object({
    name: z.string().min(1),
    slug,
    countryCode: z.string().length(2).regex(/^[A-Z]{2}$/),
    shortDescription: z.string().min(1),
    heroImage,
    currencyCode: z.string().length(3).regex(/^[A-Z]{3}$/),
    active: z.boolean(),
  }),
});

const restaurants = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/restaurants',
  }),
  schema: z.object({
    name: z.string().min(1),
    slug,
    countrySlug: reference('countries'),
    city: z.string().min(1),
    shortDescription: z.string().min(1),
    heroImage,
    fictional: z.boolean(),
    active: z.boolean(),
  }),
});

const experiences = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/experiences',
  }),
  schema: z.object({
    name: z.string().min(1),
    slug,
    restaurantSlug: reference('restaurants'),
    type: z.string().min(1),
    shortDescription: z.string().min(1),
    longDescription: z.string().min(1),
    heroImage,
    featured: z.boolean(),
    active: z.boolean(),
  }),
});

const packages = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/packages',
  }),
  schema: z.object({
    name: z.string().min(1),
    slug,
    experienceSlug: reference('experiences'),
    shortDescription: z.string().min(1),
    fullDescription: z.string().min(1),
    price: z.number().nonnegative(),
    priceStatus: z.enum(['placeholder', 'confirmed']),
    currency: z.string().length(3).regex(/^[A-Z]{3}$/),
    numberOfGuests: z.number().int().positive(),
    suggestedGuestRange: z.string().min(1),
    duration: z.string().min(1),
    whoItSuits: z.string().min(1),
    includedItems: z.array(z.string().min(1)).min(1),
    optionalNotes: z.string().min(1).optional(),
    featured: z.boolean(),
    active: z.boolean(),
    bookingStatus: z.enum(['available', 'coming-soon', 'unavailable']),
  }),
});

const journal = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/journal',
  }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    publicationDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().min(1),
    category: z.enum([
      'Dining Guides',
      'Brunch',
      'Date Nights',
      'Group Experiences',
      'Nepal',
      'New Zealand',
    ]),
    country: reference('countries'),
    featuredImage: heroImage,
    imageAlt: z.string().min(1),
    draft: z.boolean(),
    featured: z.boolean(),
    seoTitle: z.string().min(1),
    seoDescription: z.string().min(1),
    relatedExperience: reference('experiences'),
  }),
});

export const collections = {
  countries,
  restaurants,
  experiences,
  packages,
  journal,
};
