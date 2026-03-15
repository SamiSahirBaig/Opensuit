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

    const categoryLabel =
        tool.category === "convert"
            ? "Conversion"
            : tool.category === "edit"
                ? "Editing"
                : tool.category === "security"
                    ? "Security"
                    : "Advanced";

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

            {/* BreadcrumbList */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        itemListElement: [
                            {
                                "@type": "ListItem",
                                position: 1,
                                name: "Home",
                                item: "https://opensuite.io",
                            },
                            {
                                "@type": "ListItem",
                                position: 2,
                                name: `${categoryLabel} Tools`,
                                item: `https://opensuite.io/#tools`,
                            },
                            {
                                "@type": "ListItem",
                                position: 3,
                                name: tool.title,
                                item: `https://opensuite.io/${tool.slug}`,
                            },
                        ],
                    }),
                }}
            />

            {/* HowTo Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "HowTo",
                        name: `How to Use ${tool.title} Online`,
                        description: `${tool.description} Follow these simple steps.`,
                        step: [
                            {
                                "@type": "HowToStep",
                                name: "Upload Your File",
                                text: `Go to the ${tool.title} page and click 'Choose File' or drag and drop your file.`,
                                position: 1,
                            },
                            {
                                "@type": "HowToStep",
                                name: "Process",
                                text: `Click the process button to start ${tool.title.toLowerCase()}. Processing typically takes under 2 seconds.`,
                                position: 2,
                            },
                            {
                                "@type": "HowToStep",
                                name: "Download Result",
                                text: "Once processing is complete, click the download button to save your file.",
                                position: 3,
                            },
                        ],
                    }),
                }}
            />
        </>
    );
}
