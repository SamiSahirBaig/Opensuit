"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Scissors, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

type SplitMode = "ranges" | "individual" | "every-n" | "by-size";

export function SplitPDFTool() {
    const [file, setFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [splitMode, setSplitMode] = useState<SplitMode>("ranges");
    const [ranges, setRanges] = useState("");
    const [everyN, setEveryN] = useState("5");
    const [maxSizeMb, setMaxSizeMb] = useState("5");
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

            // Thumbnail of first page
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport }).promise;
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

    /* ── Split ── */
    const handleSplit = useCallback(async () => {
        if (!file) return;
        setIsProcessing(true); setError(null); setStatus(null);

        try {
            const params = new URLSearchParams();
            params.set("splitMode", splitMode);
            switch (splitMode) {
                case "ranges": params.set("ranges", ranges); break;
                case "every-n": params.set("pages", everyN); break;
                case "by-size": params.set("maxSizeMb", maxSizeMb); break;
            }

            const endpoint = `/api/edit/split?${params.toString()}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, splitMode, ranges, everyN, maxSizeMb]);

    const handleReset = () => {
        setFile(null); setThumbnail(null); setPageCount(null);
        setStatus(null); setError(null); setIsProcessing(false);
        setRanges(""); setSplitMode("ranges");
    };

    const modes: { id: SplitMode; label: string; desc: string }[] = [
        { id: "ranges", label: "Page Ranges", desc: "e.g. 1-5, 10-15" },
        { id: "individual", label: "Individual", desc: "One PDF per page" },
        { id: "every-n", label: "Every N Pages", desc: "Split every N pages" },
        { id: "by-size", label: "By File Size", desc: "Max MB per file" },
    ];

    const isValid = file && (
        splitMode === "individual" ||
        (splitMode === "ranges" && ranges.trim().length > 0) ||
        (splitMode === "every-n" && parseInt(everyN) > 0) ||
        (splitMode === "by-size" && parseInt(maxSizeMb) > 0)
    );

    return (
        <div>
            {/* Hero */}
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Split PDF{" "}
                        <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                            Online Free
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Split PDFs by page ranges, individual pages, every N pages, or by file size. Download as ZIP.
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
                                <RefreshCw className="h-4 w-4" /> Split another file
                            </button>
                        </div>
                    ) : !file ? (
                        /* Upload zone */
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
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                                        <Scissors className="h-7 w-7 text-cyan-400" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-white mb-1">
                                            {dragging ? "Drop PDF here" : "Drop a PDF file here or click to upload"}
                                        </p>
                                        <p className="text-sm text-gray-500">Single PDF • Max 50 MB</p>
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
                        /* Split configuration */
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
                                    <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                    {pageCount && (
                                        <p className="text-xs text-cyan-400 mt-1">{pageCount} page{pageCount > 1 ? "s" : ""}</p>
                                    )}
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Mode selector */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                                {modes.map(m => (
                                    <button key={m.id} onClick={() => setSplitMode(m.id)}
                                        className={`p-3 rounded-lg border text-left transition-all text-sm
                                            ${splitMode === m.id
                                                ? "border-cyan-500/50 bg-cyan-500/10 text-white"
                                                : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}
                                    >
                                        <p className="font-medium text-xs">{m.label}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{m.desc}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Mode-specific inputs */}
                            {splitMode === "ranges" && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Page Ranges</label>
                                    <input
                                        type="text" placeholder={pageCount ? `e.g. 1-${Math.ceil(pageCount / 2)}, ${Math.ceil(pageCount / 2) + 1}-${pageCount}` : "e.g. 1-5, 10-15"}
                                        value={ranges} onChange={e => setRanges(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-cyan-500 focus:outline-none transition-colors"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Comma-separated, e.g. 1-5, 6-10, 15-20</p>
                                </div>
                            )}

                            {splitMode === "every-n" && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Pages per chunk</label>
                                    <input
                                        type="number" min="1" max={pageCount || 999} value={everyN}
                                        onChange={e => setEveryN(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-cyan-500 focus:outline-none transition-colors"
                                    />
                                </div>
                            )}

                            {splitMode === "by-size" && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Max size per file (MB)</label>
                                    <input
                                        type="number" min="1" max="50" value={maxSizeMb}
                                        onChange={e => setMaxSizeMb(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-cyan-500 focus:outline-none transition-colors"
                                    />
                                </div>
                            )}

                            {splitMode === "individual" && pageCount && (
                                <p className="text-sm text-gray-400 mb-6">
                                    This will create {pageCount} individual PDF{pageCount > 1 ? "s" : ""}, one per page, bundled as a ZIP download.
                                </p>
                            )}

                            {/* Split button */}
                            {isValid && !isProcessing && (
                                <button onClick={handleSplit}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                                    Split PDF <ArrowRight className="h-4 w-4" />
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
