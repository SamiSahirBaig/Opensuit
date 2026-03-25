"use client";

import { useState } from "react";
import { Globe, ArrowRight, RefreshCw } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { pollJobStatus, JobStatusResponse } from "@/lib/api";

export function WebToPdfTool() {
    const [url, setUrl] = useState("");
    const [pageSize, setPageSize] = useState("A4");
    const [includeImages, setIncludeImages] = useState(true);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleProcess = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!url || !url.startsWith("http")) {
            setError("Please enter a valid URL starting with http:// or https://");
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        setStatus(null);

        try {
            // Because WebToPDF uses Playwright and takes a URL, the endpoint is distinct and requires no File formData
            const API_BASE = typeof window === 'undefined'
                ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
                : '';
                
            const res = await fetch(`${API_BASE}/api/edit/web-to-pdf?url=${encodeURIComponent(url)}&pageSize=${pageSize}&includeImages=${includeImages}`, {
                method: "POST"
            });
            
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({ message: `Upload failed (${res.status})` }));
                throw new Error(errJson.message || 'Conversion request failed');
            }
            
            const response = await res.json();
            await pollJobStatus(response.jobId, (s) => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setUrl("");
        setStatus(null);
        setError(null);
        setIsProcessing(false);
    };

    return (
        <div>
            {/* Hero Section */}
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Webpage to{" "}
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            PDF
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Convert any public website into a high-quality PDF document instantly.
                    </p>
                </div>
            </section>

            {/* Main Area */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center bg-gray-900/50 p-8 rounded-2xl border border-white/5 shadow-xl">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={handleReset}
                                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg"
                                >
                                    <RefreshCw className="h-4 w-4" /> Convert another website
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-900/50 p-6 sm:p-10 rounded-2xl border border-white/5 shadow-xl">
                            <form onSubmit={handleProcess} className="space-y-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-cyan-400" /> Website URL
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://example.com"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                        disabled={isProcessing}
                                        required
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Page Size</label>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => setPageSize(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                                            disabled={isProcessing}
                                        >
                                            <option value="A4">A4 (Standard)</option>
                                            <option value="Letter">Letter</option>
                                            <option value="Legal">Legal</option>
                                            <option value="Tabloid">Tabloid</option>
                                        </select>
                                    </div>
                                    
                                    <div className="flex flex-col justify-center pt-6">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={includeImages}
                                                onChange={(e) => setIncludeImages(e.target.checked)}
                                                disabled={isProcessing}
                                                className="w-5 h-5 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900 bg-black/40"
                                            />
                                            <span className="text-sm text-gray-300">Include Background Images</span>
                                        </label>
                                    </div>
                                </div>

                                {!isProcessing && (
                                    <button
                                        type="submit"
                                        className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 p-px mt-4"
                                    >
                                        <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors" />
                                        <div className="relative bg-gray-900 rounded-[11px] px-6 py-4 flex items-center justify-center gap-2 transition-transform group-hover:scale-[0.98]">
                                            <span className="font-medium text-white group-hover:text-cyan-200 transition-colors">
                                                Convert URL
                                            </span>
                                            <ArrowRight className="h-5 w-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </button>
                                )}

                                <div className="mt-4">
                                    <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
