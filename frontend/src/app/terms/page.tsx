import { Metadata } from "next";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
    title: "Terms of Service",
    description: "OpenSuite Terms of Service. Read the terms and conditions for using our free PDF processing tools.",
};

export default function TermsPage() {
    return (
        <div className="py-16 sm:py-20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6 mx-auto">
                        <FileText className="h-7 w-7 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                        Terms of{" "}
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            Service
                        </span>
                    </h1>
                    <p className="text-gray-400">Last updated: February 15, 2026</p>
                </div>

                <div className="prose prose-invert prose-gray max-w-none text-gray-400 space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Acceptance of Terms</h2>
                        <p className="text-sm leading-relaxed">
                            By accessing and using OpenSuite (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Description of Service</h2>
                        <p className="text-sm leading-relaxed">
                            OpenSuite provides free online PDF processing tools including document conversion, editing, compression, merging, splitting, and security features. The Service is provided &quot;as is&quot; and is available to all users without registration.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Acceptable Use</h2>
                        <p className="text-sm leading-relaxed mb-3">You agree to use the Service only for lawful purposes. You may not:</p>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>Upload files that contain malware, viruses, or malicious code</li>
                            <li>Attempt to circumvent rate limits or abuse the Service</li>
                            <li>Use the Service to process documents that violate any applicable laws</li>
                            <li>Interfere with or disrupt the Service or its infrastructure</li>
                            <li>Use automated tools to scrape or overload the Service</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">File Uploads</h2>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>Maximum file size is 50MB per file</li>
                            <li>All uploaded files are automatically deleted within 1 hour</li>
                            <li>Download links expire after 10 minutes</li>
                            <li>You are responsible for maintaining your own copies of any files you upload</li>
                            <li>We do not guarantee the availability of processed files after the expiration period</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Intellectual Property</h2>
                        <p className="text-sm leading-relaxed">
                            You retain all rights to your uploaded documents. OpenSuite does not claim any ownership or license over the content of your files. You represent that you have the right to upload and process any files you submit to the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Disclaimer of Warranties</h2>
                        <p className="text-sm leading-relaxed">
                            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that conversion results will be perfectly accurate. While we strive for high-quality output, complex documents may require manual adjustments after processing.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Limitation of Liability</h2>
                        <p className="text-sm leading-relaxed">
                            To the maximum extent permitted by law, OpenSuite shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service. This includes but is not limited to data loss, conversion errors, or service interruptions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Rate Limiting</h2>
                        <p className="text-sm leading-relaxed">
                            To ensure fair access for all users, the Service enforces a rate limit of 30 requests per minute per IP address. Exceeding this limit may result in temporary restriction of access.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Changes to Terms</h2>
                        <p className="text-sm leading-relaxed">
                            We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Continued use of the Service after changes constitutes acceptance of the new Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
                        <p className="text-sm leading-relaxed">
                            If you have questions about these Terms of Service, please contact us at legal@opensuite.io.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
