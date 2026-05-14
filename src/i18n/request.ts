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
      ...(await import(`../../messages/${locale}/common.json`)).default,
      ...(await import(`../../messages/${locale}/songs.json`)).default,
      ...(await import(`../../messages/${locale}/exercises.json`)).default,
      ...(await import(`../../messages/${locale}/journal.json`)).default,
      ...(await import(`../../messages/${locale}/settings.json`)).default,
      ...(await import(`../../messages/${locale}/errors.json`)).default,
    },
  };
});
