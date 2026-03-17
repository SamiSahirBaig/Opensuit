"use client";

import { useState, useCallback, useRef } from "react";
import { Wrench, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

export function RepairPDFTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files);
        const pdf = arr.find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
        if (!pdf) { setError("Only PDF files are accepted"); return; }
        if (pdf.size > 50 * 1024 * 1024) { setError("File must be under 50 MB"); return; }
        setFile(pdf); setError(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
    const handleDragLeave = useCallback(() => setDragging(false), []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleRepair = useCallback(async () => {
        if (!file) return;
        setIsProcessing(true); setError(null); setStatus(null);
        try {
            const response = await uploadFile(file, "/api/edit/repair");
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file]);

    const handleReset = () => {
        setFile(null); setStatus(null); setError(null); setIsProcessing(false);
    };

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Repair PDF{" "}
                        <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                            Online Free
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Fix corrupted or damaged PDF files. Rebuilds structure, repairs cross-references, and recovers pages.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <div className="mb-6 p-6 rounded-xl border border-green-500/20 bg-green-500/5">
                                <Wrench className="h-10 w-10 text-green-400 mx-auto mb-3" />
                                <h3 className="text-lg font-semibold text-white mb-1">Repair Complete!</h3>
                                <p className="text-sm text-gray-400">Your PDF has been repaired and is ready to download.</p>
                            </div>
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-orange-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Repair another file
                            </button>
                        </div>
                    ) : !file ? (
                        <>
                            <div
                                className={`upload-zone p-8 sm:p-12 text-center cursor-pointer ${dragging ? "dragging" : ""}`}
                                style={{ minHeight: "220px" }}
                                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}
                            >
                                <input ref={inputRef} type="file" accept=".pdf"
                                    onChange={e => e.target.files && handleFiles(e.target.files)} className="hidden" />
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20">
                                        <Wrench className="h-7 w-7 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-white mb-1">
                                            {dragging ? "Drop PDF here" : "Drop a corrupted PDF here or click to upload"}
                                        </p>
                                        <p className="text-sm text-gray-500">We&apos;ll attempt to repair it &bull; Max 50 MB</p>
                                    </div>
                                </div>
                            </div>
                            {error && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                    <AlertCircle className="h-4 w-4 shrink-0" />{error}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-white/[0.03] mb-6">
                                <Wrench className="h-5 w-5 text-orange-400 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                                <button onClick={handleReset} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Remove</button>
                            </div>

                            <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 mb-6">
                                <p className="text-sm text-amber-300">
                                    <strong>How it works:</strong> We&apos;ll attempt to reload the PDF with lenient parsing,
                                    rebuild cross-references, remove invalid objects, and save a clean copy.
                                </p>
                            </div>

                            {!isProcessing && (
                                <button onClick={handleRepair}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5
                                        !bg-gradient-to-r !from-orange-600 !to-amber-600 hover:!from-orange-500 hover:!to-amber-500">
                                    Attempt Repair <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <button onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-orange-400 transition-colors py-2">
                                    <RefreshCw className="h-4 w-4" /> Try again
                                </button>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
