"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Layers, ArrowRight, RefreshCw, AlertCircle, X, GripVertical, ArrowDownUp } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

interface PageInfo {
    index: number;
    thumbnail: string | null;
}

export function ReorderPDFPagesTool() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageInfo[]>([]);
    const [originalOrder, setOriginalOrder] = useState<PageInfo[]>([]);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /* ── Load PDF ── */
    const loadPdf = useCallback(async (f: File) => {
        setFile(f);
        setError(null);
        setPages([]);
        setPageCount(null);
        setLoading(true);

        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

            const arrayBuffer = await f.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPageCount(pdf.numPages);

            const pageInfos: PageInfo[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                pageInfos.push({ index: i, thumbnail: null });
            }
            setPages(pageInfos);
            setOriginalOrder([...pageInfos]);

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport }).promise;
                const thumb = canvas.toDataURL("image/jpeg", 0.6);

                setPages(prev => prev.map(p => p.index === i ? { ...p, thumbnail: thumb } : p));
                setOriginalOrder(prev => prev.map(p => p.index === i ? { ...p, thumbnail: thumb } : p));
            }
        } catch {
            setError("Could not read PDF. The file may be corrupted or password-protected.");
        } finally {
            setLoading(false);
        }
    }, []);

    /* ── File handling ── */
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

    /* ── Drag-and-drop reorder ── */
    const handleItemDragStart = (idx: number) => (e: React.DragEvent) => {
        setDragIndex(idx);
        e.dataTransfer.effectAllowed = "move";
    };
    const handleItemDragOver = (idx: number) => (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverIndex(idx);
    };
    const handleItemDragEnd = () => {
        if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
            setPages(prev => {
                const updated = [...prev];
                const [moved] = updated.splice(dragIndex, 1);
                updated.splice(dragOverIndex, 0, moved);
                return updated;
            });
        }
        setDragIndex(null);
        setDragOverIndex(null);
    };

    /* ── Actions ── */
    const reverseOrder = () => setPages(prev => [...prev].reverse());
    const resetOrder = () => setPages([...originalOrder]);

    const isReordered = pages.some((p, i) => p.index !== originalOrder[i]?.index);

    /* ── Process ── */
    const handleReorder = useCallback(async () => {
        if (!file || pages.length === 0) return;
        setIsProcessing(true); setError(null); setStatus(null);

        try {
            const order = pages.map(p => p.index).join(",");
            const endpoint = `/api/edit/reorder?order=${encodeURIComponent(order)}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, pages]);

    const handleReset = () => {
        setFile(null); setPages([]); setOriginalOrder([]); setPageCount(null);
        setStatus(null); setError(null); setIsProcessing(false);
    };

    return (
        <div>
            {/* Hero */}
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Reorder PDF Pages{" "}
                        <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                            Online Free
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Drag and drop to rearrange pages in your PDF. Reverse order, reset, or create custom arrangements.
                    </p>
                </div>
            </section>

            {/* Main Area */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Reorder another file
                            </button>
                        </div>
                    ) : !file ? (
                        <>
                            <div
                                className={`upload-zone p-8 sm:p-12 text-center cursor-pointer ${dragging ? "dragging" : ""}`}
                                style={{ minHeight: "220px" }}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}
                            >
                                <input ref={inputRef} type="file" accept=".pdf"
                                    onChange={e => e.target.files && handleFiles(e.target.files)} className="hidden" />
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                        <Layers className="h-7 w-7 text-amber-400" />
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
                            {/* File info bar */}
                            <div className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-white/[0.03] mb-6">
                                <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        {pageCount && <> &bull; {pageCount} page{pageCount > 1 ? "s" : ""}</>}
                                    </p>
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Toolbar */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <button onClick={reverseOrder}
                                    className="px-3 py-1.5 text-xs rounded-md border border-white/10 bg-white/[0.03] text-gray-300 hover:border-amber-500/30 hover:text-white transition-all inline-flex items-center gap-1.5">
                                    <ArrowDownUp className="h-3 w-3" /> Reverse Order
                                </button>
                                <button onClick={resetOrder} disabled={!isReordered}
                                    className="px-3 py-1.5 text-xs rounded-md border border-white/10 bg-white/[0.03] text-gray-300 hover:border-amber-500/30 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                    Reset to Original
                                </button>
                                {isReordered && (
                                    <span className="px-3 py-1.5 text-xs text-amber-400 flex items-center">
                                        Pages reordered
                                    </span>
                                )}
                            </div>

                            {/* Drag info */}
                            <p className="text-xs text-gray-500 mb-3">Drag pages to reorder them</p>

                            {/* Thumbnail grid */}
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block h-8 w-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                                    <p className="text-sm text-gray-500 mt-3">Loading pages...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6">
                                    {pages.map((p, idx) => (
                                        <div
                                            key={`${p.index}-${idx}`}
                                            draggable
                                            onDragStart={handleItemDragStart(idx)}
                                            onDragOver={handleItemDragOver(idx)}
                                            onDragEnd={handleItemDragEnd}
                                            className={`relative cursor-grab active:cursor-grabbing rounded-lg border-2 transition-all overflow-hidden group
                                                ${dragOverIndex === idx
                                                    ? "border-amber-500/60 bg-amber-500/10 scale-105 shadow-lg shadow-amber-500/10"
                                                    : "border-white/10 bg-white/[0.02] hover:border-white/20"}
                                                ${dragIndex === idx ? "opacity-40 scale-95" : "opacity-100"}`}
                                        >
                                            {/* Grip handle */}
                                            <div className="absolute top-1.5 left-1.5 z-10 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <GripVertical className="h-3 w-3 text-white/60" />
                                            </div>

                                            {/* Position badge */}
                                            <div className="absolute top-1.5 right-1.5 z-10 h-5 min-w-[1.25rem] px-1 rounded bg-amber-500/80 flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                                            </div>

                                            {/* Thumbnail */}
                                            {p.thumbnail ? (
                                                <img src={p.thumbnail} alt={`Page ${p.index}`}
                                                    className="w-full aspect-[3/4] object-cover" />
                                            ) : (
                                                <div className="w-full aspect-[3/4] bg-white/[0.03] flex items-center justify-center">
                                                    <FileText className="h-6 w-6 text-gray-600" />
                                                </div>
                                            )}

                                            {/* Original page number */}
                                            <div className="text-center py-1.5 text-xs font-medium">
                                                <span className="text-gray-500">pg </span>
                                                <span className={p.index !== idx + 1 ? "text-amber-400" : "text-gray-400"}>{p.index}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reorder button */}
                            {isReordered && !isProcessing && (
                                <button onClick={handleReorder}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5
                                        !bg-gradient-to-r !from-amber-600 !to-orange-600 hover:!from-amber-500 hover:!to-orange-500">
                                    Apply New Order <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <button onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition-colors py-2">
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
