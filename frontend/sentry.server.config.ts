import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: 0.1,

    // Only enable in production when DSN is set
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
