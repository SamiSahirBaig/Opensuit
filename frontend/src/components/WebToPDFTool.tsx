"use client";

import { useState, useCallback } from "react";
import { Globe, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { pollJobStatus, JobStatusResponse } from "@/lib/api";

const API_BASE = typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")
    : "";

export function WebToPDFTool() {
    const [url, setUrl] = useState("");
    const [pageSize, setPageSize] = useState("A4");
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleConvert = useCallback(async () => {
        if (!url.trim()) { setError("Please enter a URL"); return; }
        setIsProcessing(true); setError(null); setStatus(null);
        try {
            // For web-to-pdf, we send URL as a form param (no file upload)
            const formData = new FormData();
            // Send a tiny dummy file because the upload endpoint expects one
            const dummyBlob = new Blob(["url"], { type: "text/plain" });
            const dummyFile = new File([dummyBlob], "url.txt", { type: "text/plain" });
            formData.append("file", dummyFile);

            const params = new URLSearchParams({ url: url.trim(), pageSize });
            const res = await fetch(`${API_BASE}/api/convert/web-to-pdf?${params.toString()}`, {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({ message: `Request failed (${res.status})` }));
                throw new Error(data.message || "Conversion failed");
            }
            const data = await res.json();
            await pollJobStatus(data.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [url, pageSize]);

    const handleReset = () => {
        setUrl(""); setPageSize("A4"); setStatus(null); setError(null); setIsProcessing(false);
    };

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Web to PDF{" "}
                        <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            Converter
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Convert any webpage to a PDF document. Full page rendering with JavaScript support.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Convert another page
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* URL input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Webpage URL</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <input
                                        type="url" value={url}
                                        onChange={e => setUrl(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleConvert()}
                                        placeholder="https://example.com"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition-colors text-sm"
                                    />
                                </div>
                            </div>

                            {/* Page size */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Page Size</label>
                                <div className="flex gap-3">
                                    {["A4", "Letter"].map(size => (
                                        <button key={size} onClick={() => setPageSize(size)}
                                            className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${pageSize === size
                                                ? "border-indigo-500 bg-indigo-500/10 text-white"
                                                : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20"}`}>
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!isProcessing && (
                                <button onClick={handleConvert} disabled={!url.trim()}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5
                                        !bg-gradient-to-r !from-indigo-600 !to-purple-600 hover:!from-indigo-500 hover:!to-purple-500
                                        disabled:opacity-40 disabled:cursor-not-allowed">
                                    Convert to PDF <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                    <AlertCircle className="h-4 w-4 shrink-0" />{error}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
