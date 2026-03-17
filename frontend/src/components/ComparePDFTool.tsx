"use client";

import { useState, useCallback, useRef } from "react";
import { GitCompare, ArrowRight, RefreshCw, AlertCircle, FileText, X } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFiles, pollJobStatus, JobStatusResponse } from "@/lib/api";

export function ComparePDFTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const addFiles = useCallback((newFiles: FileList | File[]) => {
        const arr = Array.from(newFiles).filter(f =>
            f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
        );
        if (arr.length === 0) { setError("Only PDF files are accepted"); return; }
        setError(null);
        setFiles(prev => {
            const combined = [...prev, ...arr].slice(0, 2);
            return combined;
        });
    }, []);

    const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
    const handleDragLeave = useCallback(() => setDragging(false), []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    }, [addFiles]);

    const handleCompare = useCallback(async () => {
        if (files.length !== 2) return;
        setIsProcessing(true); setError(null); setStatus(null);
        try {
            const response = await uploadFiles(files, "/api/edit/compare");
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [files]);

    const handleReset = () => {
        setFiles([]); setStatus(null); setError(null); setIsProcessing(false);
    };

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Compare PDF{" "}
                        <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                            Side by Side
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Upload two PDF documents to generate a detailed comparison report with text and visual diffs.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <div className="mb-6 p-6 rounded-xl border border-green-500/20 bg-green-500/5">
                                <GitCompare className="h-10 w-10 text-green-400 mx-auto mb-3" />
                                <h3 className="text-lg font-semibold text-white mb-1">Comparison Complete!</h3>
                                <p className="text-sm text-gray-400">Download the comparison report to see all differences.</p>
                            </div>
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-teal-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Compare other files
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* File upload area */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                {[0, 1].map(idx => (
                                    <div key={idx}>
                                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                                            Document {idx + 1} {idx === 0 ? "(Original)" : "(Modified)"}
                                        </label>
                                        {files[idx] ? (
                                            <div className="flex items-center gap-3 p-4 rounded-xl border border-teal-500/20 bg-teal-500/5">
                                                <FileText className="h-5 w-5 text-teal-400 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-white truncate">{files[idx].name}</p>
                                                    <p className="text-xs text-gray-500">{(files[idx].size / (1024 * 1024)).toFixed(2)} MB</p>
                                                </div>
                                                <button onClick={() => removeFile(idx)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className={`upload-zone p-6 text-center cursor-pointer ${dragging ? "dragging" : ""}`}
                                                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                                                onClick={() => inputRef.current?.click()}
                                            >
                                                <GitCompare className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                                <p className="text-sm text-gray-400">Drop PDF or click</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <input ref={inputRef} type="file" accept=".pdf" multiple
                                onChange={e => e.target.files && addFiles(e.target.files)} className="hidden" />

                            {files.length === 2 && !isProcessing && (
                                <button onClick={handleCompare}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5
                                        !bg-gradient-to-r !from-teal-600 !to-emerald-600 hover:!from-teal-500 hover:!to-emerald-500">
                                    Compare Documents <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            {files.length < 2 && files.length > 0 && (
                                <p className="text-center text-sm text-gray-500">
                                    Please add one more PDF ({2 - files.length} remaining)
                                </p>
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
