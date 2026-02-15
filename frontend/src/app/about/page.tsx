import { Metadata } from "next";
import Link from "next/link";
import { FileText, Shield, Zap, Lock, Users, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
    title: "About OpenSuite",
    description: "Learn about OpenSuite — a free, open-access PDF processing platform with professional-grade tools for document conversion, editing, and security.",
};

export default function AboutPage() {
    return (
        <div className="py-16 sm:py-20">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                {/* Hero */}
                <div className="text-center mb-16">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 mb-6 mx-auto">
                        <FileText className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                        About{" "}
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            OpenSuite
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Professional PDF processing tools that are 100% free, require no signup,
                        and respect your privacy. Built for everyone.
                    </p>
                </div>

                {/* Mission */}
                <section className="mb-16">
                    <div className="glass-card p-8 sm:p-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
                        <p className="text-gray-400 leading-relaxed mb-4">
                            We believe that professional document processing tools should be accessible to
                            everyone — students, freelancers, small businesses, and enterprises alike.
                            Too many PDF tools hide essential features behind paywalls, require account
                            creation, or compromise your privacy by retaining your documents.
                        </p>
                        <p className="text-gray-400 leading-relaxed">
                            OpenSuite was built to change that. Every tool is completely free, with no
                            hidden limits, no watermarks, and no account required. Your files are processed
                            securely and automatically deleted — because your documents are your business,
                            not ours.
                        </p>
                    </div>
                </section>

                {/* Values */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">What We Stand For</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            {
                                icon: Shield,
                                title: "Privacy First",
                                desc: "Files are auto-deleted within 1 hour. Random UUID filenames. No content analysis. No document logging.",
                            },
                            {
                                icon: Zap,
                                title: "Performance",
                                desc: "Most operations complete in under 2 seconds. Real-time progress tracking for larger files.",
                            },
                            {
                                icon: Lock,
                                title: "Security",
                                desc: "HTTPS encryption, security headers, rate limiting, MIME type validation, and file size checks.",
                            },
                            {
                                icon: Users,
                                title: "Accessibility",
                                desc: "No accounts, no paywalls, no limits. Works on any device with a modern web browser.",
                            },
                        ].map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="glass-card p-6">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 mb-4">
                                    <Icon className="h-5 w-5 text-indigo-400" />
                                </div>
                                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tech */}
                <section className="mb-16">
                    <div className="glass-card p-8 sm:p-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Built With</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                            {[
                                { label: "Backend", tech: "Spring Boot" },
                                { label: "Frontend", tech: "Next.js" },
                                { label: "PDF Engine", tech: "Apache PDFBox" },
                                { label: "Deployment", tech: "Docker" },
                            ].map(({ label, tech }) => (
                                <div key={label} className="text-center">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                                    <p className="text-sm font-semibold text-white">{tech}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
                    <p className="text-gray-400 mb-8">
                        Explore our full suite of 22+ free PDF tools — no signup required.
                    </p>
                    <Link href="/#tools" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5">
                        Explore All Tools
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
