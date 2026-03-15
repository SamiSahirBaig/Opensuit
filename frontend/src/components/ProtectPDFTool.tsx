"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Upload, FileText, Lock, ArrowRight, RefreshCw, AlertCircle, RotateCcw, Eye, EyeOff, Shield } from "lucide-react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

const PERMISSIONS = [
    { id: "allowPrinting", label: "Allow Printing", desc: "Users can print the document" },
    { id: "allowCopying", label: "Allow Copying", desc: "Users can copy text and images" },
    { id: "allowEditing", label: "Allow Editing", desc: "Users can modify the document" },
    { id: "allowFormFilling", label: "Allow Form Filling", desc: "Users can fill in forms" },
    { id: "allowAnnotations", label: "Allow Annotations", desc: "Users can add comments" },
];

export function ProtectPDFTool() {
    const [file, setFile] = useState<File | null>(null);
    const [userPassword, setUserPassword] = useState("");
    const [ownerPassword, setOwnerPassword] = useState("");
    const [useOwnerPassword, setUseOwnerPassword] = useState(false);
    const [showUserPw, setShowUserPw] = useState(false);
    const [showOwnerPw, setShowOwnerPw] = useState(false);
    const [encryptionBits, setEncryptionBits] = useState(128);
    const [permissions, setPermissions] = useState<Record<string, boolean>>({
        allowPrinting: true,
        allowCopying: true,
        allowEditing: true,
        allowFormFilling: true,
        allowAnnotations: true,
    });
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

    // Password strength: 0=empty, 1=weak, 2=fair, 3=strong
    const passwordStrength = useMemo(() => {
        if (!userPassword) return 0;
        let score = 0;
        if (userPassword.length >= 8) score++;
        if (/[A-Z]/.test(userPassword) && /[a-z]/.test(userPassword)) score++;
        if (/[0-9]/.test(userPassword) && /[^A-Za-z0-9]/.test(userPassword)) score++;
        return score;
    }, [userPassword]);

    const strengthLabel = ["", "Weak", "Fair", "Strong"][passwordStrength];
    const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-emerald-500"][passwordStrength];

    const handleProcess = useCallback(async () => {
        if (!file || !userPassword) return;
        setIsProcessing(true); setError(null); setStatus(null);
        try {
            const params = new URLSearchParams();
            params.set("userPassword", userPassword);
            if (useOwnerPassword && ownerPassword) {
                params.set("ownerPassword", ownerPassword);
            }
            params.set("encryptionBits", String(encryptionBits));
            for (const [key, value] of Object.entries(permissions)) {
                params.set(key, String(value));
            }

            const endpoint = `/api/security/protect?${params.toString()}`;
            const response = await uploadFile(file, endpoint);
            await pollJobStatus(response.jobId, s => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [file, userPassword, ownerPassword, useOwnerPassword, encryptionBits, permissions]);

    const handleReset = () => {
        setFile(null); setStatus(null); setError(null); setIsProcessing(false);
        setUserPassword(""); setOwnerPassword(""); setUseOwnerPassword(false);
        setEncryptionBits(128);
        setPermissions({
            allowPrinting: true, allowCopying: true, allowEditing: true,
            allowFormFilling: true, allowAnnotations: true,
        });
    };

    const togglePermission = (id: string) => {
        setPermissions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div>
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Protect PDF{" "}
                        <span className="bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                            with Password
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Add password protection and set permissions. Choose encryption level and control what users can do.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors">
                                <RefreshCw className="h-4 w-4" /> Protect another file
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
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
                                        <Upload className="h-7 w-7 text-red-400" />
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
                                <div className="h-12 w-12 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="h-5 w-5 text-red-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button onClick={handleReset} className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                            </div>

                            {/* User Password */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Password (required to open)</label>
                                <div className="relative">
                                    <input type={showUserPw ? "text" : "password"} value={userPassword}
                                        onChange={e => setUserPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 pr-10 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none transition-colors"
                                        placeholder="Enter password" />
                                    <button onClick={() => setShowUserPw(!showUserPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                        {showUserPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {/* Strength indicator */}
                                {userPassword && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex gap-1 flex-1">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength ? strengthColor : "bg-white/10"}`} />
                                            ))}
                                        </div>
                                        <span className={`text-xs ${passwordStrength === 3 ? "text-emerald-400" : passwordStrength === 2 ? "text-yellow-400" : "text-red-400"}`}>
                                            {strengthLabel}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Owner password toggle */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] mb-3">
                                    <span className="text-sm text-gray-300">Separate owner password</span>
                                    <button onClick={() => setUseOwnerPassword(!useOwnerPassword)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${useOwnerPassword ? "bg-red-500" : "bg-white/10"}`}>
                                        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${useOwnerPassword ? "translate-x-5" : ""}`} />
                                    </button>
                                </div>
                                {useOwnerPassword && (
                                    <div className="relative">
                                        <input type={showOwnerPw ? "text" : "password"} value={ownerPassword}
                                            onChange={e => setOwnerPassword(e.target.value)}
                                            className="w-full px-4 py-2.5 pr-10 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none transition-colors"
                                            placeholder="Owner password (for modifying permissions)" />
                                        <button onClick={() => setShowOwnerPw(!showOwnerPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                            {showOwnerPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Encryption Level */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">Encryption Level</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[128, 256].map(bits => (
                                        <button key={bits} onClick={() => setEncryptionBits(bits)}
                                            className={`p-4 rounded-lg border text-center transition-all
                                                ${encryptionBits === bits
                                                    ? "border-red-500/50 bg-red-500/10 text-white shadow-lg shadow-red-500/5"
                                                    : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10"}`}>
                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                <Shield className="h-4 w-4" />
                                                <span className="font-bold text-lg">{bits}-bit</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{bits === 128 ? "AES Standard" : "AES Maximum"}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Permissions */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">Document Permissions</label>
                                <div className="space-y-2">
                                    {PERMISSIONS.map(p => (
                                        <div key={p.id}
                                            className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                                            <div>
                                                <p className="text-sm text-gray-300">{p.label}</p>
                                                <p className="text-xs text-gray-500">{p.desc}</p>
                                            </div>
                                            <button onClick={() => togglePermission(p.id)}
                                                className={`relative w-10 h-5 rounded-full transition-colors ${permissions[p.id] ? "bg-emerald-500" : "bg-white/10"}`}>
                                                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${permissions[p.id] ? "translate-x-5" : ""}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Submit */}
                            {!isProcessing && (
                                <button onClick={handleProcess} disabled={!userPassword}
                                    className={`btn-primary w-full flex items-center justify-center gap-2 py-3.5 ${!userPassword ? "opacity-50 cursor-not-allowed" : ""}`}
                                    style={{ background: userPassword ? "linear-gradient(135deg, #ef4444, #f43f5e)" : undefined }}>
                                    <Lock className="h-4 w-4" /> Protect PDF <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {error && (
                                <button onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors py-2">
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
