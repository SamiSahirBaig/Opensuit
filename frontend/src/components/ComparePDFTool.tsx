"use client";

import { useState } from "react";
import { GitCompare, ArrowRight, RefreshCw } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFiles, pollJobStatus, JobStatusResponse } from "@/lib/api";

export function ComparePdfTool() {
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleProcess = async () => {
        if (!file1 || !file2) {
            setError("Please upload exactly two PDF files to compare.");
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        setStatus(null);

        try {
            // Upload the two files using the uploadFiles utility for multipart requests
            const response = await uploadFiles([file1, file2], `/api/edit/compare`);
            await pollJobStatus(response.jobId, (s) => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFile1(null);
        setFile2(null);
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
                        Compare{" "}
                        <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                            PDF Text
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Find textual differences between two versions of a PDF document. Generates a line-by-line comparison report.
                    </p>
                </div>
            </section>

            {/* Main Area */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center bg-gray-900/50 p-8 rounded-2xl border border-white/5 shadow-xl">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={handleReset}
                                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-violet-400 transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg"
                                >
                                    <RefreshCw className="h-4 w-4" /> Compare another pair
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-900/50 p-6 sm:p-8 rounded-2xl border border-white/5 shadow-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* File 1 */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-300 mb-2">Original PDF</h3>
                                    {!file1 ? (
                                        <FileUpload
                                            acceptedTypes=".pdf"
                                            onFilesSelected={(files) => {
                                                setFile1(files[0]);
                                                setError(null);
                                            }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                            <div className="flex flex-col">
                                                <p className="font-medium text-white truncate max-w-[200px]">{file1.name}</p>
                                                <p className="text-xs text-gray-400">
                                                    {(file1.size / (1024 * 1024)).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button onClick={() => setFile1(null)} className="text-xs text-red-400 hover:underline">Remove</button>
                                        </div>
                                    )}
                                </div>

                                {/* File 2 */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-300 mb-2">Modified PDF</h3>
                                    {!file2 ? (
                                        <FileUpload
                                            acceptedTypes=".pdf"
                                            onFilesSelected={(files) => {
                                                setFile2(files[0]);
                                                setError(null);
                                            }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                            <div className="flex flex-col">
                                                <p className="font-medium text-white truncate max-w-[200px]">{file2.name}</p>
                                                <p className="text-xs text-gray-400">
                                                    {(file2.size / (1024 * 1024)).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button onClick={() => setFile2(null)} className="text-xs text-red-400 hover:underline">Remove</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mt-8 flex flex-col items-center">
                                {!isProcessing ? (
                                    <button
                                        onClick={handleProcess}
                                        disabled={!file1 || !file2}
                                        className={`w-full max-w-md relative group overflow-hidden rounded-xl p-px transition-all ${!file1 || !file2 ? 'opacity-50 cursor-not-allowed bg-gray-700' : 'bg-gradient-to-r from-violet-600 to-purple-600'}`}
                                    >
                                        <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors" />
                                        <div className="relative bg-gray-900 rounded-[11px] px-6 py-4 flex items-center justify-center gap-2 transition-transform group-hover:scale-[0.98]">
                                            <GitCompare className="h-5 w-5 text-violet-400" />
                                            <span className="font-medium text-white group-hover:text-violet-200 transition-colors">
                                                Compare Texts
                                            </span>
                                        </div>
                                    </button>
                                ) : null}

                                <div className="w-full mt-6">
                                    <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
