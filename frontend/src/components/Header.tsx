"use client";

import Link from "next/link";
import { FileText, Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold tracking-tight">
                            Open<span className="text-indigo-400">Suite</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <Link href="/#tools" className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                            Tools
                        </Link>
                        <Link href="/merge-pdf" className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                            Merge PDF
                        </Link>
                        <Link href="/compress-pdf" className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                            Compress
                        </Link>
                        <Link href="/pdf-to-word" className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                            PDF to Word
                        </Link>
                        <Link href="/blog" className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                            Blog
                        </Link>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-gray-400 hover:text-white"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                {/* Mobile Nav */}
                {menuOpen && (
                    <nav className="md:hidden pb-4 border-t border-white/5 mt-2 pt-4 flex flex-col gap-1">
                        <Link href="/#tools" className="px-4 py-2.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                            All Tools
                        </Link>
                        <Link href="/merge-pdf" className="px-4 py-2.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                            Merge PDF
                        </Link>
                        <Link href="/compress-pdf" className="px-4 py-2.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                            Compress PDF
                        </Link>
                        <Link href="/pdf-to-word" className="px-4 py-2.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                            PDF to Word
                        </Link>
                        <Link href="/blog" className="px-4 py-2.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                            Blog
                        </Link>
                    </nav>
                )}
            </div>
        </header>
    );
}
