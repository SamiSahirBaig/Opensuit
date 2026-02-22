/**
 * Google Analytics 4 (GA4) utility library.
 *
 * All analytics calls respect user cookie consent — events are only
 * sent if the user has accepted analytics cookies via the CookieConsent banner.
 *
 * Replace `G-XXXXXXXXXX` with your real GA4 Measurement ID once created.
 */

// GA4 Measurement ID — replace with your real ID from Google Analytics
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All custom event names used throughout the application */
type AnalyticsEvent =
    // Conversion funnel
    | "file_upload_started"
    | "file_upload_completed"
    | "conversion_started"
    | "conversion_completed"
    | "file_downloaded"
    // Engagement
    | "tool_page_viewed"
    | "error_occurred"
    // User journey
    | "scroll_depth";

interface EventParams {
    [key: string]: string | number | boolean | undefined;
}

// ---------------------------------------------------------------------------
// Consent check
// ---------------------------------------------------------------------------

/** Returns true if the user has accepted analytics cookies */
function hasAnalyticsConsent(): boolean {
    if (typeof window === "undefined") return false;

    try {
        const preferences = localStorage.getItem("cookie-preferences");
        if (preferences) {
            const parsed = JSON.parse(preferences);
            return parsed.analytics === true;
        }
        // Fall back to general consent
        const consent = localStorage.getItem("cookie-consent");
        return consent === "accepted";
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Core gtag wrapper
// ---------------------------------------------------------------------------

/** Send a page_view event to GA4 */
export function pageView(url: string) {
    if (!hasAnalyticsConsent()) return;

    window.gtag?.("config", GA_MEASUREMENT_ID, {
        page_path: url,
    });
}

/** Send a custom event to GA4 */
export function trackEvent(eventName: AnalyticsEvent, params?: EventParams) {
    if (!hasAnalyticsConsent()) return;

    window.gtag?.("event", eventName, params);
}

// ---------------------------------------------------------------------------
// Pre-built event helpers
// ---------------------------------------------------------------------------

/** Track when a user starts uploading a file */
export function trackFileUploadStarted(toolSlug: string, fileName: string, fileSizeBytes: number) {
    trackEvent("file_upload_started", {
        tool: toolSlug,
        file_name: fileName,
        file_size_bytes: fileSizeBytes,
    });
}

/** Track when file upload completes successfully */
export function trackFileUploadCompleted(toolSlug: string, jobId: string) {
    trackEvent("file_upload_completed", {
        tool: toolSlug,
        job_id: jobId,
    });
}

/** Track when conversion/processing starts */
export function trackConversionStarted(toolSlug: string) {
    trackEvent("conversion_started", {
        tool: toolSlug,
    });
}

/** Track when conversion completes successfully */
export function trackConversionCompleted(toolSlug: string, jobId: string) {
    trackEvent("conversion_completed", {
        tool: toolSlug,
        job_id: jobId,
    });
}

/** Track when user downloads the processed file */
export function trackFileDownloaded(toolSlug: string, jobId: string) {
    trackEvent("file_downloaded", {
        tool: toolSlug,
        job_id: jobId,
    });
}

/** Track tool page views with the specific tool slug */
export function trackToolPageViewed(toolSlug: string, toolTitle: string) {
    trackEvent("tool_page_viewed", {
        tool: toolSlug,
        tool_title: toolTitle,
    });
}

/** Track errors with context */
export function trackError(toolSlug: string, errorMessage: string) {
    trackEvent("error_occurred", {
        tool: toolSlug,
        error_message: errorMessage.substring(0, 100), // Truncate for GA
    });
}

// ---------------------------------------------------------------------------
// TypeScript: extend Window for gtag
// ---------------------------------------------------------------------------

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
    }
}
