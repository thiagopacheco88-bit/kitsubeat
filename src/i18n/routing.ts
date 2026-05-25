import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'pt-BR', 'es'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // Disable Accept-Language sniffing — locale is set only by URL prefix or the
  // kb_locale cookie (explicit user choice). Without this, a Spanish-language
  // browser always overrides the cookie on every fresh visit.
  localeDetection: false,
  localeCookie: {
    name: 'kb_locale',
    maxAge: 60 * 60 * 24 * 365,
  },
});
