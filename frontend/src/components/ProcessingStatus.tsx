"use client";

import { useState, useEffect } from "react";
import { Download, CheckCircle, AlertCircle, Loader2, ServerOff } from "lucide-react";
import { JobStatusResponse, getDownloadUrl } from "@/lib/api";
import { AdUnit } from "@/components/AdUnit";

interface ProcessingStatusProps {
    status: JobStatusResponse | null;
    isProcessing: boolean;
    error: string | null;
}

export function ProcessingStatus({ status, isProcessing, error }: ProcessingStatusProps) {
    const [adRefreshKey, setAdRefreshKey] = useState(0);

    // Refresh ad every 30 seconds during long processing
    useEffect(() => {
        if (!isProcessing) return;
        const interval = setInterval(() => {
            setAdRefreshKey(prev => prev + 1);
        }, 30000);
        return () => clearInterval(interval);
    }, [isProcessing]);

    if (!isProcessing && !status && !error) return null;

    const isServerError = error?.includes("Unable to connect") || error?.includes("server");

    return (
        <div className="w-full mt-6 animate-fade-in-up">
            {/* Processing */}
            {isProcessing && status?.status !== "COMPLETED" && !error && (
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                        <span className="text-sm font-medium text-white">
                            {status?.status === "PROCESSING" ? "Processing your file..." : "Uploading and queuing..."}
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${status?.progress || 5}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{status?.progress || 0}% complete</p>

                    {/* Ad #4: Processing Banner (Highest value) */}
                    <div className="mt-6 w-full flex justify-center border-t border-gray-100 pt-6">
                        <AdUnit key={`proc_${adRefreshKey}`} slot="processing_banner" format="horizontal" responsive={true} className="w-[320px] md:w-[728px] min-h-[50px] md:min-h-[90px]" />
                    </div>
                </div>
            )}

            {/* Completed */}
            {status?.status === "COMPLETED" && status.downloadToken && (
                <div className="glass-card p-6 border-green-500/20 bg-green-500/[0.03]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                            <span className="text-sm font-medium text-green-400 block">Processing complete!</span>
                            <span className="text-xs text-gray-500">Your file is ready to download</span>
                        </div>
                    </div>
                    <a
                        href={getDownloadUrl(status.downloadToken)}
                        className="btn-primary inline-flex items-center gap-2 no-underline w-full justify-center py-3"
                        download
                    >
                        <Download className="h-4 w-4" />
                        Download File
                    </a>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                        ⏱ Link expires in 10 minutes · Files auto-deleted after 1 hour
                    </p>

                    {/* Ad #5: Download Rectangle */}
                    <div className="mt-6 w-full flex justify-center border-t border-green-500/10 pt-6">
                        <AdUnit slot="download_rectangle" format="rectangle" responsive={true} className="w-[336px] min-h-[280px]" />
                    </div>
                </div>
            )}

            {/* Error */}
            {(error || status?.status === "FAILED") && (
                <div className="glass-card p-6 border-red-500/20 bg-red-500/[0.03]">
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 shrink-0">
                            {isServerError ? (
                                <ServerOff className="h-4 w-4 text-red-400" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-red-400" />
                            )}
                        </div>
                        <div>
                            <span className="text-sm font-medium text-red-400 block mb-1">
                                {isServerError ? "Backend Server Unavailable" : "Processing Failed"}
                            </span>
                            <span className="text-xs text-gray-400 block">
                                {error || status?.message || "An unexpected error occurred. Please try again."}
                            </span>
                            {isServerError && (
                                <div className="mt-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                                    <p className="text-xs text-gray-500 mb-1.5 font-medium text-white/70">To start the backend:</p>
                                    <code className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                                        cd backend && ./mvnw spring-boot:run
                                    </code>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
