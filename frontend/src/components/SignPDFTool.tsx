"use client";

import { useState, useRef } from "react";
import { PenTool, ArrowRight, RefreshCw, Type, Pencil, Image as ImageIcon } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";

export function SignPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Signature data
    const [signerName, setSignerName] = useState("");
    const [reason, setReason] = useState("I approve this document");
    const [location, setLocation] = useState("");
    
    // Tab state (Draw / Type / Upload)
    const [activeTab, setActiveTab] = useState<"draw" | "type" | "upload">("draw");
    const sigCanvasRef = useRef<SignatureCanvas | null>(null);

    const handleProcess = async () => {
        if (!file) {
            setError("Please select a PDF file first");
            return;
        }

        if (!signerName.trim()) {
            setError("Please provide a signer name");
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        setStatus(null);

        try {
            // Include signature details in the query params. The backend will create a PKCS7 placeholder.
            const queryParams = new URLSearchParams({
                signerName,
                reason,
                location
            });
            const response = await uploadFile(file, `/api/edit/sign-pdf?${queryParams.toString()}`);
            await pollJobStatus(response.jobId, (s) => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setStatus(null);
        setError(null);
        setIsProcessing(false);
        if (sigCanvasRef.current) sigCanvasRef.current.clear();
    };

    return (
        <div>
            {/* Hero Section */}
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        Digitally Sign{" "}
                        <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                            PDF
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Draw your signature, provide metadata, and cryptographically prepare your document.
                    </p>
                </div>
            </section>

            {/* Main Area */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        <div className="text-center bg-gray-900/50 p-8 rounded-2xl border border-white/5 shadow-xl">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={handleReset}
                                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg"
                                >
                                    <RefreshCw className="h-4 w-4" /> Sign another PDF
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-900/50 p-6 sm:p-8 rounded-2xl border border-white/5 shadow-xl">
                            {!file ? (
                                <FileUpload
                                    acceptedTypes=".pdf"
                                    onFilesSelected={(files) => {
                                        setFile(files[0]);
                                        setError(null);
                                    }}
                                />
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left Column: Form Details */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <PenTool className="h-6 w-6 text-emerald-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-white truncate">{file.name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setFile(null)}
                                                className="text-xs text-emerald-400 hover:underline shrink-0 pl-2"
                                            >
                                                Change
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-medium text-gray-300 border-b border-white/5 pb-2">Digital Certificate Details</h3>
                                            
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Signer Name *</label>
                                                <input 
                                                    type="text" 
                                                    value={signerName}
                                                    onChange={(e) => setSignerName(e.target.value)}
                                                    placeholder="e.g. John Doe"
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Reason for Signing</label>
                                                <input 
                                                    type="text" 
                                                    value={reason}
                                                    onChange={(e) => setReason(e.target.value)}
                                                    placeholder="e.g. I approve this document"
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Location (Optional)</label>
                                                <input 
                                                    type="text" 
                                                    value={location}
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    placeholder="e.g. New York, USA"
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Right Column: Visual Signature */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-gray-300 border-b border-white/5 pb-2 flex justify-between items-center">
                                            Visual Signature Appearance
                                        </h3>
                                        
                                        {/* Tabs */}
                                        <div className="flex bg-black/40 rounded-lg p-1">
                                            <button 
                                                onClick={() => setActiveTab("draw")}
                                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs rounded-md transition-colors ${activeTab === 'draw' ? 'bg-white/10 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                <Pencil className="h-3 w-3" /> Draw
                                            </button>
                                            <button 
                                                onClick={() => setActiveTab("type")}
                                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs rounded-md transition-colors ${activeTab === 'type' ? 'bg-white/10 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                <Type className="h-3 w-3" /> Type
                                            </button>
                                        </div>
                                        
                                        {/* Content based on tab */}
                                        <div className="bg-white rounded-lg h-40 relative flex items-center justify-center overflow-hidden border border-gray-200">
                                            {activeTab === "draw" && (
                                                <>
                                                    <SignatureCanvas 
                                                        ref={sigCanvasRef} 
                                                        penColor="black"
                                                        canvasProps={{className: "w-full h-full"}} 
                                                    />
                                                    <button 
                                                        onClick={() => sigCanvasRef.current?.clear()}
                                                        className="absolute top-2 right-2 text-[10px] text-gray-400 hover:text-gray-600 bg-gray-100 px-2 py-1 rounded"
                                                    >
                                                        Clear
                                                    </button>
                                                </>
                                            )}
                                            {activeTab === "type" && (
                                                <input 
                                                    type="text" 
                                                    placeholder="Type name here..." 
                                                    className="w-full text-center text-4xl border-none outline-none text-black placeholder:text-gray-300 font-serif italic"
                                                    style={{ fontFamily: "'Brush Script MT', cursive, serif" }}
                                                />
                                            )}
                                        </div>
                                        
                                        <p className="text-xs text-emerald-200/50 mt-2 italic text-center">
                                            Note: A placeholder PKCS7 digital signature dict will be securely added to your document metadata.
                                        </p>
                                    </div>
                                    
                                    <div className="lg:col-span-2 pt-6 border-t border-white/5">
                                        {!isProcessing && (
                                            <button
                                                onClick={handleProcess}
                                                className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-px"
                                            >
                                                <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors" />
                                                <div className="relative bg-gray-900 rounded-[11px] px-6 py-4 flex items-center justify-center gap-2 transition-transform group-hover:scale-[0.98]">
                                                    <span className="font-medium text-white group-hover:text-emerald-200 transition-colors">
                                                        Sign Document
                                                    </span>
                                                    <ArrowRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </button>
                                        )}

                                        <div className="mt-4">
                                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
