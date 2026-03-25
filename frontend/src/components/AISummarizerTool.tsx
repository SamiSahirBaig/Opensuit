"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Minimize2, ArrowRight, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

type SummaryLength = "short" | "medium" | "long";
type SummaryFormat = "paragraph" | "bullets";

export function AISummarizerTool() {
    const [file, setFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    
    const [length, setLength] = useState<SummaryLength>("medium");
    const [format, setFormat] = useState<SummaryFormat>("bullets");
    
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
        if (pdf.size > 50 * 1024 * 1024) { setError("File must be under 50 MB"); return; }
        loadPdf(pdf);
    }, [loadPdf]);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
    const handleDragLeave = useCallback(() => setDragging(false), []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    /* ── Process ── */
    const handleProcess = useCallback(async () => {
        if (!file) return;
        setIsProcessing(true); setError(null); setStatus(null);

        try {
            const params = new URLSearchParams();
            params.set("length", length);
            params.set("format", format);

            const endpoint = `/api/edit/ai-summarize?${params.toString()}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, length, format]);

    const handleReset = () => {
        setFile(null); setThumbnail(null); setPageCount(null);
        setStatus(null); setError(null); setIsProcessing(false);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div>
            {/* Hero */}
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 flex items-center justify-center gap-4">
                        <Sparkles className="h-10 w-10 text-purple-400" />
                        AI Summarize{" "}
                        <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                            PDF
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Generate comprehensive or executive summaries of long documents leveraging advanced GPT models.
                    </p>
                </div>
            </section>

            {/* Main Area */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Summarize another file
                            </button>
                        </div>
                    ) : !file ? (
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
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20">
                                        <Upload className="h-7 w-7 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-white mb-1">
                                            {dragging ? "Drop PDF here" : "Drop a PDF file here or click to upload"}
                                        </p>
                                        <p className="text-sm text-gray-500">Single PDF · Max 50 MB</p>
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
                                        <p className="text-xs text-purple-400 mt-1">{pageCount} page{pageCount > 1 ? "s" : ""}</p>
                                    )}
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                    <Minimize2 className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Summary Length</label>
                                    <select
                                        value={length}
                                        onChange={e => setLength(e.target.value as SummaryLength)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="short">Short (Executive Summary)</option>
                                        <option value="medium">Medium (Detailed)</option>
                                        <option value="long">Long (Comprehensive)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
                                    <select
                                        value={format}
                                        onChange={e => setFormat(e.target.value as SummaryFormat)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="bullets">Bullet Points</option>
                                        <option value="paragraph">Standard Paragraph(s)</option>
                                    </select>
                                </div>
                            </div>

                            {!isProcessing && (
                                <button onClick={handleProcess}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
                                    style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                                >
                                    Generate Summary <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <button onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors py-2">
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
