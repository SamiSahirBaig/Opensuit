"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PenTool, ArrowRight, RefreshCw, AlertCircle, Type, Upload, X } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { pollJobStatus, JobStatusResponse } from "@/lib/api";

const API_BASE = typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")
    : "";

type SignMode = "draw" | "type" | "upload";

export function SignPDFTool() {
    const [file, setFile] = useState<File | null>(null);
    const [signMode, setSignMode] = useState<SignMode>("draw");
    const [typedName, setTypedName] = useState("");
    const [signerName, setSignerName] = useState("");
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [page, setPage] = useState("1");
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files);
        const pdf = arr.find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
        if (!pdf) { setError("Only PDF files are accepted"); return; }
        if (pdf.size > 50 * 1024 * 1024) { setError("File must be under 50 MB"); return; }
        setFile(pdf); setError(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
    const handleDragLeave = useCallback(() => setDragging(false), []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    /* ── Canvas drawing ── */
    useEffect(() => {
        if (signMode === "draw" && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }, [signMode]);

    const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const ctx = canvasRef.current!.getContext("2d")!;
        const { x, y } = getCanvasCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current!.getContext("2d")!;
        const { x, y } = getCanvasCoords(e);
        ctx.strokeStyle = "#1a1a8a";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current) {
            setSignatureData(canvasRef.current.toDataURL("image/png"));
        }
    };

    const clearCanvas = () => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d")!;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setSignatureData(null);
        }
    };

    const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => setSignatureData(reader.result as string);
        reader.readAsDataURL(f);
    };

    /* ── Sign ── */
    const handleSign = useCallback(async () => {
        if (!file) return;
        setIsProcessing(true); setError(null); setStatus(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("page", page);
            formData.append("x", "100");
            formData.append("y", "100");
            formData.append("width", "200");
            formData.append("height", "80");
            formData.append("name", signerName || typedName);
            formData.append("date", new Date().toLocaleDateString());

            if (signMode === "type") {
                formData.append("name", typedName);
            } else if (signatureData) {
                formData.append("signatureData", signatureData);
            }

            const res = await fetch(`${API_BASE}/api/edit/sign`, {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({ message: `Request failed (${res.status})` }));
                throw new Error(data.message || "Signing failed");
            }
            const data = await res.json();
            await pollJobStatus(data.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, page, signerName, typedName, signMode, signatureData]);

    const handleReset = () => {
        setFile(null); setStatus(null); setError(null); setIsProcessing(false);
        setSignatureData(null); setTypedName(""); setSignerName(""); setPage("1");
    };

    const hasSignature = signMode === "type" ? typedName.trim().length > 0 : !!signatureData;

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Sign PDF{" "}
                        <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                            Online Free
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Draw, type, or upload your signature and apply it to any page of your PDF.
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
                                <RefreshCw className="h-4 w-4" /> Sign another file
                            </button>
                        </div>
                    ) : !file ? (
                        <>
                            <div
                                className={`upload-zone p-8 sm:p-12 text-center cursor-pointer ${dragging ? "dragging" : ""}`}
                                style={{ minHeight: "220px" }}
                                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}
                            >
                                <input ref={inputRef} type="file" accept=".pdf"
                                    onChange={e => e.target.files && handleFiles(e.target.files)} className="hidden" />
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20">
                                        <PenTool className="h-7 w-7 text-violet-400" />
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
                            <div className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-white/[0.03] mb-6">
                                <PenTool className="h-5 w-5 text-violet-400 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Signature mode tabs */}
                            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 mb-6">
                                {[
                                    { mode: "draw" as SignMode, icon: PenTool, label: "Draw" },
                                    { mode: "type" as SignMode, icon: Type, label: "Type" },
                                    { mode: "upload" as SignMode, icon: Upload, label: "Upload" },
                                ].map(({ mode, icon: Icon, label }) => (
                                    <button key={mode} onClick={() => setSignMode(mode)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${signMode === mode
                                            ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                            : "text-gray-400 hover:text-white"}`}>
                                        <Icon className="h-4 w-4" /> {label}
                                    </button>
                                ))}
                            </div>

                            {/* Signature input */}
                            {signMode === "draw" && (
                                <div className="mb-6">
                                    <div className="relative border-2 border-dashed border-white/10 rounded-xl overflow-hidden bg-white">
                                        <canvas ref={canvasRef} width={500} height={150}
                                            className="w-full cursor-crosshair touch-none"
                                            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                                        />
                                    </div>
                                    <button onClick={clearCanvas}
                                        className="mt-2 text-xs text-gray-500 hover:text-red-400 transition-colors">
                                        Clear signature
                                    </button>
                                </div>
                            )}

                            {signMode === "type" && (
                                <div className="mb-6">
                                    <input type="text" value={typedName}
                                        onChange={e => setTypedName(e.target.value)}
                                        placeholder="Type your full name"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none transition-colors" />
                                    {typedName && (
                                        <div className="mt-3 p-4 bg-white rounded-xl text-center">
                                            <p className="text-2xl text-indigo-900 italic font-serif">{typedName}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {signMode === "upload" && (
                                <div className="mb-6">
                                    <label className="block p-6 border-2 border-dashed border-white/10 rounded-xl text-center cursor-pointer hover:border-violet-500/30 transition-colors">
                                        <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                                        <Upload className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400">Upload signature image (PNG, JPG)</p>
                                    </label>
                                    {signatureData && (
                                        <div className="mt-3 p-4 bg-white rounded-xl text-center">
                                            <img src={signatureData} alt="Signature" className="max-h-20 mx-auto" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Page number & signer name */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Page Number</label>
                                    <input type="number" min="1" value={page}
                                        onChange={e => setPage(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-violet-500 focus:outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Signer Name</label>
                                    <input type="text" value={signerName}
                                        onChange={e => setSignerName(e.target.value)}
                                        placeholder="Your name"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none text-sm" />
                                </div>
                            </div>

                            {!isProcessing && hasSignature && (
                                <button onClick={handleSign}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5
                                        !bg-gradient-to-r !from-violet-600 !to-purple-600 hover:!from-violet-500 hover:!to-purple-500">
                                    Apply Signature <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            {!hasSignature && !isProcessing && (
                                <p className="text-center text-sm text-gray-500">
                                    {signMode === "draw" ? "Draw your signature above" : signMode === "type" ? "Type your name above" : "Upload a signature image above"}
                                </p>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
