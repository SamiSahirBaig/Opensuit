"use client";

import { useEffect, useRef, useState } from "react";

type AdFormat = "auto" | "rectangle" | "horizontal" | "vertical" | "billboard" | "large-rectangle" | "mobile-banner";
type AdLayout = "display" | "in-article" | "in-feed";

interface AdUnitProps {
    /** AdSense ad slot ID — get from your AdSense dashboard */
    slot?: string;
    /** Ad format */
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

    if (!hasConsent) return null;

    const formatStyles: Record<AdFormat, React.CSSProperties> = {
        auto: { display: "block" },
        rectangle: { display: "inline-block", width: 300, height: 250 },
        horizontal: { display: "inline-block", width: 728, height: 90 },
        vertical: { display: "inline-block", width: 160, height: 600 },
        billboard: { display: "inline-block", width: 970, height: 250 },
        "large-rectangle": { display: "inline-block", width: 336, height: 280 },
        "mobile-banner": { display: "inline-block", width: 320, height: 50 },
    };

    return (
        <div className={`ad-container flex flex-col items-center justify-center overflow-hidden ${className}`}>
            {!hideLabel && (
                <p className="text-[10px] text-[#999999] uppercase tracking-wider mb-1 text-center select-none">
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

/** Ad #1: Homepage - Above Most Used Tools (970x250 Desktop, 300x250 Mobile) */
export function AdBillboard({ slot, className }: { slot?: string; className?: string }) {
    return (
        <div className={`w-full flex justify-center py-6 bg-white border-y border-[#E5E5E5] ${className || ""}`}>
            <div className="hidden md:block">
                <AdUnit slot={slot} format="billboard" />
            </div>
            <div className="block md:hidden">
                <AdUnit slot={slot} format="rectangle" />
            </div>
        </div>
    );
}

/** Ad #2 & #3: Horizontal Banner / Leaderboard (728x90) */
export function AdLeaderboard({ slot, className }: { slot?: string; className?: string }) {
    return (
        <div className={`w-full flex justify-center py-4 ${className || ""}`}>
            <AdUnit slot={slot} format="horizontal" />
        </div>
    );
}

/** Ad #4: Processing Banner - High value ad during waiting periods */
export function AdProcessingBanner({ slot, className }: { slot?: string; className?: string }) {
    // We can auto-refresh this ad every 30 seconds to maximize revenue during long processes
    useEffect(() => {
        const interval = setInterval(() => {
            try {
                // @ts-expect-error
                if (window.adsbygoogle) {
                    // AdSense doesn't natively support manual rapid refresh due to policy,
                    // but single-page app navigations or strategic re-renders can trigger new ads.
                    // For safety, we just rely on standard AdSense auto-refresh behavior for now.
                }
            } catch (e) {}
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`w-full flex justify-center p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl my-4 ${className || ""}`}>
            <div className="hidden sm:block">
                <AdUnit slot={slot} format="horizontal" />
            </div>
            <div className="block sm:hidden">
                <AdUnit slot={slot} format="mobile-banner" />
            </div>
        </div>
    );
}

/** Ad #5: Download Rectangle - Displayed near the download button (336x280) */
export function AdLargeRectangle({ slot, className }: { slot?: string; className?: string }) {
    return (
        <div className={`w-full flex justify-center py-4 ${className || ""}`}>
            <AdUnit slot={slot} format="large-rectangle" />
        </div>
    );
}

export function AdSidebar({ slot, className }: { slot?: string; className?: string }) {
    return (
        <div className={`hidden lg:block ${className || ""}`}>
            <AdUnit slot={slot} format="vertical" />
        </div>
    );
}

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

/** Sticky Mobile Banner - Appears at bottom on mobile only */
export function AdStickyMobile({ slot, className }: { slot?: string; className?: string }) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className={`fixed bottom-0 left-0 w-full z-50 bg-white border-t border-[#E5E5E5] shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] sm:hidden ${className || ""}`}>
            <div className="relative flex justify-center py-1">
                <button 
                    onClick={() => setIsVisible(false)}
                    className="absolute -top-3 right-2 bg-white text-[#999999] hover:text-[#1A1A1A] rounded-full p-0.5 border border-[#E5E5E5] shadow-sm transition-colors"
                    aria-label="Close Ad"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <AdUnit slot={slot} format="mobile-banner" hideLabel />
            </div>
        </div>
    );
}

/** Native In-Feed Ad - Disguised for the Tools Grid */
export function AdNativeGrid({ slot, className }: { slot?: string; className?: string }) {
    return (
        <div className={`tool-card h-full flex flex-col items-center justify-center text-center p-0 overflow-hidden min-h-[160px] ${className || ""}`}>
            <div className="w-full h-full flex items-center justify-center bg-[#FAFAFA] relative">
               <span className="absolute top-1 right-2 text-[9px] text-[#999999] uppercase select-none z-10">Ad</span>
               <AdUnit slot={slot} format="auto" layout="in-feed" hideLabel className="w-full h-full" />
            </div>
        </div>
    );
}
