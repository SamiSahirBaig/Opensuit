"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, FileText, Eraser, ArrowRight, RefreshCw, AlertCircle, X, Check, Trash2 } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

interface PageInfo {
    index: number;
    thumbnail: string | null;
    selected: boolean;
}

export function RemovePDFPagesTool() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageInfo[]>([]);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [rangeInput, setRangeInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    /* ── Load PDF and generate thumbnails ── */
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
                pageInfos.push({ index: i, thumbnail: null, selected: false });
            }
            setPages(pageInfos);

            // Generate thumbnails in batches
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport }).promise;
                const thumb = canvas.toDataURL("image/jpeg", 0.6);

                setPages(prev => prev.map(p =>
                    p.index === i ? { ...p, thumbnail: thumb } : p
                ));
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

    /* ── Selection helpers ── */
    const togglePage = (index: number) => {
        setPages(prev => prev.map(p =>
            p.index === index ? { ...p, selected: !p.selected } : p
        ));
    };

    const selectAll = () => setPages(prev => prev.map(p => ({ ...p, selected: true })));
    const deselectAll = () => setPages(prev => prev.map(p => ({ ...p, selected: false })));
    const selectOdd = () => setPages(prev => prev.map(p => ({ ...p, selected: p.index % 2 === 1 })));
    const selectEven = () => setPages(prev => prev.map(p => ({ ...p, selected: p.index % 2 === 0 })));

    const applyRangeInput = () => {
        if (!rangeInput.trim() || !pageCount) return;
        const selected = new Set<number>();
        for (const part of rangeInput.split(",")) {
            const trimmed = part.trim();
            if (trimmed.includes("-")) {
                const [a, b] = trimmed.split("-").map(s => parseInt(s.trim()));
                for (let i = Math.max(1, a); i <= Math.min(pageCount, b); i++) selected.add(i);
            } else {
                const n = parseInt(trimmed);
                if (n >= 1 && n <= pageCount) selected.add(n);
            }
        }
        setPages(prev => prev.map(p => ({ ...p, selected: selected.has(p.index) })));
    };

    const selectedCount = pages.filter(p => p.selected).length;

    /* ── Process ── */
    const handleRemove = useCallback(async (mode: string = "selected") => {
        if (!file) return;
        setIsProcessing(true); setError(null); setStatus(null);

        try {
            const params = new URLSearchParams();
            params.set("mode", mode);
            if (mode === "selected") {
                const selectedPages = pages.filter(p => p.selected).map(p => p.index).join(",");
                params.set("pages", selectedPages);
            }

            const endpoint = `/api/edit/remove-pages?${params.toString()}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, pages]);

    const handleReset = () => {
        setFile(null); setPages([]); setPageCount(null);
        setStatus(null); setError(null); setIsProcessing(false);
        setRangeInput("");
    };

    return (
        <div>
            {/* Hero */}
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Remove PDF Pages{" "}
                        <span className="bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
                            Online Free
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Select and remove unwanted pages from your PDF. Remove by selection, page range, odd/even pages, or detect blank pages.
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
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-rose-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Remove pages from another file
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
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                        <Eraser className="h-7 w-7 text-rose-400" />
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

                            {/* Quick actions toolbar */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <button onClick={selectAll} className="px-3 py-1.5 text-xs rounded-md border border-white/10 bg-white/[0.03] text-gray-300 hover:border-rose-500/30 hover:text-white transition-all">
                                    Select All
                                </button>
                                <button onClick={deselectAll} className="px-3 py-1.5 text-xs rounded-md border border-white/10 bg-white/[0.03] text-gray-300 hover:border-rose-500/30 hover:text-white transition-all">
                                    Deselect All
                                </button>
                                <button onClick={selectOdd} className="px-3 py-1.5 text-xs rounded-md border border-white/10 bg-white/[0.03] text-gray-300 hover:border-rose-500/30 hover:text-white transition-all">
                                    Odd Pages
                                </button>
                                <button onClick={selectEven} className="px-3 py-1.5 text-xs rounded-md border border-white/10 bg-white/[0.03] text-gray-300 hover:border-rose-500/30 hover:text-white transition-all">
                                    Even Pages
                                </button>
                                <button onClick={() => handleRemove("blank")} disabled={isProcessing}
                                    className="px-3 py-1.5 text-xs rounded-md border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-50">
                                    <Trash2 className="h-3 w-3 inline mr-1" />Remove Blank Pages
                                </button>
                            </div>

                            {/* Range input */}
                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text" placeholder="e.g. 1-5, 10, 15-20" value={rangeInput}
                                    onChange={e => setRangeInput(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && applyRangeInput()}
                                    className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:border-rose-500 focus:outline-none transition-colors"
                                />
                                <button onClick={applyRangeInput}
                                    className="px-4 py-2 text-xs rounded-lg border border-white/10 bg-white/[0.03] text-gray-300 hover:border-rose-500/30 hover:text-white transition-all">
                                    Apply Range
                                </button>
                            </div>

                            {/* Thumbnail grid */}
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block h-8 w-8 border-2 border-rose-500/30 border-t-rose-400 rounded-full animate-spin" />
                                    <p className="text-sm text-gray-500 mt-3">Loading pages...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6">
                                    {pages.map(p => (
                                        <div
                                            key={p.index}
                                            onClick={() => togglePage(p.index)}
                                            className={`relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden group
                                                ${p.selected
                                                    ? "border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/10"
                                                    : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
                                        >
                                            {/* Checkbox */}
                                            <div className={`absolute top-1.5 right-1.5 z-10 h-5 w-5 rounded border-2 flex items-center justify-center transition-all
                                                ${p.selected
                                                    ? "border-rose-500 bg-rose-500"
                                                    : "border-white/20 bg-black/40 group-hover:border-white/40"}`}>
                                                {p.selected && <Check className="h-3 w-3 text-white" />}
                                            </div>

                                            {/* Thumbnail */}
                                            {p.thumbnail ? (
                                                <img src={p.thumbnail} alt={`Page ${p.index}`}
                                                    className={`w-full aspect-[3/4] object-cover transition-all ${p.selected ? "opacity-40 grayscale" : "opacity-100"}`} />
                                            ) : (
                                                <div className="w-full aspect-[3/4] bg-white/[0.03] flex items-center justify-center">
                                                    <FileText className="h-6 w-6 text-gray-600" />
                                                </div>
                                            )}

                                            {/* Page number */}
                                            <div className="text-center py-1.5 text-xs text-gray-400 font-medium">
                                                {p.index}
                                            </div>

                                            {/* Remove overlay */}
                                            {p.selected && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <Trash2 className="h-6 w-6 text-rose-400/80" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Selected count & action */}
                            {selectedCount > 0 && pageCount && selectedCount < pageCount && !isProcessing && (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-400 text-center">
                                        <span className="text-rose-400 font-semibold">{selectedCount}</span> page{selectedCount > 1 ? "s" : ""} selected for removal
                                        &bull; <span className="text-green-400">{pageCount - selectedCount}</span> page{pageCount - selectedCount > 1 ? "s" : ""} will remain
                                    </p>
                                    <button onClick={() => handleRemove("selected")}
                                        className="btn-primary w-full flex items-center justify-center gap-2 py-3.5
                                            !bg-gradient-to-r !from-rose-600 !to-pink-600 hover:!from-rose-500 hover:!to-pink-500">
                                        Remove {selectedCount} Page{selectedCount > 1 ? "s" : ""} <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {selectedCount > 0 && pageCount && selectedCount >= pageCount && (
                                <p className="text-sm text-amber-400 text-center">Cannot remove all pages from the document</p>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <button onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-rose-400 transition-colors py-2">
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
