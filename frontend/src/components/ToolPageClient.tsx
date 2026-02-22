"use client";

import { useState, useCallback, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { AdUnit } from "@/components/AdUnit";
import { uploadFile, uploadFiles, pollJobStatus, JobStatusResponse } from "@/lib/api";
import { getToolBySlug } from "@/lib/tools";
import { ArrowRight, RefreshCw, CheckCircle, Shield, Zap, Clock } from "lucide-react";
import {
    trackToolPageViewed,
    trackFileUploadStarted,
    trackFileUploadCompleted,
    trackConversionStarted,
    trackConversionCompleted,
    trackError,
} from "@/lib/analytics";

interface ToolPageClientProps {
    slug: string;
}

export function ToolPageClient({ slug }: ToolPageClientProps) {
    const tool = getToolBySlug(slug);
    if (!tool) return null;
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<JobStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [extraParams, setExtraParams] = useState<Record<string, string>>({});

    // Track tool page view
    useEffect(() => {
        trackToolPageViewed(slug, tool.title);
    }, [slug, tool.title]);

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setError(null);
        setStatus(null);

        // Track upload start
        const totalSize = files.reduce((sum: number, f: File) => sum + f.size, 0);
        trackFileUploadStarted(slug, files[0].name, totalSize);
        trackConversionStarted(slug);

        try {
            let response;
            if (tool.multiFile) {
                response = await uploadFiles(files, tool.apiEndpoint);
            } else {
                let endpoint = tool.apiEndpoint;
                const params = new URLSearchParams(extraParams);
                if (params.toString()) {
                    endpoint += `?${params.toString()}`;
                }
                response = await uploadFile(files[0], endpoint);
            }

            // Track upload completed
            trackFileUploadCompleted(slug, response.jobId);

            await pollJobStatus(response.jobId, (s) => {
                setStatus(s);
                // Track conversion completed
                if (s.status === "COMPLETED") {
                    trackConversionCompleted(slug, response.jobId);
                }
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
            setError(errorMsg);
            trackError(slug, errorMsg);
        } finally {
            setIsProcessing(false);
        }
    }, [files, tool, extraParams, slug]);

    const handleReset = () => {
        setFiles([]);
        setStatus(null);
        setError(null);
        setIsProcessing(false);
        setExtraParams({});
    };

    const IconComponent = tool.icon;

    return (
        <div>
            {/* Hero */}
            <section className="hero-gradient py-16 sm:py-20 relative overflow-hidden">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div
                        className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-6 mx-auto animate-fade-in-up"
                        style={{ background: `${tool.color}15`, border: `1px solid ${tool.color}25` }}
                    >
                        <IconComponent className="h-8 w-8" style={{ color: tool.color }} />
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 animate-fade-in-up animate-delay-100">
                        {tool.title}{" "}
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            Online Free
                        </span>
                    </h1>

                    <p className="text-lg text-gray-400 max-w-2xl mx-auto animate-fade-in-up animate-delay-200">
                        {tool.description} No signup required, files auto-deleted for privacy.
                    </p>
                </div>

                {/* Decorative orbs */}
                <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                    style={{ background: `${tool.color}08` }} />
                <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                    style={{ background: `${tool.color}05` }} />
            </section>

            <AdUnit slot="hero-below" format="horizontal" />

            {/* Upload & Processing Area */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    {status?.status === "COMPLETED" ? (
                        /* Success state with reset */
                        <div className="text-center">
                            <ProcessingStatus status={status} isProcessing={false} error={null} />
                            <button
                                onClick={handleReset}
                                className="mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Process another file
                            </button>
                        </div>
                    ) : (
                        <>
                            <FileUpload
                                acceptedTypes={tool.acceptedTypes}
                                multiFile={tool.multiFile}
                                onFilesSelected={setFiles}
                            />

                            {/* Extra Fields */}
                            {tool.extraFields && tool.extraFields.length > 0 && files.length > 0 && (
                                <div className="mt-6 space-y-4 animate-fade-in-up">
                                    {tool.extraFields.map((field) => (
                                        <div key={field.name}>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                {field.label}
                                            </label>
                                            {field.type === "select" && field.options ? (
                                                <select
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
                                                    value={extraParams[field.name] || ""}
                                                    onChange={(e) => setExtraParams({ ...extraParams, [field.name]: e.target.value })}
                                                >
                                                    <option value="">Select...</option>
                                                    {field.options.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    placeholder={field.placeholder}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition-colors"
                                                    value={extraParams[field.name] || ""}
                                                    onChange={(e) => setExtraParams({ ...extraParams, [field.name]: e.target.value })}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Process Button */}
                            {files.length > 0 && !isProcessing && (
                                <button
                                    onClick={handleProcess}
                                    className="btn-primary w-full mt-6 flex items-center justify-center gap-2 py-3.5"
                                >
                                    Process {tool.title}
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            )}

                            <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />

                            {/* Retry */}
                            {error && (
                                <button
                                    onClick={handleReset}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors py-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Try again
                                </button>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Mini trust badges */}
            <section className="border-t border-white/5">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                            { icon: Shield, text: "Files auto-deleted" },
                            { icon: Zap, text: "Under 2s processing" },
                            { icon: Clock, text: "No signup needed" },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex flex-col items-center gap-2">
                                <Icon className="h-4 w-4 text-indigo-400/70" />
                                <span className="text-xs text-gray-500">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <AdUnit slot="mid-content" format="rectangle" />

            {/* Long-form SEO Content */}
            <section className="border-t border-white/5 py-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <div className="prose prose-invert prose-gray max-w-none text-gray-400 space-y-5">
                        <h2 className="text-2xl font-bold text-white">About {tool.title}</h2>
                        <p>{tool.longDescription}</p>

                        <h3 className="text-lg font-semibold text-white">How to {tool.title} Online</h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li>Click the upload area above or drag and drop your file</li>
                            {tool.extraFields?.map((field, i) => (
                                <li key={i}>Configure {field.label.toLowerCase()} if needed</li>
                            ))}
                            <li>Click &quot;Process {tool.title}&quot; to start</li>
                            <li>Wait for processing to complete (usually under 2 seconds)</li>
                            <li>Download your processed file</li>
                        </ol>

                        <h3 className="text-lg font-semibold text-white">Why Use OpenSuite&apos;s {tool.title}?</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 not-prose">
                            {[
                                { icon: CheckCircle, text: "100% free with no hidden costs or watermarks" },
                                { icon: CheckCircle, text: "No account or signup required" },
                                { icon: Shield, text: "Files encrypted during transfer and processing" },
                                { icon: Clock, text: "All files auto-deleted after 1 hour" },
                                { icon: Zap, text: "Fast processing — most files under 2 seconds" },
                                { icon: CheckCircle, text: "Works on any device with a modern browser" },
                            ].map(({ icon: Icon, text }) => (
                                <div key={text} className="flex items-start gap-2.5 text-sm text-gray-400">
                                    <Icon className="h-4 w-4 text-green-400/80 shrink-0 mt-0.5" />
                                    <span>{text}</span>
                                </div>
                            ))}
                        </div>

                        <h3 className="text-lg font-semibold text-white">Privacy & Security</h3>
                        <p className="text-sm">
                            Your privacy is our priority. All files uploaded to OpenSuite are processed securely:
                            files are assigned random UUID names, transferred over encrypted connections, and
                            automatically deleted from our servers within 1 hour. We never read, analyze, or
                            store the content of your documents. Download links expire after 10 minutes for
                            additional security.
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="border-t border-white/5 py-16 bg-[#0c0c14]">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <h2 className="text-xl font-bold text-white mb-6 text-center">{tool.title} FAQ</h2>
                    <div className="space-y-3">
                        {[
                            { q: `Is the ${tool.title} tool free?`, a: `Yes, ${tool.title} is completely free. No signup, no limits, no watermarks.` },
                            { q: "Is my file secure?", a: "All files are encrypted during transfer and automatically deleted after 1 hour." },
                            { q: "What's the maximum file size?", a: "You can upload files up to 50MB." },
                            { q: "How long does processing take?", a: "Most files are processed in under 2 seconds. Larger or complex files may take slightly longer." },
                            { q: "Do I need the backend running?", a: "Yes — the Spring Boot backend must be running on port 8080 for file processing to work. Run './mvnw spring-boot:run' in the backend directory." },
                        ].map(({ q, a }, i) => (
                            <details key={i} className="faq-item glass-card overflow-hidden">
                                <summary className="text-white text-sm">{q}<span className="text-gray-500 text-xs ml-auto">+</span></summary>
                                <div className="px-5 py-4 text-sm text-gray-400">{a}</div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
