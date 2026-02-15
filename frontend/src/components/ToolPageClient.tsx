"use client";

import { useState, useCallback } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { AdUnit } from "@/components/AdUnit";
import { uploadFile, uploadFiles, pollJobStatus, JobStatusResponse } from "@/lib/api";
import { getToolBySlug } from "@/lib/tools";
import { ArrowRight } from "lucide-react";

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

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setError(null);
        setStatus(null);

        try {
            let response;
            if (tool.multiFile) {
                response = await uploadFiles(files, tool.apiEndpoint);
            } else {
                // Build endpoint with extra params as query string
                let endpoint = tool.apiEndpoint;
                const params = new URLSearchParams(extraParams);
                if (params.toString()) {
                    endpoint += `?${params.toString()}`;
                }
                response = await uploadFile(files[0], endpoint);
            }

            // Poll for status
            await pollJobStatus(response.jobId, (s) => setStatus(s));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsProcessing(false);
        }
    }, [files, tool, extraParams]);

    const IconComponent = tool.icon;

    return (
        <div>
            {/* Hero */}
            <section className="hero-gradient py-16 sm:py-20">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <div
                        className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-6 mx-auto"
                        style={{ background: `${tool.color}15`, border: `1px solid ${tool.color}25` }}
                    >
                        <IconComponent className="h-8 w-8" style={{ color: tool.color }} />
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                        {tool.title}{" "}
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            Online Free
                        </span>
                    </h1>

                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        {tool.description} No signup required, files auto-deleted for privacy.
                    </p>
                </div>
            </section>

            <AdUnit slot="hero-below" format="horizontal" />

            {/* Upload & Processing Area */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <FileUpload
                        acceptedTypes={tool.acceptedTypes}
                        multiFile={tool.multiFile}
                        onFilesSelected={setFiles}
                    />

                    {/* Extra Fields */}
                    {tool.extraFields && tool.extraFields.length > 0 && files.length > 0 && (
                        <div className="mt-6 space-y-4">
                            {tool.extraFields.map((field) => (
                                <div key={field.name}>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        {field.label}
                                    </label>
                                    {field.type === "select" && field.options ? (
                                        <select
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
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
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                                            value={extraParams[field.name] || ""}
                                            onChange={(e) => setExtraParams({ ...extraParams, [field.name]: e.target.value })}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Process Button */}
                    {files.length > 0 && !isProcessing && status?.status !== "COMPLETED" && (
                        <button onClick={handleProcess} className="btn-primary w-full mt-6 flex items-center justify-center gap-2 py-3.5">
                            Process {tool.title}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    )}

                    <ProcessingStatus status={status} isProcessing={isProcessing} error={error} />
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
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>100% free with no hidden costs or watermarks</li>
                            <li>No account or signup required</li>
                            <li>Files are encrypted during transfer and processing</li>
                            <li>All files are automatically deleted after 1 hour</li>
                            <li>Fast processing — most files complete in under 2 seconds</li>
                            <li>Works on any device with a modern web browser</li>
                            <li>No software installation needed</li>
                        </ul>

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
