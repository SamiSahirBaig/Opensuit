"use client";

import { useState } from "react";
import { Wrench, ArrowRight, RefreshCw } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

export function RepairPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleProcess = async () => {
        if (!file) {
            setError("Please select a corrupted PDF file first");
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        setStatus(null);

        try {
            const response = await uploadFile(file, `/api/edit/repair-pdf`);
            await pollJobStatus(response.jobId, (s) => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFile(null);
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
                        Repair Corrupt{" "}
                        <span className="bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">
                            PDF
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Recover data and repair structural damage from corrupted or unreadable PDF files.
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
                                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg"
                                >
                                    <RefreshCw className="h-4 w-4" /> Repair another file
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-900/50 p-6 sm:p-8 rounded-2xl border border-white/5 shadow-xl">
                            {!file ? (
                                <FileUpload
                                    acceptedTypes=".pdf"
                                    onFilesSelected={(files) => {
                                        setFile(files[0]);
                                        setError(null);
                                    }}
                                />
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <div className="flex items-center gap-3">
                                            <Wrench className="h-6 w-6 text-red-500" />
                                            <div>
                                                <p className="font-medium text-white">{file.name}</p>
                                                <p className="text-xs text-gray-400">
                                                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleReset}
                                            className="text-sm text-gray-400 hover:text-white transition-colors"
                                        >
                                            Change File
                                        </button>
                                    </div>
                                    
                                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                                        <p className="text-sm text-orange-200">
                                            <strong>Note:</strong> We will attempt to reconstruct the document structure, fix XRef tables, and remove invalid objects. Severely damaged pages may not be fully recoverable.
                                        </p>
                                    </div>

                                    {!isProcessing && (
                                        <button
                                            onClick={handleProcess}
                                            className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-rose-600 p-px mt-6"
                                        >
                                            <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors" />
                                            <div className="relative bg-gray-900 rounded-[11px] px-6 py-4 flex items-center justify-center gap-2 transition-transform group-hover:scale-[0.98]">
                                                <span className="font-medium text-white group-hover:text-red-200 transition-colors">
                                                    Attempt Repair
                                                </span>
                                                <ArrowRight className="h-5 w-5 text-red-400 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </button>
                                    )}

                                    <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
