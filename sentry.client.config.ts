import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Phase 17/18: session replay deferred pending ICO review of UK PECR implications
  replaysOnErrorSampleRate: 0.0,
  replaysSessionSampleRate: 0.0,
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
})
