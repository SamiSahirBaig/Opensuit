"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Droplets, ArrowRight, RefreshCw, AlertCircle, RotateCcw } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

const POSITIONS = [
    { id: "top-left", label: "Top Left" },
    { id: "top-center", label: "Top Center" },
    { id: "top-right", label: "Top Right" },
    { id: "center", label: "Center" },
    { id: "bottom-left", label: "Bottom Left" },
    { id: "bottom-center", label: "Bottom Center" },
    { id: "bottom-right", label: "Bottom Right" },
];

export function WatermarkPDFTool() {
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState("CONFIDENTIAL");
    const [fontSize, setFontSize] = useState(60);
    const [opacity, setOpacity] = useState(0.3);
    const [color, setColor] = useState("#C8C8C8");
    const [position, setPosition] = useState("center");
    const [rotation, setRotation] = useState(0);
    const [pageRange, setPageRange] = useState("");
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
            params.set("text", text);
            params.set("fontSize", String(fontSize));
            params.set("opacity", String(opacity));
            params.set("color", color);
            params.set("position", position);
            if (rotation !== 0) params.set("rotation", String(rotation));
            if (pageRange) params.set("pageRange", pageRange);

            const endpoint = `/api/edit/watermark?${params.toString()}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, text, fontSize, opacity, color, position, rotation, pageRange]);

    const handleReset = () => {
        setFile(null); setStatus(null); setError(null); setIsProcessing(false);
        setText("CONFIDENTIAL"); setFontSize(60); setOpacity(0.3); setColor("#C8C8C8");
        setPosition("center"); setRotation(0); setPageRange("");
    };

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Add Watermark{" "}
                        <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            to PDF
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Add text watermarks with custom font size, color, opacity, position, and rotation.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Watermark another file
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
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
                                        <Upload className="h-7 w-7 text-blue-400" />
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
                                <div className="h-12 w-12 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Watermark Text */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Watermark Text</label>
                                <input type="text" value={text} onChange={e => setText(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
                                    placeholder="Enter watermark text" />
                            </div>

                            {/* Font Size & Opacity */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Font Size: <span className="text-blue-400">{fontSize}px</span>
                                    </label>
                                    <input type="range" min="12" max="200" value={fontSize}
                                        onChange={e => setFontSize(Number(e.target.value))}
                                        className="w-full accent-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Opacity: <span className="text-blue-400">{Math.round(opacity * 100)}%</span>
                                    </label>
                                    <input type="range" min="0.05" max="1" step="0.05" value={opacity}
                                        onChange={e => setOpacity(Number(e.target.value))}
                                        className="w-full accent-blue-500" />
                                </div>
                            </div>

                            {/* Color & Rotation */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={color} onChange={e => setColor(e.target.value)}
                                            className="h-10 w-14 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                                        <input type="text" value={color} onChange={e => setColor(e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white text-sm font-mono focus:border-blue-500/50 focus:outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Rotation: <span className="text-blue-400">{rotation}°</span>
                                    </label>
                                    <input type="range" min="-45" max="45" value={rotation}
                                        onChange={e => setRotation(Number(e.target.value))}
                                        className="w-full accent-blue-500" />
                                </div>
                            </div>

                            {/* Position */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">Position</label>
                                <div className="grid grid-cols-3 gap-2 max-w-xs">
                                    {POSITIONS.filter(p => p.id.startsWith("top")).map(p => (
                                        <button key={p.id} onClick={() => setPosition(p.id)}
                                            className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all
                                                ${position === p.id ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}>
                                            {p.label.replace("Top ", "")}
                                        </button>
                                    ))}
                                    <div /><button onClick={() => setPosition("center")}
                                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all
                                            ${position === "center" ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}>
                                        Center
                                    </button><div />
                                    {POSITIONS.filter(p => p.id.startsWith("bottom")).map(p => (
                                        <button key={p.id} onClick={() => setPosition(p.id)}
                                            className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all
                                                ${position === p.id ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}>
                                            {p.label.replace("Bottom ", "")}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Page Range */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Page Range (optional)</label>
                                <input type="text" value={pageRange} onChange={e => setPageRange(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
                                    placeholder="e.g. 1-5, 8, 10-12 (leave empty for all pages)" />
                            </div>

                            {/* Process button */}
                            {!isProcessing && (
                                <button onClick={handleProcess}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
                                    style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                                    <Droplets className="h-4 w-4" /> Add Watermark <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <button onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors py-2">
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
