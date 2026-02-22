import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample 10% of transactions
  tracesSampleRate: 0.1,

  // Session Replay — capture 1% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out noisy/expected errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Ignore network errors (user's connection issues)
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      return null;
    }

    // Ignore aborted requests
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }

    return event;
  },

  // Only enable in production when DSN is set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
