"use client";

import { useEffect, useRef } from "react";

interface AdUnitProps {
    slot?: string;
    format?: "auto" | "rectangle" | "horizontal";
    className?: string;
}

export function AdUnit({ slot = "", format = "auto", className = "" }: AdUnitProps) {
    const adRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            // @ts-expect-error - AdSense global
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            // Silently fail if AdSense not loaded
        }
    }, []);

    return (
        <div className={`my-8 ${className}`} ref={adRef}>
            <div className="text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Advertisement</p>
                <ins
                    className="adsbygoogle"
                    style={{ display: "block" }}
                    data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                    data-ad-slot={slot}
                    data-ad-format={format}
                    data-full-width-responsive="true"
                ></ins>
            </div>
        </div>
    );
}
