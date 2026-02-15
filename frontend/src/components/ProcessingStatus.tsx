"use client";

import { Download, CheckCircle, AlertCircle, Loader2, ServerOff } from "lucide-react";
import { JobStatusResponse, getDownloadUrl } from "@/lib/api";

interface ProcessingStatusProps {
    status: JobStatusResponse | null;
    isProcessing: boolean;
    error: string | null;
}

export function ProcessingStatus({ status, isProcessing, error }: ProcessingStatusProps) {
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
