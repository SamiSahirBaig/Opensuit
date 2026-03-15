"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Crop, ArrowRight, RefreshCw, AlertCircle, RotateCcw } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

const PRESETS = [
    { id: "custom", label: "Custom", desc: "Set margins manually" },
    { id: "a4", label: "A4", desc: "210 × 297 mm" },
    { id: "letter", label: "Letter", desc: "8.5 × 11 in" },
];

export function CropPDFTool() {
    const [file, setFile] = useState<File | null>(null);
    const [preset, setPreset] = useState("custom");
    const [top, setTop] = useState(0);
    const [right, setRight] = useState(0);
    const [bottom, setBottom] = useState(0);
    const [left, setLeft] = useState(0);
    const [pages, setPages] = useState("");
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
            params.set("preset", preset);
            if (preset === "custom") {
                params.set("top", String(top));
                params.set("right", String(right));
                params.set("bottom", String(bottom));
                params.set("left", String(left));
            }
            if (pages) params.set("pages", pages);

            const endpoint = `/api/edit/crop?${params.toString()}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, preset, top, right, bottom, left, pages]);

    const handleReset = () => {
        setFile(null); setStatus(null); setError(null); setIsProcessing(false);
        setPreset("custom"); setTop(0); setRight(0); setBottom(0); setLeft(0); setPages("");
    };

    const applyQuickMargin = (value: number) => {
        setTop(value); setRight(value); setBottom(value); setLeft(value);
        setPreset("custom");
    };

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Crop PDF{" "}
                        <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                            Pages
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Trim margins, resize to standard formats, or set custom crop areas for your PDF pages.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Crop another file
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
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                                        <Upload className="h-7 w-7 text-cyan-400" />
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
                                <div className="h-12 w-12 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-cyan-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Preset */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">Crop Mode</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PRESETS.map(p => (
                                        <button key={p.id} onClick={() => setPreset(p.id)}
                                            className={`p-4 rounded-lg border text-left transition-all
                                                ${preset === p.id
                                                    ? "border-cyan-500/50 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/5"
                                                    : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}>
                                            <p className="font-semibold text-sm">{p.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom margins */}
                            {preset === "custom" && (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-300 mb-3">Quick Margins</label>
                                        <div className="flex gap-2">
                                            {[0, 10, 20, 36, 50, 72].map(v => (
                                                <button key={v} onClick={() => applyQuickMargin(v)}
                                                    className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-xs text-gray-400 hover:border-cyan-500/30 hover:text-cyan-400 transition-all">
                                                    {v}pt
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-300 mb-3">Margins (points)</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Top</label>
                                                <input type="number" min="0" max="500" value={top}
                                                    onChange={e => setTop(Number(e.target.value))}
                                                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:border-cyan-500/50 focus:outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Right</label>
                                                <input type="number" min="0" max="500" value={right}
                                                    onChange={e => setRight(Number(e.target.value))}
                                                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:border-cyan-500/50 focus:outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Bottom</label>
                                                <input type="number" min="0" max="500" value={bottom}
                                                    onChange={e => setBottom(Number(e.target.value))}
                                                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:border-cyan-500/50 focus:outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Left</label>
                                                <input type="number" min="0" max="500" value={left}
                                                    onChange={e => setLeft(Number(e.target.value))}
                                                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:border-cyan-500/50 focus:outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Page range */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Page Range (optional)</label>
                                <input type="text" value={pages} onChange={e => setPages(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                                    placeholder="e.g. 1-5, 8, 10-12 (leave empty for all pages)" />
                            </div>

                            {/* Submit */}
                            {!isProcessing && (
                                <button onClick={handleProcess}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
                                    style={{ background: "linear-gradient(135deg, #06b6d4, #14b8a6)" }}>
                                    <Crop className="h-4 w-4" /> Crop PDF <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <button onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors py-2">
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
