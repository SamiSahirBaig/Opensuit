import { notFound } from "next/navigation";
import { Metadata } from "next";
import { tools, getToolBySlug } from "@/lib/tools";
import { ToolPageClient } from "@/components/ToolPageClient";

interface ToolPageProps {
    params: Promise<{ slug: string }>;
}

// Generate static pages for all tools at build time
export async function generateStaticParams() {
    return tools.map((tool) => ({ slug: tool.slug }));
}

// Dynamic metadata for SEO
export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
    const { slug } = await params;
    const tool = getToolBySlug(slug);

    if (!tool) {
        return { title: "Tool Not Found" };
    }

    const title = `${tool.title} Online Free – ${tool.description}`;
    const description = `${tool.longDescription.substring(0, 155)}...`;
    const url = `https://opensuite.io/${tool.slug}`;

    return {
        title,
        description,
        keywords: [tool.title.toLowerCase(), "pdf tools", "free pdf", "online converter", tool.slug.replace(/-/g, " ")],
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type: "website",
            siteName: "OpenSuite",
            images: [{ url: "/og-image.png", width: 1200, height: 630, alt: tool.title }],
        },
        twitter: {
            card: "summary_large_image",
            title: `${tool.title} – Free Online Tool`,
            description,
        },
    };
}

export default async function ToolPage({ params }: ToolPageProps) {
    const { slug } = await params;
    const tool = getToolBySlug(slug);

    if (!tool) {
        notFound();
    }

    return (
        <>
            <ToolPageClient slug={slug} />

            {/* Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        name: `OpenSuite ${tool.title}`,
                        applicationCategory: "UtilitiesApplication",
                        operatingSystem: "Web",
                        url: `https://opensuite.io/${tool.slug}`,
                        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                        description: tool.longDescription,
                    }),
                }}
            />

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "FAQPage",
                        mainEntity: [
                            {
                                "@type": "Question",
                                name: `Is the ${tool.title} tool free?`,
                                acceptedAnswer: { "@type": "Answer", text: `Yes, ${tool.title} is completely free. No signup, no limits, no watermarks.` },
                            },
                            {
                                "@type": "Question",
                                name: "Is my file secure?",
                                acceptedAnswer: { "@type": "Answer", text: "All files are encrypted during transfer and automatically deleted after 1 hour." },
                            },
                        ],
                    }),
                }}
            />
        </>
    );
}
