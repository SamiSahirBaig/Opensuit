"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Hash, ArrowRight, RefreshCw, AlertCircle, RotateCcw } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

const PAGE_POSITIONS = [
    { id: "top-left", label: "Top Left" },
    { id: "top-center", label: "Top Center" },
    { id: "top-right", label: "Top Right" },
    { id: "bottom-left", label: "Bottom Left" },
    { id: "bottom-center", label: "Bottom Center" },
    { id: "bottom-right", label: "Bottom Right" },
];

const FORMATS = [
    { id: "numeric", label: "1, 2, 3", desc: "Simple numbers" },
    { id: "roman", label: "i, ii, iii", desc: "Roman numerals" },
    { id: "labeled", label: "Page 1 of 10", desc: "With total count" },
];

export function PageNumbersTool() {
    const [file, setFile] = useState<File | null>(null);
    const [position, setPosition] = useState("bottom-center");
    const [format, setFormat] = useState("labeled");
    const [startNumber, setStartNumber] = useState(1);
    const [fontSize, setFontSize] = useState(10);
    const [fontColor, setFontColor] = useState("#000000");
    const [margin, setMargin] = useState(20);
    const [skipPages, setSkipPages] = useState(0);
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
            params.set("position", position);
            params.set("format", format);
            params.set("startNumber", String(startNumber));
            params.set("fontSize", String(fontSize));
            params.set("fontColor", fontColor);
            params.set("margin", String(margin));
            if (skipPages > 0) params.set("skipPages", String(skipPages));

            const endpoint = `/api/edit/page-numbers?${params.toString()}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, position, format, startNumber, fontSize, fontColor, margin, skipPages]);

    const handleReset = () => {
        setFile(null); setStatus(null); setError(null); setIsProcessing(false);
        setPosition("bottom-center"); setFormat("labeled"); setStartNumber(1);
        setFontSize(10); setFontColor("#000000"); setMargin(20); setSkipPages(0);
    };

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Add Page Numbers{" "}
                        <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                            to PDF
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Add customizable page numbers with multiple formats, positions, and styling options.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-violet-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Number another file
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
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20">
                                        <Upload className="h-7 w-7 text-violet-400" />
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
                                <div className="h-12 w-12 bg-violet-500/10 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-violet-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Format */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">Number Format</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {FORMATS.map(f => (
                                        <button key={f.id} onClick={() => setFormat(f.id)}
                                            className={`p-3 rounded-lg border text-left transition-all
                                                ${format === f.id
                                                    ? "border-violet-500/50 bg-violet-500/10 text-white"
                                                    : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}>
                                            <p className="font-semibold text-sm">{f.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Position */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">Position</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PAGE_POSITIONS.map(p => (
                                        <button key={p.id} onClick={() => setPosition(p.id)}
                                            className={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-all
                                                ${position === p.id
                                                    ? "border-violet-500/50 bg-violet-500/10 text-violet-400"
                                                    : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Start Number</label>
                                    <input type="number" min="1" value={startNumber}
                                        onChange={e => setStartNumber(Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:border-violet-500/50 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Skip First N Pages</label>
                                    <input type="number" min="0" value={skipPages}
                                        onChange={e => setSkipPages(Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:border-violet-500/50 focus:outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Font Size: <span className="text-violet-400">{fontSize}px</span>
                                    </label>
                                    <input type="range" min="6" max="24" value={fontSize}
                                        onChange={e => setFontSize(Number(e.target.value))}
                                        className="w-full accent-violet-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Margin: <span className="text-violet-400">{margin}pt</span>
                                    </label>
                                    <input type="range" min="5" max="100" value={margin}
                                        onChange={e => setMargin(Number(e.target.value))}
                                        className="w-full accent-violet-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                                    <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)}
                                        className="h-10 w-full rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                                </div>
                            </div>

                            {/* Submit */}
                            {!isProcessing && (
                                <button onClick={handleProcess}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
                                    style={{ background: "linear-gradient(135deg, #8b5cf6, #a855f7)" }}>
                                    <Hash className="h-4 w-4" /> Add Page Numbers <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <button onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-violet-400 transition-colors py-2">
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
