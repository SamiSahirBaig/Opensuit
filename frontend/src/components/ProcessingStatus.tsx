"use client";

import { Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { JobStatusResponse, getDownloadUrl } from "@/lib/api";

interface ProcessingStatusProps {
    status: JobStatusResponse | null;
    isProcessing: boolean;
    error: string | null;
}

export function ProcessingStatus({ status, isProcessing, error }: ProcessingStatusProps) {
    if (!isProcessing && !status && !error) return null;

    return (
        <div className="w-full mt-6">
            {/* Processing */}
            {isProcessing && status?.status !== "COMPLETED" && !error && (
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                        <span className="text-sm font-medium text-white">
                            {status?.status === "PROCESSING" ? "Processing your file..." : "Queued for processing..."}
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${status?.progress || 5}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{status?.progress || 0}% complete</p>
                </div>
            )}

            {/* Completed */}
            {status?.status === "COMPLETED" && status.downloadToken && (
                <div className="glass-card p-6 border-green-500/20">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span className="text-sm font-medium text-green-400">Processing complete!</span>
                    </div>
                    <a
                        href={getDownloadUrl(status.downloadToken)}
                        className="btn-primary inline-flex items-center gap-2 no-underline"
                        download
                    >
                        <Download className="h-4 w-4" />
                        Download File
                    </a>
                    <p className="text-xs text-gray-500 mt-3">
                        ⏱ Download link expires in 10 minutes. Files are auto-deleted after 1 hour.
                    </p>
                </div>
            )}

            {/* Error */}
            {(error || status?.status === "FAILED") && (
                <div className="glass-card p-6 border-red-500/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <span className="text-sm font-medium text-red-400">
                            {error || status?.message || "Processing failed. Please try again."}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
