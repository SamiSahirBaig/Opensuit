"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, FileText, X, GripVertical, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFiles, pollJobStatus, JobStatusResponse } from "@/lib/api";

interface PDFFile {
    file: File;
    id: string;
    thumbnail: string | null;
}

export function MergePDFTool() {
    const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /* ── Thumbnail generation via PDF.js ── */
    const generateThumbnail = useCallback(async (file: File): Promise<string | null> => {
        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.4 });

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport }).promise;
            return canvas.toDataURL("image/jpeg", 0.7);
        } catch {
            return null;
        }
    }, []);

    /* ── Add files ── */
    const addFiles = useCallback(async (newFiles: FileList | File[]) => {
        setError(null);
        const fileArray = Array.from(newFiles).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
        if (fileArray.length === 0) { setError("Only PDF files are accepted"); return; }
        if (fileArray.some(f => f.size > 50 * 1024 * 1024)) { setError("Files must be under 50 MB"); return; }

        const entries: PDFFile[] = fileArray.map(f => ({ file: f, id: crypto.randomUUID(), thumbnail: null }));
        setPdfFiles(prev => [...prev, ...entries]);

        // Generate thumbnails asynchronously
        for (const entry of entries) {
            const thumb = await generateThumbnail(entry.file);
            setPdfFiles(prev => prev.map(p => p.id === entry.id ? { ...p, thumbnail: thumb } : p));
        }
    }, [generateThumbnail]);

    const removeFile = (id: string) => {
        setPdfFiles(prev => prev.filter(p => p.id !== id));
    };

    /* ── Drag & Drop zone ── */
    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
    const handleDragLeave = useCallback(() => setDragging(false), []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    }, [addFiles]);

    /* ── Reorder drag ── */
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
            setPdfFiles(prev => {
                const updated = [...prev];
                const [moved] = updated.splice(dragIndex, 1);
                updated.splice(dragOverIndex, 0, moved);
                return updated;
            });
        }
        setDragIndex(null);
        setDragOverIndex(null);
    };

    /* ── Process merge ── */
    const handleMerge = useCallback(async () => {
        if (pdfFiles.length < 2) { setError("Select at least 2 PDFs to merge"); return; }
        setIsProcessing(true); setError(null); setStatus(null);

        try {
            const response = await uploadFiles(pdfFiles.map(p => p.file), "/api/edit/merge");
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [pdfFiles]);

    const handleReset = () => {
        setPdfFiles([]); setStatus(null); setError(null); setIsProcessing(false);
    };

    return (
        <div>
            {/* Hero */}
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Merge PDF{" "}
                        <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                            Online Free
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Combine multiple PDF files into one. Drag to reorder, preview thumbnails, then merge instantly.
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
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Merge more files
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Upload zone */}
                            <div
                                className={`upload-zone p-8 sm:p-12 text-center cursor-pointer ${dragging ? "dragging" : ""}`}
                                style={{ minHeight: "220px" }}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}
                            >
                                <input ref={inputRef} type="file" accept=".pdf" multiple
                                    onChange={e => e.target.files && addFiles(e.target.files)} className="hidden" />
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                                        <Upload className="h-7 w-7 text-cyan-400" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-white mb-1">
                                            {dragging ? "Drop PDFs here" : "Drop PDF files here or click to upload"}
                                        </p>
                                        <p className="text-sm text-gray-500">Select multiple PDFs • Max 50 MB each</p>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                    <AlertCircle className="h-4 w-4 shrink-0" />{error}
                                </div>
                            )}

                            {/* File list with reorder */}
                            {pdfFiles.length > 0 && (
                                <div className="mt-6 space-y-2">
                                    <p className="text-xs text-gray-500 mb-2">Drag to reorder • {pdfFiles.length} file{pdfFiles.length > 1 ? "s" : ""}</p>
                                    {pdfFiles.map((pf, i) => (
                                        <div
                                            key={pf.id}
                                            draggable
                                            onDragStart={handleItemDragStart(i)}
                                            onDragOver={handleItemDragOver(i)}
                                            onDragEnd={handleItemDragEnd}
                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing
                                                ${dragOverIndex === i ? "border-cyan-500/50 bg-cyan-500/5" : "border-white/5 bg-white/[0.03]"}
                                                ${dragIndex === i ? "opacity-50" : "opacity-100"}`}
                                        >
                                            <GripVertical className="h-4 w-4 text-gray-600 shrink-0" />
                                            <span className="text-xs text-gray-500 font-mono w-6 text-center shrink-0">{i + 1}</span>
                                            {pf.thumbnail ? (
                                                <img src={pf.thumbnail} alt="" className="h-12 w-9 object-cover rounded border border-white/10 shrink-0" />
                                            ) : (
                                                <div className="h-12 w-9 bg-white/[0.03] rounded border border-white/10 flex items-center justify-center shrink-0">
                                                    <FileText className="h-4 w-4 text-gray-600" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-white truncate">{pf.file.name}</p>
                                                <p className="text-xs text-gray-500">{(pf.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); removeFile(pf.id); }}
                                                className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Merge button */}
                            {pdfFiles.length >= 2 && !isProcessing && (
                                <button onClick={handleMerge}
                                    className="btn-primary w-full mt-6 flex items-center justify-center gap-2 py-3.5">
                                    Merge {pdfFiles.length} PDFs <ArrowRight className="h-4 w-4" />
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
