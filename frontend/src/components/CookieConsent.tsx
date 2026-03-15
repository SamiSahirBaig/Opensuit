"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ConsentState = "pending" | "accepted" | "rejected" | "custom";

interface CookiePreferences {
    essential: boolean;   // always true
    analytics: boolean;
    advertising: boolean;
}

const CONSENT_KEY = "cookie-consent";
const PREFS_KEY = "cookie-preferences";

export function CookieConsent() {
    const [visible, setVisible] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [preferences, setPreferences] = useState<CookiePreferences>({
        essential: true,
        analytics: false,
        advertising: false,
    });

    useEffect(() => {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (!consent) {
            // Small delay so banner slides in after page loads
            const timer = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const saveConsent = (state: ConsentState, prefs: CookiePreferences) => {
        localStorage.setItem(CONSENT_KEY, state);
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        setVisible(false);
    };

    const handleAcceptAll = () => {
        saveConsent("accepted", { essential: true, analytics: true, advertising: true });
    };

    const handleRejectNonEssential = () => {
        saveConsent("rejected", { essential: true, analytics: false, advertising: false });
    };

    const handleSavePreferences = () => {
        saveConsent("custom", preferences);
    };

    if (!visible) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 animate-slide-up"
            style={{
                animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
        >
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
            `}</style>

            <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#12121a]/95 backdrop-blur-xl shadow-2xl shadow-black/40">
                <div className="p-5 sm:p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-base font-bold text-white mb-1">🍪 We value your privacy</h2>
                            <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">
                                We use cookies to enhance your experience, serve personalized ads through Google AdSense, and analyze site traffic. You can choose which cookies to allow. Read our{" "}
                                <Link href="/cookies" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                                    Cookie Policy
                                </Link>{" "}
                                and{" "}
                                <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                                    Privacy Policy
                                </Link>{" "}
                                for more details.
                            </p>
                        </div>
                    </div>

                    {/* Preferences panel */}
                    {showPreferences && (
                        <div className="mb-4 space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                            {/* Essential — always on */}
                            <label className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-medium text-white">Essential</span>
                                    <p className="text-xs text-gray-500">Required for the site to function properly</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked
                                    disabled
                                    className="h-4 w-4 rounded accent-indigo-500"
                                />
                            </label>

                            {/* Analytics */}
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <span className="text-sm font-medium text-white">Analytics</span>
                                    <p className="text-xs text-gray-500">Help us understand how visitors use our site</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences.analytics}
                                    onChange={(e) =>
                                        setPreferences((p) => ({ ...p, analytics: e.target.checked }))
                                    }
                                    className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                                />
                            </label>

                            {/* Advertising */}
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <span className="text-sm font-medium text-white">Advertising</span>
                                    <p className="text-xs text-gray-500">Allow personalized ads via Google AdSense</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={preferences.advertising}
                                    onChange={(e) =>
                                        setPreferences((p) => ({ ...p, advertising: e.target.checked }))
                                    }
                                    className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                                />
                            </label>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {!showPreferences ? (
                            <button
                                onClick={() => setShowPreferences(true)}
                                className="order-3 sm:order-1 px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all cursor-pointer"
                            >
                                Manage Preferences
                            </button>
                        ) : (
                            <button
                                onClick={handleSavePreferences}
                                className="order-3 sm:order-1 px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all cursor-pointer"
                            >
                                Save Preferences
                            </button>
                        )}
                        <button
                            onClick={handleRejectNonEssential}
                            className="order-2 px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                        >
                            Reject Non-Essential
                        </button>
                        <button
                            onClick={handleAcceptAll}
                            className="order-1 sm:order-3 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                        >
                            Accept All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
