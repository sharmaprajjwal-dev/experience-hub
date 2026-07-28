import {
  getCollection,
  type CollectionEntry,
} from 'astro:content';

export type CountryEntry = CollectionEntry<'countries'>;
export type RestaurantEntry = CollectionEntry<'restaurants'>;
export type ExperienceEntry = CollectionEntry<'experiences'>;
export type PackageEntry = CollectionEntry<'packages'>;

export interface ContentGraph {
  countries: CountryEntry[];
  restaurants: RestaurantEntry[];
  experiences: ExperienceEntry[];
  packages: PackageEntry[];
}

const byName = <T extends { data: { name: string } }>(a: T, b: T) =>
  a.data.name.localeCompare(b.data.name);

export async function getContentGraph(): Promise<ContentGraph> {
  const [countries, restaurants, experiences, packages] = await Promise.all([
    getCollection('countries', ({ data }) => data.active),
    getCollection('restaurants', ({ data }) => data.active),
    getCollection('experiences', ({ data }) => data.active),
    getCollection('packages', ({ data }) => data.active),
  ]);

  const graph = {
    countries: countries.sort(byName),
    restaurants: restaurants.sort(byName),
    experiences: experiences.sort(byName),
    packages: packages.sort(byName),
  };

  validateContentGraph(graph);

  return graph;
}

function validateContentGraph(graph: ContentGraph) {
  const assertIdsMatchSlugs = (
    entries: Array<
      CountryEntry | RestaurantEntry | ExperienceEntry | PackageEntry
    >,
    collectionName: string,
  ) => {
    entries.forEach((entry) => {
      if (entry.id !== entry.data.slug) {
        throw new Error(
          `${collectionName} entry "${entry.id}" must match its slug "${entry.data.slug}".`,
        );
      }
    });
  };

  assertIdsMatchSlugs(graph.countries, 'Country');
  assertIdsMatchSlugs(graph.restaurants, 'Restaurant');
  assertIdsMatchSlugs(graph.experiences, 'Experience');
  assertIdsMatchSlugs(graph.packages, 'Package');

  const countrySlugs = new Set(
    graph.countries.map(({ data }) => data.slug),
  );
  const restaurantSlugs = new Set(
    graph.restaurants.map(({ data }) => data.slug),
  );
  const experienceSlugs = new Set(
    graph.experiences.map(({ data }) => data.slug),
  );

  graph.restaurants.forEach(({ data }) => {
    if (!countrySlugs.has(data.countrySlug.id)) {
      throw new Error(
        `Restaurant "${data.slug}" references unavailable country "${data.countrySlug.id}".`,
      );
    }
  });

  graph.experiences.forEach(({ data }) => {
    if (!restaurantSlugs.has(data.restaurantSlug.id)) {
      throw new Error(
        `Experience "${data.slug}" references unavailable restaurant "${data.restaurantSlug.id}".`,
      );
    }
  });

  graph.packages.forEach(({ data }) => {
    if (!experienceSlugs.has(data.experienceSlug.id)) {
      throw new Error(
        `Package "${data.slug}" references unavailable experience "${data.experienceSlug.id}".`,
      );
    }

    const experience = graph.experiences.find(
      ({ data: experienceData }) =>
        experienceData.slug === data.experienceSlug.id,
    );
    const restaurant = experience
      ? graph.restaurants.find(
          ({ data: restaurantData }) =>
            restaurantData.slug === experience.data.restaurantSlug.id,
        )
      : undefined;
    const country = restaurant
      ? graph.countries.find(
          ({ data: countryData }) =>
            countryData.slug === restaurant.data.countrySlug.id,
        )
      : undefined;

    if (country && data.currency !== country.data.currencyCode) {
      throw new Error(
        `Package "${data.slug}" uses ${data.currency}; expected ${country.data.currencyCode} for ${country.data.name}.`,
      );
    }
  });
}

export function getRestaurantsForCountry(
  graph: ContentGraph,
  countrySlug: string,
) {
  return graph.restaurants.filter(
    ({ data }) => data.countrySlug.id === countrySlug,
  );
}

export function getExperiencesForRestaurants(
  graph: ContentGraph,
  restaurants: RestaurantEntry[],
) {
  const restaurantSlugs = new Set(restaurants.map(({ data }) => data.slug));

  return graph.experiences.filter(({ data }) =>
    restaurantSlugs.has(data.restaurantSlug.id),
  );
}

export function getPackagesForExperiences(
  graph: ContentGraph,
  experiences: ExperienceEntry[],
) {
  const experienceSlugs = new Set(experiences.map(({ data }) => data.slug));

  return graph.packages.filter(({ data }) =>
    experienceSlugs.has(data.experienceSlug.id),
  );
}

export function getRestaurantForExperience(
  graph: ContentGraph,
  experience: ExperienceEntry,
) {
  return graph.restaurants.find(
    ({ data }) => data.slug === experience.data.restaurantSlug.id,
  );
}

export function getCountryForRestaurant(
  graph: ContentGraph,
  restaurant: RestaurantEntry,
) {
  return graph.countries.find(
    ({ data }) => data.slug === restaurant.data.countrySlug.id,
  );
}

export function getExperienceForPackage(
  graph: ContentGraph,
  packageEntry: PackageEntry,
) {
  return graph.experiences.find(
    ({ data }) => data.slug === packageEntry.data.experienceSlug.id,
  );
}

export function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPackagePrice(packageEntry: PackageEntry) {
  const formattedPrice = formatPrice(
    packageEntry.data.price,
    packageEntry.data.currency,
  );

  return packageEntry.data.priceStatus === 'placeholder'
    ? `Placeholder price · ${formattedPrice}`
    : formattedPrice;
}

export function formatRestaurantLabel(restaurant: RestaurantEntry) {
  return restaurant.data.fictional
    ? `${restaurant.data.name} — fictional concept`
    : restaurant.data.name;
}

export function formatBookingStatus(status: PackageEntry['data']['bookingStatus']) {
  const labels = {
    available: 'Available',
    'coming-soon': 'Booking coming soon',
    unavailable: 'Currently unavailable',
  } as const;

  return labels[status];
}
