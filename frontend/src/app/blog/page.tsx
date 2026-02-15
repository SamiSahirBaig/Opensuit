import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";

export const metadata: Metadata = {
    title: "Blog – PDF Tips, Tutorials & Guides",
    description: "Learn how to make the most of PDF tools. Tips, tutorials, and guides for document management, conversion, and security.",
};

const blogPosts = [
    {
        slug: "how-to-merge-pdf-files",
        title: "How to Merge PDF Files: Complete Guide",
        excerpt: "Learn the easiest ways to combine multiple PDF files into one document. Step-by-step guide with tips for maintaining formatting.",
        date: "2026-02-14",
        category: "Tutorial",
    },
    {
        slug: "pdf-to-word-best-practices",
        title: "PDF to Word Conversion: Best Practices",
        excerpt: "Convert PDF documents to editable Word files without losing formatting. Expert tips for handling complex layouts.",
        date: "2026-02-10",
        category: "Tips",
    },
    {
        slug: "secure-your-pdf-documents",
        title: "How to Secure Your PDF Documents",
        excerpt: "Protect sensitive PDF documents with passwords, restrictions, and metadata cleaning. A complete guide to PDF security.",
        date: "2026-02-08",
        category: "Security",
    },
    {
        slug: "compress-pdf-without-quality-loss",
        title: "Compress PDF Without Quality Loss",
        excerpt: "Reduce PDF file size while maintaining document quality. Learn about different compression levels and when to use them.",
        date: "2026-02-05",
        category: "Tutorial",
    },
];

export default function BlogPage() {
    return (
        <div className="py-16 sm:py-20">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                        OpenSuite{" "}
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            Blog
                        </span>
                    </h1>
                    <p className="text-gray-400 max-w-xl mx-auto">
                        Tips, tutorials, and guides for getting the most out of your PDF documents.
                    </p>
                </div>

                <div className="grid gap-6">
                    {blogPosts.map((post) => (
                        <article key={post.slug} className="glass-card p-6 group cursor-pointer">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="badge bg-indigo-500/10 text-indigo-400">{post.category}</span>
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                        </span>
                                    </div>
                                    <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                                        {post.title}
                                    </h2>
                                    <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
                                </div>
                                <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-sm text-gray-600">More articles coming soon. Stay tuned!</p>
                </div>
            </div>
        </div>
    );
}
