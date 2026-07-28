import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublishedJournalEntries } from '../../lib/journal';

export async function GET(context: APIContext) {
  const entries = await getPublishedJournalEntries();

  return rss({
    title: 'ExperienceHub Journal',
    description:
      'Practical guides for choosing and planning curated dining experiences.',
    site: context.site ?? 'https://experiencehub.example',
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publicationDate,
      link: `/journal/${entry.id}`,
      categories: [
        entry.data.category,
        entry.data.country.id
          .split('-')
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(' '),
      ],
    })),
    customData: '<language>en</language>',
  });
}
