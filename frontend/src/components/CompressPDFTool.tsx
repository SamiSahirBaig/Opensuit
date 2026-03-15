"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Minimize2, ArrowRight, RefreshCw, AlertCircle, Check, Settings2 } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse, getDownloadUrl } from "@/lib/api";

type CompressionLevel = "extreme" | "recommended" | "low";

const PRESETS: { id: CompressionLevel; label: string; desc: string; detail: string; dpi: number }[] = [
    { id: "extreme", label: "Maximum", desc: "Smallest file size", detail: "72 DPI · Best for sharing", dpi: 72 },
    { id: "recommended", label: "Recommended", desc: "Balanced quality", detail: "150 DPI · Default preset", dpi: 150 },
    { id: "low", label: "Minimal", desc: "Best quality", detail: "300 DPI · Slight reduction", dpi: 300 },
];

export function CompressPDFTool() {
    const [file, setFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [level, setLevel] = useState<CompressionLevel>("recommended");
    const [customDpi, setCustomDpi] = useState(false);
    const [dpi, setDpi] = useState(150);
    const [removeMetadata, setRemoveMetadata] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    /* ── Load PDF info ── */
    const loadPdf = useCallback(async (f: File) => {
        setFile(f);
        setError(null);
        setThumbnail(null);
        setPageCount(null);

        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

            const arrayBuffer = await f.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPageCount(pdf.numPages);

            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;
            setThumbnail(canvas.toDataURL("image/jpeg", 0.7));
        } catch {
            setError("Could not read PDF. The file may be corrupted or password-protected.");
        }
    }, []);

    /* ── Drop zone ── */
    const handleFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files);
        const pdf = arr.find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
        if (!pdf) { setError("Only PDF files are accepted"); return; }
        if (pdf.size > 100 * 1024 * 1024) { setError("File must be under 100 MB"); return; }
        loadPdf(pdf);
    }, [loadPdf]);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
    const handleDragLeave = useCallback(() => setDragging(false), []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    /* ── Compress ── */
    const handleCompress = useCallback(async () => {
        if (!file) return;
        setIsProcessing(true); setError(null); setStatus(null);

        try {
            const params = new URLSearchParams();
            params.set("level", level);
            if (customDpi) params.set("dpi", String(dpi));
            if (removeMetadata) params.set("removeMetadata", "true");

            const endpoint = `/api/edit/compress?${params.toString()}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, level, customDpi, dpi, removeMetadata]);

    const handleReset = () => {
        setFile(null); setThumbnail(null); setPageCount(null);
        setStatus(null); setError(null); setIsProcessing(false);
        setLevel("recommended"); setCustomDpi(false); setDpi(150); setRemoveMetadata(false);
    };

    /* ── Sync DPI with preset when not in custom mode ── */
    const handlePresetChange = (preset: CompressionLevel) => {
        setLevel(preset);
        if (!customDpi) {
            const p = PRESETS.find(pr => pr.id === preset);
            if (p) setDpi(p.dpi);
        }
    };

    /* ── Helpers ── */
    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const originalSize = (status as any)?.originalSizeBytes as number | undefined;
    const compressedSize = (status as any)?.compressedSizeBytes as number | undefined;
    const reductionPct = originalSize && compressedSize && originalSize > 0
        ? Math.round(100 - (compressedSize * 100 / originalSize))
        : null;

    return (
        <div>
            {/* Hero */}
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Compress PDF{" "}
                        <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                            Online Free
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Reduce PDF file size with intelligent image compression. Choose a preset or customise DPI for full control.
                    </p>
                </div>
            </section>

            {/* Main Area */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        /* ── Success with size stats ── */
                        <div className="text-center">
                            {/* Compression stats */}
                            {originalSize != null && compressedSize != null && (
                                <div className="glass-card p-6 mb-6 border-emerald-500/20 bg-emerald-500/[0.03]">
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                                            <Check className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <span className="text-lg font-semibold text-emerald-400">
                                            Reduced by {reductionPct}%
                                        </span>
                                    </div>

                                    {/* Size comparison bar */}
                                    <div className="space-y-3 mb-4">
                                        <div>
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span>Original</span>
                                                <span>{formatSize(originalSize)}</span>
                                            </div>
                                            <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden">
                                                <div className="h-full rounded-full bg-gray-500/50" style={{ width: "100%" }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span>Compressed</span>
                                                <span>{formatSize(compressedSize)}</span>
                                            </div>
                                            <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                                                    style={{ width: `${originalSize > 0 ? (compressedSize * 100 / originalSize) : 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500">
                                        Saved {formatSize(originalSize - compressedSize)}
                                    </p>
                                </div>
                            )}

                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Compress another file
                            </button>
                        </div>
                    ) : !file ? (
                        /* ── Upload zone ── */
                        <>
                            <div
                                className={`upload-zone p-8 sm:p-12 text-center cursor-pointer ${dragging ? "dragging" : ""}`}
                                style={{ minHeight: "260px" }}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}
                            >
                                <input ref={inputRef} type="file" accept=".pdf"
                                    onChange={e => e.target.files && handleFiles(e.target.files)} className="hidden" />
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                        <Upload className="h-7 w-7 text-emerald-400" />
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
                        /* ── Configuration ── */
                        <>
                            {/* File preview */}
                            <div className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-white/[0.03] mb-6">
                                {thumbnail ? (
                                    <img src={thumbnail} alt="" className="h-20 w-16 object-cover rounded border border-white/10 shrink-0" />
                                ) : (
                                    <div className="h-20 w-16 bg-white/[0.03] rounded border border-white/10 flex items-center justify-center shrink-0">
                                        <FileText className="h-6 w-6 text-gray-600" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                                    {pageCount && (
                                        <p className="text-xs text-emerald-400 mt-1">{pageCount} page{pageCount > 1 ? "s" : ""}</p>
                                    )}
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                    <Minimize2 className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Compression level */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">Compression Level</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PRESETS.map(p => (
                                        <button key={p.id} onClick={() => handlePresetChange(p.id)}
                                            className={`p-4 rounded-lg border text-left transition-all
                                                ${level === p.id
                                                    ? "border-emerald-500/50 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/5"
                                                    : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}
                                        >
                                            <p className="font-semibold text-sm">{p.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                                            <p className="text-[10px] text-gray-600 mt-1">{p.detail}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Advanced options */}
                            <div className="space-y-4 mb-6">
                                {/* Custom DPI toggle */}
                                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-300">Custom DPI</span>
                                    </div>
                                    <button
                                        onClick={() => setCustomDpi(!customDpi)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${customDpi ? "bg-emerald-500" : "bg-white/10"}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${customDpi ? "translate-x-5" : ""}`} />
                                    </button>
                                </div>

                                {customDpi && (
                                    <div className="px-3">
                                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                                            <span>72 DPI</span>
                                            <span className="text-emerald-400 font-medium">{dpi} DPI</span>
                                            <span>300 DPI</span>
                                        </div>
                                        <input
                                            type="range" min="72" max="300" step="1" value={dpi}
                                            onChange={e => setDpi(Number(e.target.value))}
                                            className="w-full accent-emerald-500"
                                        />
                                    </div>
                                )}

                                {/* Remove metadata toggle */}
                                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                                    <span className="text-sm text-gray-300">Remove metadata</span>
                                    <button
                                        onClick={() => setRemoveMetadata(!removeMetadata)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${removeMetadata ? "bg-emerald-500" : "bg-white/10"}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${removeMetadata ? "translate-x-5" : ""}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Compress button */}
                            {!isProcessing && (
                                <button onClick={handleCompress}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
                                    style={{ background: "linear-gradient(135deg, #059669, #0d9488)" }}
                                >
                                    Compress PDF <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <button onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors py-2">
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
