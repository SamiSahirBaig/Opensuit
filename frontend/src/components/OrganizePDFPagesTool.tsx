"use client";

import { useState, useCallback, useRef } from "react";
import {
    Upload, FileText, Layers, ArrowRight, RefreshCw, AlertCircle, X,
    RotateCw, Copy, Plus, Trash2, Check, GripVertical, ArrowDownUp, Undo2
} from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

interface PageInfo {
    index: number;
    thumbnail: string | null;
    selected: boolean;
    rotation: number;
    isDuplicate: boolean;
    isBlankInsert: boolean;
    isRemoved: boolean;
}

type ActiveTool = "select" | "rotate" | "duplicate" | "insertBlank" | "remove";

export function OrganizePDFPagesTool() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageInfo[]>([]);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTool, setActiveTool] = useState<ActiveTool>("select");
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [history, setHistory] = useState<PageInfo[][]>([]);
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
                pageInfos.push({
                    index: i, thumbnail: null, selected: false,
                    rotation: 0, isDuplicate: false, isBlankInsert: false, isRemoved: false
                });
            }
            setPages(pageInfos);

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport }).promise;
                const thumb = canvas.toDataURL("image/jpeg", 0.6);

                setPages(prev => prev.map(p => p.index === i && !p.isDuplicate && !p.isBlankInsert ? { ...p, thumbnail: thumb } : p));
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

    /* ── History (undo) ── */
    const pushHistory = () => setHistory(prev => [...prev.slice(-19), pages.map(p => ({ ...p }))]);
    const undo = () => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setPages(prev);
        setHistory(h => h.slice(0, -1));
    };

    /* ── Drag reorder ── */
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
            pushHistory();
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

    /* ── Page click handler based on active tool ── */
    const handlePageClick = (idx: number) => {
        const page = pages[idx];
        if (page.isRemoved) return;

        switch (activeTool) {
            case "select":
                setPages(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
                break;
            case "rotate":
                pushHistory();
                setPages(prev => prev.map((p, i) =>
                    i === idx ? { ...p, rotation: (p.rotation + 90) % 360 } : p
                ));
                break;
            case "duplicate":
                pushHistory();
                setPages(prev => {
                    const copy: PageInfo = {
                        ...prev[idx],
                        isDuplicate: true,
                        selected: false,
                    };
                    const updated = [...prev];
                    updated.splice(idx + 1, 0, copy);
                    return updated;
                });
                break;
            case "insertBlank":
                pushHistory();
                setPages(prev => {
                    const blank: PageInfo = {
                        index: 0, thumbnail: null, selected: false,
                        rotation: 0, isDuplicate: false, isBlankInsert: true, isRemoved: false
                    };
                    const updated = [...prev];
                    updated.splice(idx + 1, 0, blank);
                    return updated;
                });
                break;
            case "remove":
                pushHistory();
                setPages(prev => prev.map((p, i) =>
                    i === idx ? { ...p, isRemoved: true, selected: false } : p
                ));
                break;
        }
    };

    /* ── Batch operations ── */
    const removeSelected = () => {
        const selected = pages.some(p => p.selected);
        if (!selected) return;
        pushHistory();
        setPages(prev => prev.map(p => p.selected ? { ...p, isRemoved: true, selected: false } : p));
    };

    const rotateSelected = () => {
        const selected = pages.some(p => p.selected);
        if (!selected) return;
        pushHistory();
        setPages(prev => prev.map(p =>
            p.selected ? { ...p, rotation: (p.rotation + 90) % 360 } : p
        ));
    };

    /* ── Process ── */
    const handleOrganize = useCallback(async () => {
        if (!file) return;
        setIsProcessing(true); setError(null); setStatus(null);

        try {
            const params = new URLSearchParams();

            // Build order from non-removed pages
            const activePages = pages.filter(p => !p.isRemoved);
            const originalPages = activePages.filter(p => !p.isBlankInsert);
            const order = originalPages.map(p => p.index).join(",");
            if (order) params.set("order", order);

            // Build removals
            const removedOriginals = pages.filter(p => p.isRemoved && !p.isDuplicate && !p.isBlankInsert);
            if (removedOriginals.length > 0) {
                params.set("removals", removedOriginals.map(p => p.index).join(","));
            }

            // Build rotations
            const rotated = activePages.filter(p => p.rotation > 0 && !p.isBlankInsert);
            if (rotated.length > 0) {
                params.set("rotations", rotated.map(p => `${p.index}:${p.rotation}`).join(","));
            }

            // Build duplicates
            const duplicates = activePages.filter(p => p.isDuplicate);
            if (duplicates.length > 0) {
                params.set("duplicates", duplicates.map(p => p.index).join(","));
            }

            // Build blank inserts (by position)
            const blanks = activePages.map((p, i) => ({ ...p, pos: i })).filter(p => p.isBlankInsert);
            if (blanks.length > 0) {
                params.set("insertBlanks", blanks.map(p => p.pos + 1).join(","));
            }

            const endpoint = `/api/edit/organize-pages?${params.toString()}`;
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
        setHistory([]); setActiveTool("select");
    };

    const selectedCount = pages.filter(p => p.selected && !p.isRemoved).length;
    const hasModifications = pages.some(p => p.isRemoved || p.isDuplicate || p.isBlankInsert || p.rotation > 0) ||
        pages.filter(p => !p.isRemoved && !p.isBlankInsert).some((p, i, arr) => i > 0 && p.index < arr[i - 1].index);

    const tools: { id: ActiveTool; icon: typeof RotateCw; label: string; color: string }[] = [
        { id: "select", icon: Check, label: "Select", color: "indigo" },
        { id: "rotate", icon: RotateCw, label: "Rotate", color: "violet" },
        { id: "duplicate", icon: Copy, label: "Duplicate", color: "cyan" },
        { id: "insertBlank", icon: Plus, label: "Insert Blank", color: "emerald" },
        { id: "remove", icon: Trash2, label: "Remove", color: "rose" },
    ];

    return (
        <div>
            {/* Hero */}
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Organize PDF Pages{" "}
                        <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                            Online Free
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        All-in-one page organizer: remove, rotate, duplicate, insert blanks, and reorder pages in one tool.
                    </p>
                </div>
            </section>

            {/* Main Area */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-violet-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Organize another file
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
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20">
                                        <Layers className="h-7 w-7 text-violet-400" />
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
                            <div className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-white/[0.03] mb-4">
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

                            {/* Tool palette */}
                            <div className="flex flex-wrap gap-1.5 mb-2 p-2 rounded-lg border border-white/5 bg-white/[0.02]">
                                {tools.map(t => {
                                    const Icon = t.icon;
                                    return (
                                        <button key={t.id} onClick={() => setActiveTool(t.id)}
                                            className={`px-3 py-2 text-xs rounded-md border transition-all inline-flex items-center gap-1.5
                                                ${activeTool === t.id
                                                    ? `border-${t.color}-500/50 bg-${t.color}-500/10 text-white`
                                                    : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10 hover:text-gray-300"}`}
                                            style={activeTool === t.id ? {
                                                borderColor: `var(--color-${t.color})`,
                                                backgroundColor: `color-mix(in srgb, var(--color-${t.color}) 10%, transparent)`,
                                            } : {}}
                                        >
                                            <Icon className="h-3.5 w-3.5" /> {t.label}
                                        </button>
                                    );
                                })}

                                <div className="flex-1" />

                                {/* Batch actions */}
                                {selectedCount > 0 && (
                                    <>
                                        <button onClick={rotateSelected}
                                            className="px-3 py-2 text-xs rounded-md border border-violet-500/20 bg-violet-500/5 text-violet-400 hover:bg-violet-500/10 transition-all inline-flex items-center gap-1">
                                            <RotateCw className="h-3 w-3" /> Rotate Selected
                                        </button>
                                        <button onClick={removeSelected}
                                            className="px-3 py-2 text-xs rounded-md border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 transition-all inline-flex items-center gap-1">
                                            <Trash2 className="h-3 w-3" /> Remove Selected
                                        </button>
                                    </>
                                )}

                                <button onClick={undo} disabled={history.length === 0}
                                    className="px-3 py-2 text-xs rounded-md border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white transition-all disabled:opacity-30 inline-flex items-center gap-1">
                                    <Undo2 className="h-3 w-3" /> Undo
                                </button>
                            </div>

                            {/* Active tool hint */}
                            <p className="text-xs text-gray-500 mb-3">
                                {activeTool === "select" && "Click pages to select, then use batch actions. Drag to reorder."}
                                {activeTool === "rotate" && "Click a page to rotate it 90° clockwise"}
                                {activeTool === "duplicate" && "Click a page to insert a copy after it"}
                                {activeTool === "insertBlank" && "Click a page to insert a blank page after it"}
                                {activeTool === "remove" && "Click a page to mark it for removal"}
                            </p>

                            {/* Thumbnail grid */}
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block h-8 w-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                                    <p className="text-sm text-gray-500 mt-3">Loading pages...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 mb-6">
                                    {pages.map((p, idx) => (
                                        <div
                                            key={`page-${idx}`}
                                            draggable={!p.isRemoved}
                                            onDragStart={handleItemDragStart(idx)}
                                            onDragOver={handleItemDragOver(idx)}
                                            onDragEnd={handleItemDragEnd}
                                            onClick={() => handlePageClick(idx)}
                                            className={`relative rounded-lg border-2 transition-all overflow-hidden group
                                                ${p.isRemoved
                                                    ? "border-rose-500/30 bg-rose-500/5 opacity-40 cursor-not-allowed"
                                                    : p.selected
                                                        ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 cursor-pointer"
                                                        : dragOverIndex === idx
                                                            ? "border-violet-500/60 bg-violet-500/10 scale-105 cursor-pointer"
                                                            : "border-white/10 bg-white/[0.02] hover:border-white/20 cursor-pointer"}
                                                ${dragIndex === idx ? "opacity-40 scale-95" : ""}`}
                                        >
                                            {/* Badges */}
                                            <div className="absolute top-1 right-1 z-10 flex gap-1">
                                                {p.selected && (
                                                    <div className="h-4 w-4 rounded bg-indigo-500 flex items-center justify-center">
                                                        <Check className="h-2.5 w-2.5 text-white" />
                                                    </div>
                                                )}
                                                {p.rotation > 0 && (
                                                    <div className="h-4 px-1 rounded bg-violet-500 flex items-center justify-center">
                                                        <span className="text-[9px] font-bold text-white">{p.rotation}°</span>
                                                    </div>
                                                )}
                                                {p.isDuplicate && (
                                                    <div className="h-4 px-1 rounded bg-cyan-500 flex items-center justify-center">
                                                        <Copy className="h-2.5 w-2.5 text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Grip */}
                                            {!p.isRemoved && (
                                                <div className="absolute top-1 left-1 z-10 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <GripVertical className="h-3 w-3 text-white/60" />
                                                </div>
                                            )}

                                            {/* Thumbnail / blank */}
                                            {p.isBlankInsert ? (
                                                <div className="w-full aspect-[3/4] bg-white/[0.06] flex items-center justify-center border-b border-dashed border-white/10">
                                                    <span className="text-[10px] text-gray-500 font-medium">BLANK</span>
                                                </div>
                                            ) : p.thumbnail ? (
                                                <img src={p.thumbnail} alt={`Page ${p.index}`}
                                                    className={`w-full aspect-[3/4] object-cover transition-all
                                                        ${p.isRemoved ? "grayscale" : ""}`}
                                                    style={{ transform: `rotate(${p.rotation}deg)` }} />
                                            ) : (
                                                <div className="w-full aspect-[3/4] bg-white/[0.03] flex items-center justify-center">
                                                    <FileText className="h-6 w-6 text-gray-600" />
                                                </div>
                                            )}

                                            {/* Label */}
                                            <div className="text-center py-1 text-[10px] font-medium text-gray-500">
                                                {p.isBlankInsert ? "blank" : p.isRemoved ? <s>pg {p.index}</s> : `pg ${p.index}`}
                                                {p.isDuplicate && " (copy)"}
                                            </div>

                                            {/* Removed overlay */}
                                            {p.isRemoved && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Trash2 className="h-5 w-5 text-rose-400/60" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Apply button */}
                            {hasModifications && !isProcessing && (
                                <button onClick={handleOrganize}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5
                                        !bg-gradient-to-r !from-violet-600 !to-purple-600 hover:!from-violet-500 hover:!to-purple-500">
                                    Apply Changes <ArrowRight className="h-4 w-4" />
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
