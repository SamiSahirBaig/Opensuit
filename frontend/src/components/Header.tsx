"use client";

import Link from "next/link";
import { FileText, Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F8CB46] shadow-md shadow-[#F8CB46]/30 group-hover:shadow-[#F8CB46]/50 transition-shadow">
                            <FileText className="h-5 w-5 text-[#1A1A1A]" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-[#1A1A1A]">
                            Open<span className="text-[#666666]">Suit</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <Link href="/#tools" className="px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#F8CB46] rounded-lg transition-colors">
                            All Tools
                        </Link>
                        <Link href="/merge-pdf" className="px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#F8CB46] rounded-lg transition-colors">
                            Merge PDF
                        </Link>
                        <Link href="/compress-pdf" className="px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#F8CB46] rounded-lg transition-colors">
                            Compress
                        </Link>
                        <Link href="/pdf-to-word" className="px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#F8CB46] rounded-lg transition-colors">
                            PDF to Word
                        </Link>
                        <Link href="/blog" className="px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:text-[#F8CB46] rounded-lg transition-colors">
                            Blog
                        </Link>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-[#1A1A1A] hover:text-[#F8CB46]"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile Nav */}
                {menuOpen && (
                    <nav className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-4 flex flex-col gap-1">
                        <Link href="/#tools" className="px-4 py-3 text-sm font-medium text-[#1A1A1A] hover:bg-gray-50 rounded-lg" onClick={() => setMenuOpen(false)}>
                            All Tools
                        </Link>
                        <Link href="/merge-pdf" className="px-4 py-3 text-sm font-medium text-[#1A1A1A] hover:bg-gray-50 rounded-lg" onClick={() => setMenuOpen(false)}>
                            Merge PDF
                        </Link>
                        <Link href="/compress-pdf" className="px-4 py-3 text-sm font-medium text-[#1A1A1A] hover:bg-gray-50 rounded-lg" onClick={() => setMenuOpen(false)}>
                            Compress PDF
                        </Link>
                        <Link href="/pdf-to-word" className="px-4 py-3 text-sm font-medium text-[#1A1A1A] hover:bg-gray-50 rounded-lg" onClick={() => setMenuOpen(false)}>
                            PDF to Word
                        </Link>
                        <Link href="/blog" className="px-4 py-3 text-sm font-medium text-[#1A1A1A] hover:bg-gray-50 rounded-lg" onClick={() => setMenuOpen(false)}>
                            Blog
                        </Link>
                    </nav>
                )}
            </div>
        </header>
    );
}
