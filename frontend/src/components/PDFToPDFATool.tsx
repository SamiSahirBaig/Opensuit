"use client";

import { useState } from "react";
import { Archive, ArrowRight, RefreshCw } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

export function PdfToPdfaTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Default to PDF/A-1b which is most broadly supported
    const [pdfaLevel, setPdfaLevel] = useState("1b");

    const handleProcess = async () => {
        if (!file) {
            setError("Please select a PDF file first");
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        setStatus(null);

        try {
            // Append the desired PDF/A level as a query parameter
            const response = await uploadFile(file, `/api/edit/pdf-to-pdfa?level=${pdfaLevel}`);
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
                        Convert PDF to{" "}
                        <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            PDF/A
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Convert your documents to PDF/A for long-term digital preservation and ISO compliance.
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
                                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg"
                                >
                                    <RefreshCw className="h-4 w-4" /> Convert another file
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
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                        <div className="flex items-center gap-3">
                                            <Archive className="h-6 w-6 text-indigo-400" />
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
                                    
                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <h3 className="text-sm font-medium text-gray-300">Conversion Settings</h3>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">PDF/A Compliance Level</label>
                                            <select
                                                value={pdfaLevel}
                                                onChange={(e) => setPdfaLevel(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                disabled={isProcessing}
                                            >
                                                <option value="1b">PDF/A-1b (Basic - Most Compatible)</option>
                                                <option value="2b">PDF/A-2b (Standard)</option>
                                                <option value="3b">PDF/A-3b (With Attachments)</option>
                                            </select>
                                            <p className="mt-2 text-xs text-gray-500">
                                                PDF/A-1b ensures visual consistency over time. Note: conversion will remove JavaScript and external actions.
                                            </p>
                                        </div>
                                    </div>

                                    {!isProcessing && (
                                        <button
                                            onClick={handleProcess}
                                            className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 p-px mt-6"
                                        >
                                            <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors" />
                                            <div className="relative bg-gray-900 rounded-[11px] px-6 py-4 flex items-center justify-center gap-2 transition-transform group-hover:scale-[0.98]">
                                                <span className="font-medium text-white group-hover:text-indigo-200 transition-colors">
                                                    Convert to PDF/A
                                                </span>
                                                <ArrowRight className="h-5 w-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
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
