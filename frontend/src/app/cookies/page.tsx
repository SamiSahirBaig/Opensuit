import { Metadata } from "next";
import Link from "next/link";
import { Cookie } from "lucide-react";

export const metadata: Metadata = {
    title: "Cookie Policy",
    description:
        "OpenSuite Cookie Policy. Learn about the cookies we use, why we use them, and how to manage your cookie preferences.",
};

export default function CookiePolicyPage() {
    return (
        <div className="py-16 sm:py-20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6 mx-auto">
                        <Cookie className="h-7 w-7 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                        Cookie{" "}
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            Policy
                        </span>
                    </h1>
                    <p className="text-gray-400">Last updated: February 22, 2026</p>
                </div>

                <div className="prose prose-invert prose-gray max-w-none text-gray-400 space-y-8">
                    {/* 1. What Are Cookies */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. What Are Cookies</h2>
                        <p className="text-sm leading-relaxed">
                            Cookies are small text files stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work efficiently, provide a better user experience, and give website owners usage information. Cookies can be &quot;session&quot; cookies (deleted when you close your browser) or &quot;persistent&quot; cookies (remain until they expire or you delete them).
                        </p>
                    </section>

                    {/* 2. How We Use Cookies */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Cookies</h2>
                        <p className="text-sm leading-relaxed">
                            OpenSuite uses cookies and similar technologies to support the operation of our Service, serve advertisements, and analyze usage. Below we describe the specific categories of cookies used on our site.
                        </p>
                    </section>

                    {/* 3. Essential Cookies */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. Essential Cookies</h2>
                        <p className="text-sm leading-relaxed mb-3">
                            These cookies are strictly necessary for the website to function. They cannot be switched off.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                                <thead>
                                    <tr className="bg-white/5">
                                        <th className="text-left p-3 text-white font-semibold">Cookie</th>
                                        <th className="text-left p-3 text-white font-semibold">Purpose</th>
                                        <th className="text-left p-3 text-white font-semibold">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <tr>
                                        <td className="p-3 font-mono text-xs text-indigo-300">cookie-consent</td>
                                        <td className="p-3">Stores your cookie consent preferences</td>
                                        <td className="p-3">1 year</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono text-xs text-indigo-300">__cfruid</td>
                                        <td className="p-3">Cloudflare rate-limiting and bot protection</td>
                                        <td className="p-3">Session</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 4. Analytics Cookies */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. Analytics Cookies</h2>
                        <p className="text-sm leading-relaxed mb-3">
                            These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                                <thead>
                                    <tr className="bg-white/5">
                                        <th className="text-left p-3 text-white font-semibold">Cookie</th>
                                        <th className="text-left p-3 text-white font-semibold">Provider</th>
                                        <th className="text-left p-3 text-white font-semibold">Purpose</th>
                                        <th className="text-left p-3 text-white font-semibold">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <tr>
                                        <td className="p-3 font-mono text-xs text-indigo-300">_ga</td>
                                        <td className="p-3">Google Analytics</td>
                                        <td className="p-3">Distinguishes unique users</td>
                                        <td className="p-3">2 years</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono text-xs text-indigo-300">_ga_*</td>
                                        <td className="p-3">Google Analytics</td>
                                        <td className="p-3">Persists session state</td>
                                        <td className="p-3">2 years</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono text-xs text-indigo-300">_gid</td>
                                        <td className="p-3">Google Analytics</td>
                                        <td className="p-3">Distinguishes unique users</td>
                                        <td className="p-3">24 hours</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm leading-relaxed mt-3">
                            Learn more:{" "}
                            <a href="https://policies.google.com/privacy" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                Google Analytics Privacy Policy
                            </a>
                        </p>
                    </section>

                    {/* 5. Advertising Cookies */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">5. Advertising Cookies</h2>
                        <p className="text-sm leading-relaxed mb-3">
                            These cookies are used by our advertising partner, Google AdSense, to deliver relevant advertisements and track ad performance.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                                <thead>
                                    <tr className="bg-white/5">
                                        <th className="text-left p-3 text-white font-semibold">Cookie</th>
                                        <th className="text-left p-3 text-white font-semibold">Provider</th>
                                        <th className="text-left p-3 text-white font-semibold">Purpose</th>
                                        <th className="text-left p-3 text-white font-semibold">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <tr>
                                        <td className="p-3 font-mono text-xs text-indigo-300">__gads</td>
                                        <td className="p-3">Google AdSense</td>
                                        <td className="p-3">Measures ad interactions</td>
                                        <td className="p-3">13 months</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono text-xs text-indigo-300">__gpi</td>
                                        <td className="p-3">Google AdSense</td>
                                        <td className="p-3">Collects ad-related data</td>
                                        <td className="p-3">13 months</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono text-xs text-indigo-300">IDE</td>
                                        <td className="p-3">Google DoubleClick</td>
                                        <td className="p-3">Tracks conversions and serves targeted ads</td>
                                        <td className="p-3">1 year</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono text-xs text-indigo-300">NID</td>
                                        <td className="p-3">Google</td>
                                        <td className="p-3">Stores preferences and ad personalization</td>
                                        <td className="p-3">6 months</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm leading-relaxed mt-3">
                            You can opt out of personalized ads at{" "}
                            <a href="https://www.google.com/settings/ads" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                Google Ad Settings
                            </a>{" "}
                            or{" "}
                            <a href="https://www.aboutads.info/choices/" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                Digital Advertising Alliance
                            </a>.
                        </p>
                    </section>

                    {/* 6. Managing Cookies */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">6. How to Manage Cookies</h2>
                        <p className="text-sm leading-relaxed mb-3">
                            You can control and manage cookies in several ways. Please note that disabling cookies may affect the functionality of the Service.
                        </p>

                        <h3 className="text-base font-semibold text-indigo-300 mb-2">Browser Settings</h3>
                        <p className="text-sm leading-relaxed mb-3">
                            Most browsers allow you to view, manage, delete, and block cookies for a website. Here are instructions for the most common browsers:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>
                                <a href="https://support.google.com/chrome/answer/95647" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                    Google Chrome
                                </a>
                            </li>
                            <li>
                                <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                    Mozilla Firefox
                                </a>
                            </li>
                            <li>
                                <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                    Safari
                                </a>
                            </li>
                            <li>
                                <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                    Microsoft Edge
                                </a>
                            </li>
                        </ul>

                        <h3 className="text-base font-semibold text-indigo-300 mb-2 mt-4">Opt-Out Tools</h3>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>
                                <a href="https://tools.google.com/dlpage/gaoptout" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                    Google Analytics Opt-Out Browser Add-on
                                </a>
                            </li>
                            <li>
                                <a href="https://www.aboutads.info/choices/" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                    Digital Advertising Alliance opt-out
                                </a>
                            </li>
                            <li>
                                <a href="https://www.youronlinechoices.eu/" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">
                                    Your Online Choices (EU)
                                </a>
                            </li>
                        </ul>
                    </section>

                    {/* 7. Changes to This Policy */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">7. Changes to This Cookie Policy</h2>
                        <p className="text-sm leading-relaxed">
                            We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. Any changes will be posted on this page with an updated &quot;Last Updated&quot; date. We encourage you to check this page periodically.
                        </p>
                    </section>

                    {/* 8. Contact */}
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">8. Contact Us</h2>
                        <p className="text-sm leading-relaxed">
                            If you have questions about our use of cookies, please contact us:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm mt-3">
                            <li><strong className="text-white">Email:</strong>{" "}
                                <a href="mailto:privacy@opensuite.io" className="text-indigo-400 hover:text-indigo-300">privacy@opensuite.io</a>
                            </li>
                            <li><strong className="text-white">Website:</strong>{" "}
                                <a href="https://opensuite.io" className="text-indigo-400 hover:text-indigo-300">opensuite.io</a>
                            </li>
                        </ul>
                        <p className="text-sm leading-relaxed mt-4">
                            For more details about how we handle your data, please see our{" "}
                            <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
