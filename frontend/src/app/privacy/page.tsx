import { Metadata } from "next";
import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description:
        "OpenSuite Privacy Policy. Learn how we handle your files, what data we collect, and how we protect your privacy. GDPR & CCPA compliant.",
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
                    <p className="text-gray-400">Last updated: February 22, 2026</p>
                </div>

                <div className="prose prose-invert prose-gray max-w-none text-gray-400 space-y-8">
                    {/* 1. Overview */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. Overview</h2>
                        <p className="text-sm leading-relaxed">
                            OpenSuite (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the website opensuite.io (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our PDF processing tools. Please read this policy carefully. If you do not agree with the terms of this policy, please do not access the Service.
                        </p>
                        <p className="text-sm leading-relaxed mt-3">
                            <strong className="text-white">The short version:</strong> We don&apos;t require accounts, we don&apos;t store your files permanently, and we don&apos;t read your document content. Your privacy is our priority.
                        </p>
                    </section>

                    {/* 2. What Data We Collect */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
                        <p className="text-sm leading-relaxed mb-3">
                            OpenSuite does not require user accounts, registration, or login. We collect minimal information necessary to operate the Service:
                        </p>

                        <h3 className="text-base font-semibold text-indigo-300 mb-2">a. Uploaded Files</h3>
                        <ul className="list-disc list-inside space-y-2 text-sm mb-4">
                            <li>Files you upload for processing (conversion, editing, compression, etc.)</li>
                            <li>Files are stored temporarily using randomly generated UUID filenames — original filenames are not stored on disk</li>
                            <li>We never read, analyze, or index the content of your documents</li>
                        </ul>

                        <h3 className="text-base font-semibold text-indigo-300 mb-2">b. Automatically Collected Data</h3>
                        <ul className="list-disc list-inside space-y-2 text-sm mb-4">
                            <li><strong className="text-white">IP addresses:</strong> Collected in server logs for security and abuse prevention</li>
                            <li><strong className="text-white">Browser/device information:</strong> User-Agent string, screen resolution, and operating system</li>
                            <li><strong className="text-white">Usage data:</strong> Pages visited, tools used, request timestamps</li>
                            <li><strong className="text-white">Rate limiting data:</strong> Temporary IP-based counters to enforce our rate limit of 30 requests per minute</li>
                        </ul>

                        <h3 className="text-base font-semibold text-indigo-300 mb-2">c. Cookies</h3>
                        <p className="text-sm leading-relaxed">
                            We use essential cookies for site functionality. Our third-party partners (Google AdSense, Google Analytics) may also set cookies. See our{" "}
                            <Link href="/cookies" className="text-indigo-400 hover:text-indigo-300">Cookie Policy</Link>{" "}
                            for full details.
                        </p>
                    </section>

                    {/* 3. How We Use Data */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
                        <p className="text-sm leading-relaxed mb-3">We use the information we collect to:</p>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li><strong className="text-white">Provide the Service:</strong> Process and convert your uploaded files as requested</li>
                            <li><strong className="text-white">Ensure security:</strong> Detect and prevent abuse, malware, and unauthorized access</li>
                            <li><strong className="text-white">Improve performance:</strong> Analyze usage patterns to optimize and improve the Service</li>
                            <li><strong className="text-white">Serve advertisements:</strong> Display ads through Google AdSense to support our free Service</li>
                            <li><strong className="text-white">Enforce rate limits:</strong> Ensure fair access for all users</li>
                            <li><strong className="text-white">Comply with legal obligations:</strong> Respond to legal requests and prevent illegal activity</li>
                        </ul>
                    </section>

                    {/* 4. Data Retention */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. Data Retention</h2>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li><strong className="text-white">Uploaded files:</strong> Automatically and permanently deleted from our servers within <strong className="text-white">1 hour</strong> of upload</li>
                            <li><strong className="text-white">Download links:</strong> Expire after <strong className="text-white">10 minutes</strong> for additional security</li>
                            <li><strong className="text-white">Server logs:</strong> Automatically deleted after <strong className="text-white">30 days</strong></li>
                            <li><strong className="text-white">Rate limiting data:</strong> Not stored permanently; counters reset automatically</li>
                            <li><strong className="text-white">Cookie consent preferences:</strong> Stored locally in your browser until you clear your data</li>
                        </ul>
                    </section>

                    {/* 5. Third-Party Services */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">5. Third-Party Services</h2>
                        <p className="text-sm leading-relaxed mb-3">
                            We use the following third-party services that may collect information about you:
                        </p>

                        <h3 className="text-base font-semibold text-indigo-300 mb-2">a. Google AdSense</h3>
                        <p className="text-sm leading-relaxed mb-3">
                            We use Google AdSense to display advertisements. Google may use cookies and web beacons to serve ads based on your prior visits to our website and other websites. You can opt out of personalized advertising at{" "}
                            <a href="https://www.google.com/settings/ads" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                Google Ad Settings
                            </a>{" "}
                            or{" "}
                            <a href="https://www.aboutads.info/choices/" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                www.aboutads.info
                            </a>.
                        </p>

                        <h3 className="text-base font-semibold text-indigo-300 mb-2">b. Google Analytics</h3>
                        <p className="text-sm leading-relaxed mb-3">
                            We may use Google Analytics to understand how visitors interact with our website. Google Analytics collects information such as how often users visit the site, what pages they visit, and what other sites they used prior to coming to our site. Learn more at{" "}
                            <a href="https://policies.google.com/privacy" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                Google&apos;s Privacy Policy
                            </a>.
                        </p>

                        <h3 className="text-base font-semibold text-indigo-300 mb-2">c. Sentry (Error Tracking)</h3>
                        <p className="text-sm leading-relaxed">
                            We use Sentry for error monitoring and performance tracking. Sentry may collect technical information about errors, including stack traces and browser information. No personal data or file content is sent to Sentry.
                        </p>
                    </section>

                    {/* 6. Data Security */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">6. Data Security</h2>
                        <p className="text-sm leading-relaxed">
                            We implement industry-standard security measures to protect your information:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm mt-3">
                            <li>All file transfers are encrypted using HTTPS/TLS</li>
                            <li>Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) are enforced</li>
                            <li>File size validation and MIME type checking prevent malicious uploads</li>
                            <li>Automatic file cleanup ensures no long-term data persistence</li>
                            <li>Randomized file naming prevents enumeration attacks</li>
                        </ul>
                    </section>

                    {/* 7. Your Rights — GDPR */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights (GDPR — EEA/UK Users)</h2>
                        <p className="text-sm leading-relaxed mb-3">
                            If you are located in the European Economic Area (EEA) or the United Kingdom, you have the following rights under the General Data Protection Regulation (GDPR):
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li><strong className="text-white">Right of Access:</strong> Request a copy of the personal data we hold about you</li>
                            <li><strong className="text-white">Right to Rectification:</strong> Request correction of inaccurate personal data</li>
                            <li><strong className="text-white">Right to Erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
                            <li><strong className="text-white">Right to Restrict Processing:</strong> Request restriction of processing of your personal data</li>
                            <li><strong className="text-white">Right to Data Portability:</strong> Request transfer of your data in a structured, machine-readable format</li>
                            <li><strong className="text-white">Right to Object:</strong> Object to the processing of your personal data, including for direct marketing</li>
                            <li><strong className="text-white">Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
                        </ul>
                        <p className="text-sm leading-relaxed mt-3">
                            To exercise any of these rights, please contact us at{" "}
                            <a href="mailto:privacy@opensuite.io" className="text-indigo-400 hover:text-indigo-300">privacy@opensuite.io</a>. We will respond within 30 days. You also have the right to lodge a complaint with your local data protection authority.
                        </p>
                    </section>

                    {/* 8. Your Rights — CCPA */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">8. Your Rights (CCPA — California Residents)</h2>
                        <p className="text-sm leading-relaxed mb-3">
                            If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA):
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li><strong className="text-white">Right to Know:</strong> Request disclosure of the categories and specific pieces of personal information we have collected about you</li>
                            <li><strong className="text-white">Right to Delete:</strong> Request deletion of personal information we have collected from you</li>
                            <li><strong className="text-white">Right to Opt-Out:</strong> Opt out of the &quot;sale&quot; of your personal information. Note: OpenSuite does not sell personal information</li>
                            <li><strong className="text-white">Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights</li>
                        </ul>
                        <p className="text-sm leading-relaxed mt-3">
                            To exercise your CCPA rights, contact us at{" "}
                            <a href="mailto:privacy@opensuite.io" className="text-indigo-400 hover:text-indigo-300">privacy@opensuite.io</a>.
                        </p>
                    </section>

                    {/* 9. International Data Transfers */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">9. International Data Transfers</h2>
                        <p className="text-sm leading-relaxed">
                            Your information may be transferred to and processed in countries other than the country in which you reside. These countries may have data protection laws that differ from the laws of your country. By using the Service, you consent to the transfer of your information to these countries. We take appropriate safeguards to ensure that your personal data remains protected in accordance with this Privacy Policy.
                        </p>
                    </section>

                    {/* 10. Children's Privacy */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">10. Children&apos;s Privacy (COPPA)</h2>
                        <p className="text-sm leading-relaxed">
                            OpenSuite is not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have inadvertently collected personal information from a child under 13, we will take steps to delete such information as soon as possible. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at{" "}
                            <a href="mailto:privacy@opensuite.io" className="text-indigo-400 hover:text-indigo-300">privacy@opensuite.io</a>.
                        </p>
                    </section>

                    {/* 11. Changes to This Policy */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">11. Changes to This Privacy Policy</h2>
                        <p className="text-sm leading-relaxed">
                            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &quot;Last Updated&quot; date. We encourage you to review this Privacy Policy periodically. Your continued use of the Service after any changes constitutes your acceptance of the updated policy.
                        </p>
                    </section>

                    {/* 12. Contact */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">12. Contact Us</h2>
                        <p className="text-sm leading-relaxed">
                            If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm mt-3">
                            <li><strong className="text-white">Email:</strong>{" "}
                                <a href="mailto:privacy@opensuite.io" className="text-indigo-400 hover:text-indigo-300">privacy@opensuite.io</a>
                            </li>
                            <li><strong className="text-white">Website:</strong>{" "}
                                <a href="https://opensuite.io" className="text-indigo-400 hover:text-indigo-300">opensuite.io</a>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
