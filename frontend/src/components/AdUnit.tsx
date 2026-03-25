"use client";

import { useEffect, useRef, useState } from "react";

export interface AdUnitProps {
  /** AdSense ad slot ID — get from your AdSense dashboard */
  slot?: string;
  /** Ad format */
  format?: 'horizontal' | 'vertical' | 'rectangle' | 'auto';
  /** Responsive auto width */
  responsive?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Hide label text above ad */
  hideLabel?: boolean;
}

export function AdUnit({
  slot = "1234567890", // placeholder
  format = "auto",
  responsive = true,
  className = "",
  hideLabel = false,
}: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    if (adLoaded) return;
    try {
      // @ts-expect-error - AdSense global
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      setAdLoaded(true);
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, [adLoaded]);

  // Provide explicit dimensions when responsive is false, or specific formats are set
  const formatStyles: Record<string, React.CSSProperties> = {
    auto: { display: "block" },
    rectangle: { display: "inline-block", width: 336, height: 280 },
    horizontal: { display: "inline-block", width: 728, height: 90 },
    vertical: { display: "inline-block", width: 300, height: 600 },
  };

  return (
    <div className={`ad-unit flex flex-col items-center justify-center ${className}`}>
      {!hideLabel && (
        <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider mb-1 text-center select-none block">
          Advertisement
        </span>
      )}
      <div className="bg-[#f9fafb] border border-[#e5e5e5] rounded overflow-hidden flex items-center justify-center min-h-[50px] min-w-[200px]">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={formatStyles[format] || { display: "block" }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
          data-ad-slot={slot}
          data-ad-format={format !== 'auto' ? format : 'auto'}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      </div>
    </div>
  );
}

// Wrapper components for convenience in older code
export function AdBanner({ slot, className }: { slot?: string; className?: string }) {
  return (
    <div className={`w-full flex justify-center py-4 ${className || ""}`}>
      <AdUnit slot={slot} format="auto" className="w-full max-w-3xl" />
    </div>
  );
}

export function AdSidebar({ slot, className }: { slot?: string; className?: string }) {
  return (
    <div className={`hidden lg:block ${className || ""}`}>
      <AdUnit slot={slot} format="vertical" responsive={false} />
    </div>
  );
}
