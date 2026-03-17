import Link from "next/link";
import { FileText } from "lucide-react";
import { tools } from "@/lib/tools";

export function Footer() {
    const convertTools = tools.filter((t) => t.category === "convert").slice(0, 6);
    const editTools = tools.filter((t) => t.category === "edit").slice(0, 6);
    const securityTools = tools.filter((t) => t.category === "security");

    return (
        <footer className="border-t border-[#E5E5E5] bg-[#FAFAFA]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2.5 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8CB46]">
                                <FileText className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-base font-bold text-[#1A1A1A]">
                                Open<span className="text-[#E5B62E]">Suite</span>
                            </span>
                        </Link>
                        <p className="text-sm text-[#666666] leading-relaxed">
                            Professional PDF processing tools, completely free. No signup, no watermarks, no limits.
                        </p>
                    </div>

                    {/* Convert */}
                    <div>
                        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4 uppercase tracking-wider">Convert</h3>
                        <ul className="space-y-2.5">
                            {convertTools.map((tool) => (
                                <li key={tool.slug}>
                                    <Link href={`/${tool.slug}`} className="text-sm text-[#666666] hover:text-[#E5B62E] transition-colors">
                                        {tool.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Edit */}
                    <div>
                        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4 uppercase tracking-wider">Edit</h3>
                        <ul className="space-y-2.5">
                            {editTools.map((tool) => (
                                <li key={tool.slug}>
                                    <Link href={`/${tool.slug}`} className="text-sm text-[#666666] hover:text-[#E5B62E] transition-colors">
                                        {tool.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Security */}
                    <div>
                        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4 uppercase tracking-wider">Security</h3>
                        <ul className="space-y-2.5">
                            {securityTools.map((tool) => (
                                <li key={tool.slug}>
                                    <Link href={`/${tool.slug}`} className="text-sm text-[#666666] hover:text-[#E5B62E] transition-colors">
                                        {tool.title}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <Link href="/blog" className="text-sm text-[#666666] hover:text-[#E5B62E] transition-colors">
                                    Blog
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4 uppercase tracking-wider">Company</h3>
                        <ul className="space-y-2.5">
                            <li>
                                <Link href="/about" className="text-sm text-[#666666] hover:text-[#E5B62E] transition-colors">
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="text-sm text-[#666666] hover:text-[#E5B62E] transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-sm text-[#666666] hover:text-[#E5B62E] transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/cookies" className="text-sm text-[#666666] hover:text-[#E5B62E] transition-colors">
                                    Cookie Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="mt-12 pt-8 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[#999999]">
                        © {new Date().getFullYear()} OpenSuite. All rights reserved. Your files are automatically deleted after 1 hour.
                    </p>
                    <div className="flex items-center gap-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#999999]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                            All systems operational
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
