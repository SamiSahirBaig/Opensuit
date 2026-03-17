"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

export function PDFtoPDFATool() {
    const [file, setFile] = useState<File | null>(null);
    const [level, setLevel] = useState("1b");
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

    const handleConvert = useCallback(async () => {
        if (!file) return;
        setIsProcessing(true); setError(null); setStatus(null);
        try {
            const endpoint = `/api/convert/pdf-to-pdfa?level=${level}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, level]);

    const handleReset = () => {
        setFile(null); setStatus(null); setError(null); setIsProcessing(false); setLevel("1b");
    };

    const levels = [
        { value: "1b", label: "PDF/A-1b", desc: "Basic compliance — widest compatibility" },
        { value: "2b", label: "PDF/A-2b", desc: "Improved — supports JPEG2000, transparency" },
        { value: "3b", label: "PDF/A-3b", desc: "Best — allows file attachments" },
    ];

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        PDF to PDF/A{" "}
                        <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
                            Archival Converter
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Convert your PDFs to archival format for long-term preservation. Embeds fonts, removes JavaScript, and adds compliance metadata.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-sky-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Convert another file
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
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-500/20">
                                        <ShieldCheck className="h-7 w-7 text-sky-400" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-white mb-1">
                                            {dragging ? "Drop PDF here" : "Drop a PDF file here or click to upload"}
                                        </p>
                                        <p className="text-sm text-gray-500">Single PDF &bull; Max 50 MB</p>
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
                            {/* File info */}
                            <div className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-white/[0.03] mb-6">
                                <ShieldCheck className="h-5 w-5 text-sky-400 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                                <button onClick={handleReset} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Remove</button>
                            </div>

                            {/* Level selector */}
                            <div className="mb-6 space-y-2">
                                <label className="text-sm font-medium text-gray-300">PDF/A Compliance Level</label>
                                <div className="grid gap-3">
                                    {levels.map(l => (
                                        <button key={l.value} onClick={() => setLevel(l.value)}
                                            className={`text-left p-4 rounded-xl border-2 transition-all ${level === l.value
                                                ? "border-sky-500 bg-sky-500/10"
                                                : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}>
                                            <p className="text-sm font-semibold text-white">{l.label}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{l.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!isProcessing && (
                                <button onClick={handleConvert}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5
                                        !bg-gradient-to-r !from-sky-600 !to-cyan-600 hover:!from-sky-500 hover:!to-cyan-500">
                                    Convert to {levels.find(l => l.value === level)?.label} <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <button onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-sky-400 transition-colors py-2">
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
