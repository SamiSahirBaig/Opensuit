"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Unlock, ArrowRight, RefreshCw, AlertCircle, RotateCcw, Eye, EyeOff } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

export function UnlockPDFTool() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
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
            if (password) params.set("password", password);

            const endpoint = `/api/security/unlock?${params.toString()}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, password]);

    const handleReset = () => {
        setFile(null); setStatus(null); setError(null); setIsProcessing(false);
        setPassword(""); setShowPassword(false);
    };

    const isWrongPassword = status?.status === "FAILED" &&
        (status?.message?.toLowerCase().includes("password") || status?.message?.toLowerCase().includes("incorrect"));

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Unlock PDF{" "}
                        <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                            Remove Protection
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Remove password protection and restrictions. Provide the current password to unlock your PDF.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Unlock another file
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
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                        <Upload className="h-7 w-7 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-white mb-1">
                                            {dragging ? "Drop PDF here" : "Drop a password-protected PDF here"}
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
                                <div className="h-12 w-12 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Password */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    PDF Password
                                </label>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 pr-10 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors"
                                        placeholder="Enter PDF password (if protected)" />
                                    <button onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Leave empty if the PDF only has editing restrictions (owner password).
                                </p>
                            </div>

                            {/* Wrong password error */}
                            {isWrongPassword && (
                                <div className="mb-6 flex items-center gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <div>
                                        <p className="font-medium">Incorrect password</p>
                                        <p className="text-xs text-red-400/80 mt-0.5">Please check your password and try again.</p>
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            {!isProcessing && (
                                <button onClick={handleProcess}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
                                    style={{ background: "linear-gradient(135deg, #059669, #22c55e)" }}>
                                    <Unlock className="h-4 w-4" /> Unlock PDF <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && !isWrongPassword && (
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
