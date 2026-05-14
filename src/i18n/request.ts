import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: {
      common: (await import(`../messages/${locale}/common.json`)).default,
      songs: (await import(`../messages/${locale}/songs.json`)).default,
      exercises: (await import(`../messages/${locale}/exercises.json`)).default,
      journal: (await import(`../messages/${locale}/journal.json`)).default,
      settings: (await import(`../messages/${locale}/settings.json`)).default,
      errors: (await import(`../messages/${locale}/errors.json`)).default,
    },
  };
});
