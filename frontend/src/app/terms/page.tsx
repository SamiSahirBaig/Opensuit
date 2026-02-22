import { Metadata } from "next";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
    title: "Terms of Service",
    description:
        "OpenSuite Terms of Service. Read the terms and conditions for using our free PDF processing tools.",
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
                    <p className="text-gray-400">Last updated: February 22, 2026</p>
                </div>

                <div className="prose prose-invert prose-gray max-w-none text-gray-400 space-y-8">
                    {/* 1. Acceptance of Terms */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
                        <p className="text-sm leading-relaxed">
                            By accessing and using OpenSuite (&quot;the Service&quot;), available at opensuite.io, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service. These Terms constitute a legally binding agreement between you and OpenSuite.
                        </p>
                    </section>

                    {/* 2. Description of Service */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
                        <p className="text-sm leading-relaxed">
                            OpenSuite provides free online PDF processing tools including document conversion, editing, compression, merging, splitting, and security features. The Service is provided &quot;as is&quot; and is available to all users without registration. We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time without prior notice.
                        </p>
                    </section>

                    {/* 3. User Responsibilities / Acceptable Use */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. User Responsibilities &amp; Acceptable Use</h2>
                        <p className="text-sm leading-relaxed mb-3">You agree to use the Service only for lawful purposes. You may not:</p>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>Upload files containing malware, viruses, or malicious code</li>
                            <li>Upload files containing illegal content, including but not limited to child exploitation material, stolen data, or content that violates any applicable laws</li>
                            <li>Attempt to circumvent rate limits or abuse the Service</li>
                            <li>Use the Service to process documents that infringe upon intellectual property rights of others</li>
                            <li>Interfere with or disrupt the Service or its infrastructure</li>
                            <li>Use automated tools, bots, or scrapers to overload the Service</li>
                            <li>Attempt to gain unauthorized access to our servers, systems, or other users&apos; data</li>
                        </ul>
                    </section>

                    {/* 4. File Uploads */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. File Uploads</h2>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>Maximum file size is <strong className="text-white">50MB</strong> per file</li>
                            <li>All uploaded files are automatically deleted within <strong className="text-white">1 hour</strong></li>
                            <li>Download links expire after <strong className="text-white">10 minutes</strong></li>
                            <li>You are responsible for maintaining your own copies of any files you upload</li>
                            <li>We do not guarantee the availability of processed files after the expiration period</li>
                            <li>You represent and warrant that you have the right to upload and process any files you submit</li>
                        </ul>
                    </section>

                    {/* 5. Intellectual Property */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">5. Intellectual Property</h2>
                        <p className="text-sm leading-relaxed mb-3">
                            <strong className="text-white">Your Content:</strong> You retain all rights to your uploaded documents. OpenSuite does not claim any ownership or license over the content of your files.
                        </p>
                        <p className="text-sm leading-relaxed">
                            <strong className="text-white">Our Service:</strong> The OpenSuite brand, logo, website design, and underlying software are the intellectual property of OpenSuite. You may not copy, modify, distribute, or create derivative works based on our Service without prior written consent.
                        </p>
                    </section>

                    {/* 6. Disclaimer of Warranties */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">6. Disclaimer of Warranties</h2>
                        <p className="text-sm leading-relaxed">
                            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR THAT CONVERSION RESULTS WILL BE PERFECTLY ACCURATE. While we strive for high-quality output, complex documents may require manual adjustments after processing.
                        </p>
                    </section>

                    {/* 7. Limitation of Liability */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
                        <p className="text-sm leading-relaxed">
                            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OPENSUITE AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR USE OF OR INABILITY TO USE THE SERVICE; (B) ANY UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR FILES; (C) CONVERSION ERRORS OR SERVICE INTERRUPTIONS; OR (D) ANY OTHER MATTER RELATING TO THE SERVICE.
                        </p>
                    </section>

                    {/* 8. Indemnification */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">8. Indemnification</h2>
                        <p className="text-sm leading-relaxed">
                            You agree to indemnify, defend, and hold harmless OpenSuite and its officers, directors, employees, agents, and affiliates from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses (including attorneys&apos; fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any rights of a third party, including intellectual property rights; or (d) any content you upload to the Service.
                        </p>
                    </section>

                    {/* 9. Termination */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">9. Termination &amp; Suspension</h2>
                        <p className="text-sm leading-relaxed">
                            We reserve the right to terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including but not limited to a breach of these Terms. Upon termination, your right to use the Service will cease immediately. All provisions of these Terms which by their nature should survive termination shall survive, including but not limited to ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
                        </p>
                    </section>

                    {/* 10. Rate Limiting */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">10. Rate Limiting</h2>
                        <p className="text-sm leading-relaxed">
                            To ensure fair access for all users, the Service enforces a rate limit of 30 requests per minute per IP address. Exceeding this limit may result in temporary restriction of access. Persistent or deliberate abuse may result in permanent blocking at our discretion.
                        </p>
                    </section>

                    {/* 11. Governing Law */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">11. Governing Law</h2>
                        <p className="text-sm leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which OpenSuite operates, without regard to its conflict of law provisions. Your use of the Service may also be subject to other local, state, national, or international laws.
                        </p>
                    </section>

                    {/* 12. Dispute Resolution */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">12. Dispute Resolution</h2>
                        <p className="text-sm leading-relaxed">
                            Any dispute arising out of or relating to these Terms or the Service shall first be attempted to be resolved through informal negotiation. If informal negotiation is unsuccessful within 30 days, either party may pursue resolution through binding arbitration or in the courts of competent jurisdiction. You agree that any dispute resolution proceeding will be conducted on an individual basis and not in a class, consolidated, or representative action.
                        </p>
                    </section>

                    {/* 13. Severability */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">13. Severability</h2>
                        <p className="text-sm leading-relaxed">
                            If any provision of these Terms is held to be unenforceable or invalid by a court of competent jurisdiction, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.
                        </p>
                    </section>

                    {/* 14. Changes to Terms */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">14. Changes to Terms</h2>
                        <p className="text-sm leading-relaxed">
                            We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting with an updated &quot;Last Updated&quot; date. Continued use of the Service after changes constitutes acceptance of the new Terms. We encourage you to review these Terms periodically.
                        </p>
                    </section>

                    {/* 15. Contact */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">15. Contact Us</h2>
                        <p className="text-sm leading-relaxed">
                            If you have questions about these Terms of Service, please contact us:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm mt-3">
                            <li><strong className="text-white">Email:</strong>{" "}
                                <a href="mailto:legal@opensuite.io" className="text-indigo-400 hover:text-indigo-300">legal@opensuite.io</a>
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
