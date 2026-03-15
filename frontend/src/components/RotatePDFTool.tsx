"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, RotateCw, ArrowRight, RefreshCw, AlertCircle, RotateCcw } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

const ANGLES = [
    { degrees: 90, label: "90°", desc: "Quarter turn right" },
    { degrees: 180, label: "180°", desc: "Upside down" },
    { degrees: 270, label: "270°", desc: "Quarter turn left" },
];

const TARGETS = [
    { id: "all", label: "All Pages" },
    { id: "odd", label: "Odd Pages" },
    { id: "even", label: "Even Pages" },
    { id: "custom", label: "Custom Range" },
];

export function RotatePDFTool() {
    const [file, setFile] = useState<File | null>(null);
    const [degrees, setDegrees] = useState(90);
    const [target, setTarget] = useState("all");
    const [customPages, setCustomPages] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files);
        const pdf = arr.find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
        if (!pdf) { setError("Only PDF files are accepted"); return; }
        if (pdf.size > 100 * 1024 * 1024) { setError("File must be under 100 MB"); return; }
        setFile(pdf); setError(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
    const handleDragLeave = useCallback(() => setDragging(false), []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleProcess = useCallback(async () => {
        if (!file) return;
        setIsProcessing(true); setError(null); setStatus(null);
        try {
            const params = new URLSearchParams();
            params.set("degrees", String(degrees));
            params.set("target", target);
            if (target === "custom" && customPages) params.set("pages", customPages);

            const endpoint = `/api/edit/rotate?${params.toString()}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, degrees, target, customPages]);

    const handleReset = () => {
        setFile(null); setStatus(null); setError(null); setIsProcessing(false);
        setDegrees(90); setTarget("all"); setCustomPages("");
    };

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Rotate PDF{" "}
                        <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                            Pages
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Rotate all pages or specific pages by 90°, 180°, or 270°. Target odd, even, or custom page ranges.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-orange-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Rotate another file
                            </button>
                        </div>
                    ) : !file ? (
                        <>
                            <div className={`upload-zone p-8 sm:p-12 text-center cursor-pointer ${dragging ? "dragging" : ""}`}
                                style={{ minHeight: "260px" }}
                                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}>
                                <input ref={inputRef} type="file" accept=".pdf"
                                    onChange={e => e.target.files && handleFiles(e.target.files)} className="hidden" />
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20">
                                        <Upload className="h-7 w-7 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-white mb-1">
                                            {dragging ? "Drop PDF here" : "Drop a PDF file here or click to upload"}
                                        </p>
                                        <p className="text-sm text-gray-500">Single PDF · Max 100 MB</p>
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
                            {/* File preview */}
                            <div className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-white/[0.03] mb-6">
                                <div className="h-12 w-12 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-orange-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Rotation angle */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">Rotation Angle</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {ANGLES.map(a => (
                                        <button key={a.degrees} onClick={() => setDegrees(a.degrees)}
                                            className={`p-4 rounded-lg border text-center transition-all
                                                ${degrees === a.degrees
                                                    ? "border-orange-500/50 bg-orange-500/10 text-white shadow-lg shadow-orange-500/5"
                                                    : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}>
                                            <div className="flex items-center justify-center mb-2">
                                                <RotateCw className="h-6 w-6" style={{
                                                    transform: `rotate(${a.degrees}deg)`,
                                                    transition: "transform 0.3s ease"
                                                }} />
                                            </div>
                                            <p className="font-bold text-lg">{a.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Page target */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">Apply To</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {TARGETS.map(t => (
                                        <button key={t.id} onClick={() => setTarget(t.id)}
                                            className={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-all
                                                ${target === t.id
                                                    ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                                                    : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom range */}
                            {target === "custom" && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Page Range</label>
                                    <input type="text" value={customPages} onChange={e => setCustomPages(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                                        placeholder="e.g. 1-5, 8, 10-12" />
                                </div>
                            )}

                            {/* Submit */}
                            {!isProcessing && (
                                <button onClick={handleProcess}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
                                    style={{ background: "linear-gradient(135deg, #f97316, #f59e0b)" }}>
                                    <RotateCw className="h-4 w-4" /> Rotate PDF <ArrowRight className="h-4 w-4" />
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
