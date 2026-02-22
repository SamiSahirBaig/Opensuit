"use client";

import { useEffect, useRef, useState } from "react";

type AdFormat = "auto" | "rectangle" | "horizontal" | "vertical";
type AdLayout = "display" | "in-article" | "in-feed";

interface AdUnitProps {
    /** AdSense ad slot ID — get from your AdSense dashboard */
    slot?: string;
    /** Ad format: auto (responsive), rectangle (300x250), horizontal (728x90), vertical (160x600) */
    format?: AdFormat;
    /** Ad layout type for native ad styles */
    layout?: AdLayout;
    /** Additional CSS classes */
    className?: string;
    /** Hide label text above ad */
    hideLabel?: boolean;
}

/**
 * Google AdSense ad unit component.
 * 
 * Respects user cookie consent — only loads ads if advertising cookies are accepted.
 * Falls back to an empty container if consent is not given.
 * 
 * Replace `ca-pub-XXXXXXXXXXXXXXXX` with your real AdSense publisher ID once approved.
 */
export function AdUnit({
    slot = "",
    format = "auto",
    layout = "display",
    className = "",
    hideLabel = false,
}: AdUnitProps) {
    const adRef = useRef<HTMLModElement>(null);
    const [hasConsent, setHasConsent] = useState(false);
    const [adLoaded, setAdLoaded] = useState(false);

    // Check cookie consent for advertising
    useEffect(() => {
        try {
            const preferences = localStorage.getItem("cookie-preferences");
            if (preferences) {
                const parsed = JSON.parse(preferences);
                setHasConsent(parsed.advertising === true);
            } else {
                // If no preferences set, check for general consent
                const consent = localStorage.getItem("cookie-consent");
                setHasConsent(consent === "accepted");
            }
        } catch {
            setHasConsent(false);
        }
    }, []);

    // Push ad when consent is granted
    useEffect(() => {
        if (!hasConsent || adLoaded) return;

        try {
            // @ts-expect-error - AdSense global
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            setAdLoaded(true);
        } catch {
            // Silently fail if AdSense not loaded
        }
    }, [hasConsent, adLoaded]);

    // Don't render anything if no consent
    if (!hasConsent) return null;

    const formatStyles: Record<AdFormat, React.CSSProperties> = {
        auto: { display: "block" },
        rectangle: { display: "inline-block", width: 300, height: 250 },
        horizontal: { display: "inline-block", width: 728, height: 90 },
        vertical: { display: "inline-block", width: 160, height: 600 },
    };

    return (
        <div className={`ad-container ${className}`}>
            {!hideLabel && (
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 text-center select-none">
                    Advertisement
                </p>
            )}
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={formatStyles[format]}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                data-ad-slot={slot}
                data-ad-format={format === "auto" ? "auto" : undefined}
                data-ad-layout={layout !== "display" ? layout : undefined}
                data-full-width-responsive={format === "auto" ? "true" : undefined}
            ></ins>
        </div>
    );
}

/**
 * Horizontal banner ad — ideal for between sections (728x90 leaderboard).
 * Responsive: collapses gracefully on mobile.
 */
export function AdBanner({ slot, className }: { slot?: string; className?: string }) {
    return (
        <div className={`w-full flex justify-center py-4 ${className || ""}`}>
            <AdUnit slot={slot} format="auto" className="w-full max-w-3xl" />
        </div>
    );
}

/**
 * Sidebar ad — ideal for right column placement (300x250 rectangle).
 */
export function AdSidebar({ slot, className }: { slot?: string; className?: string }) {
    return (
        <div className={`hidden lg:block ${className || ""}`}>
            <AdUnit slot={slot} format="rectangle" />
        </div>
    );
}

/**
 * In-article ad — native-style ad that blends within content.
 */
export function AdInArticle({ slot, className }: { slot?: string; className?: string }) {
    return (
        <AdUnit
            slot={slot}
            format="auto"
            layout="in-article"
            className={`my-6 ${className || ""}`}
        />
    );
}
