import {
  getCollection,
  type CollectionEntry,
} from 'astro:content';

export type JournalEntry = CollectionEntry<'journal'>;

export const journalCategories = [
  'Dining Guides',
  'Brunch',
  'Date Nights',
  'Group Experiences',
  'Nepal',
  'New Zealand',
] as const;

export async function getPublishedJournalEntries() {
  const entries = await getCollection('journal', ({ data }) => !data.draft);

  return entries.sort(
    (a, b) =>
      b.data.publicationDate.valueOf() - a.data.publicationDate.valueOf(),
  );
}

export function formatJournalDate(date: Date) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getReadingTime(body: string) {
  const wordCount = body
    .replace(/[#>*_`[\]()!-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(wordCount / 220));
}

export function getRelatedJournalEntries(
  entries: JournalEntry[],
  currentEntry: JournalEntry,
  limit = 2,
) {
  return entries
    .filter(({ id }) => id !== currentEntry.id)
    .sort((a, b) => {
      const aRelevance =
        Number(a.data.category === currentEntry.data.category) +
        Number(a.data.country.id === currentEntry.data.country.id);
      const bRelevance =
        Number(b.data.category === currentEntry.data.category) +
        Number(b.data.country.id === currentEntry.data.country.id);

      return (
        bRelevance - aRelevance ||
        b.data.publicationDate.valueOf() - a.data.publicationDate.valueOf()
      );
    })
    .slice(0, limit);
}
