import { Metadata } from "next";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "OpenSuite Privacy Policy. Learn how we handle your files, what data we collect, and how we protect your privacy.",
};

export default function PrivacyPage() {
    return (
        <div className="py-16 sm:py-20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6 mx-auto">
                        <Shield className="h-7 w-7 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                        Privacy{" "}
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            Policy
                        </span>
                    </h1>
                    <p className="text-gray-400">Last updated: February 15, 2026</p>
                </div>

                <div className="prose prose-invert prose-gray max-w-none text-gray-400 space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
                        <p className="text-sm leading-relaxed">
                            OpenSuite (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our free PDF processing tools at opensuite.io.
                        </p>
                        <p className="text-sm leading-relaxed">
                            <strong className="text-white">The short version:</strong> We don&apos;t require accounts, we don&apos;t store your files permanently, and we don&apos;t read your document content. Your privacy is our priority.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">File Handling</h2>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li><strong className="text-white">No permanent storage:</strong> All uploaded files are automatically deleted from our servers within 1 hour of upload.</li>
                            <li><strong className="text-white">Random filenames:</strong> Files are stored using randomly generated UUID filenames. Original filenames are not stored on disk.</li>
                            <li><strong className="text-white">No content analysis:</strong> We never read, analyze, or index the content of your documents.</li>
                            <li><strong className="text-white">Encrypted transfer:</strong> All file uploads and downloads are conducted over encrypted HTTPS connections.</li>
                            <li><strong className="text-white">Expiring download links:</strong> Download tokens expire after 10 minutes for additional security.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Information We Collect</h2>
                        <p className="text-sm leading-relaxed">
                            OpenSuite does not require user accounts, registration, or login. We collect minimal technical information necessary to operate the service:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li><strong className="text-white">Server logs:</strong> Standard web server logs (IP address, request URL, timestamp) for security and abuse prevention. These are automatically deleted after 30 days.</li>
                            <li><strong className="text-white">Rate limiting data:</strong> Temporary IP-based counters to enforce our rate limit of 30 requests per minute. This data is not stored permanently.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Advertising</h2>
                        <p className="text-sm leading-relaxed">
                            OpenSuite is supported by advertising through Google AdSense. Google may use cookies and similar technologies to serve ads based on your browsing activity. You can learn more about Google&apos;s advertising practices and opt out at{" "}
                            <a href="https://policies.google.com/technologies/ads" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                Google&apos;s Advertising Policies
                            </a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Cookies</h2>
                        <p className="text-sm leading-relaxed">
                            OpenSuite itself does not use cookies. However, our advertising partner (Google AdSense) may set cookies for ad personalization. You can manage cookie preferences through your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Data Security</h2>
                        <p className="text-sm leading-relaxed">
                            We implement industry-standard security measures including HTTPS encryption, security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection), file size validation, MIME type checking, and automatic file cleanup.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Children&apos;s Privacy</h2>
                        <p className="text-sm leading-relaxed">
                            OpenSuite is not directed at children under 13. We do not knowingly collect personal information from children.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
                        <p className="text-sm leading-relaxed">
                            If you have questions about this Privacy Policy, please contact us at privacy@opensuite.io.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
