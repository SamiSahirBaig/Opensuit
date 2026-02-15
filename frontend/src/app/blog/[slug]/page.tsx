import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { blogPosts, getPostBySlug } from "@/lib/posts";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

interface BlogPostPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = getPostBySlug(slug);

    if (!post) {
        return { title: "Post Not Found" };
    }

    const url = `https://opensuite.io/blog/${post.slug}`;

    return {
        title: post.title,
        description: post.excerpt,
        keywords: [post.category.toLowerCase(), "pdf", "guide", "tutorial", post.slug.replace(/-/g, " ")],
        alternates: { canonical: url },
        openGraph: {
            title: post.title,
            description: post.excerpt,
            url,
            type: "article",
            siteName: "OpenSuite",
            publishedTime: post.date,
            images: [{ url: "/og-image.png", width: 1200, height: 630, alt: post.title }],
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.excerpt,
        },
    };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const post = getPostBySlug(slug);

    if (!post) {
        notFound();
    }

    return (
        <>
            <article className="py-16 sm:py-20">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {/* Back link */}
                    <Link
                        href="/blog"
                        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-400 transition-colors mb-8"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Blog
                    </Link>

                    {/* Header */}
                    <header className="mb-12">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="badge bg-indigo-500/10 text-indigo-400">{post.category}</span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" />
                                {new Date(post.date).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {post.readTime}
                            </span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                            {post.title}
                        </h1>

                        <p className="text-lg text-gray-400">{post.excerpt}</p>
                    </header>

                    {/* Content */}
                    <div className="prose prose-invert prose-gray max-w-none text-gray-400">
                        {post.content.split("\n").map((line, i) => {
                            const trimmed = line.trim();
                            if (!trimmed) return null;

                            // Headers
                            if (trimmed.startsWith("### "))
                                return (
                                    <h3 key={i} className="text-lg font-semibold text-white mt-8 mb-3">
                                        {trimmed.slice(4)}
                                    </h3>
                                );
                            if (trimmed.startsWith("## "))
                                return (
                                    <h2 key={i} className="text-xl font-bold text-white mt-10 mb-4">
                                        {trimmed.slice(3)}
                                    </h2>
                                );

                            // Table header
                            if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
                                if (trimmed.includes("---")) return null;
                                const cells = trimmed
                                    .split("|")
                                    .filter(Boolean)
                                    .map((c) => c.trim());
                                return (
                                    <div key={i} className="grid grid-cols-2 gap-4 text-sm py-2 border-b border-white/5">
                                        {cells.map((cell, j) => (
                                            <span key={j} className={j === 0 ? "text-white font-medium" : "text-gray-500"}>
                                                {cell}
                                            </span>
                                        ))}
                                    </div>
                                );
                            }

                            // List items
                            if (trimmed.startsWith("- **"))
                                return (
                                    <li key={i} className="text-sm ml-4 list-disc mb-1">
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>'),
                                            }}
                                        />
                                    </li>
                                );
                            if (trimmed.startsWith("- "))
                                return (
                                    <li key={i} className="text-sm ml-4 list-disc mb-1">
                                        {trimmed.slice(2)}
                                    </li>
                                );
                            if (/^\d+\.\s/.test(trimmed))
                                return (
                                    <li key={i} className="text-sm ml-4 list-decimal mb-1">
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: trimmed.replace(/^\d+\.\s/, "").replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>'),
                                            }}
                                        />
                                    </li>
                                );

                            // Paragraphs with inline formatting
                            return (
                                <p
                                    key={i}
                                    className="text-sm leading-relaxed mb-4"
                                    dangerouslySetInnerHTML={{
                                        __html: trimmed
                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-400 hover:text-indigo-300 underline">$1</a>'),
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            </article>

            {/* Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        headline: post.title,
                        description: post.excerpt,
                        datePublished: post.date,
                        author: { "@type": "Organization", name: "OpenSuite" },
                        publisher: { "@type": "Organization", name: "OpenSuite" },
                        url: `https://opensuite.io/blog/${post.slug}`,
                    }),
                }}
            />
        </>
    );
}
