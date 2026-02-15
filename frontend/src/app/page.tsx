import Link from "next/link";
import { tools, toolCategories } from "@/lib/tools";
import { Shield, Zap, Lock, Clock, ArrowRight, Sparkles, Globe, FileCheck } from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6 animate-fade-in-up">
              <Sparkles className="h-3.5 w-3.5" />
              100% FREE • NO SIGNUP REQUIRED
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in-up animate-delay-100">
              The Ultimate{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                PDF Toolkit
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-in-up animate-delay-200">
              Convert, edit, compress, merge, split, and secure your PDF documents with professional-grade tools.
              Completely free, no sign-up, files auto-deleted for privacy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
              <Link href="#tools" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5">
                Explore All Tools
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/merge-pdf" className="btn-secondary inline-flex items-center gap-2 text-base px-8 py-3.5">
                Merge PDFs Now
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in-up animate-delay-300">
              {[
                { value: "22+", label: "Free Tools" },
                { value: "<2s", label: "Processing" },
                { value: "50MB", label: "Max File Size" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                    {value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Trust Indicators */}
      <section className="border-y border-white/5 bg-[#0c0c14]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Shield, label: "Privacy First", desc: "Files auto-deleted" },
              { icon: Zap, label: "Lightning Fast", desc: "Under 2s processing" },
              { icon: Lock, label: "Secure", desc: "Encrypted transfer" },
              { icon: Clock, label: "No Signup", desc: "Instant access" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/10">
                  <Icon className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section id="tools" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              All{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Tools
              </span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Everything you need to work with PDF documents — conversion, editing, security, and more.
            </p>
          </div>

          {toolCategories.map((category) => {
            const categoryTools = tools.filter((t) => t.category === category.id);
            if (categoryTools.length === 0) return null;

            return (
              <div key={category.id} className="mb-16 last:mb-0">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-1">{category.label} Tools</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryTools.map((tool) => {
                    const IconComponent = tool.icon;
                    return (
                      <Link key={tool.slug} href={`/${tool.slug}`} className="group">
                        <div className="glass-card tool-card p-5 h-full">
                          <div className="flex items-start gap-4">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all group-hover:scale-110 group-hover:shadow-lg"
                              style={{
                                background: `${tool.color}15`,
                                border: `1px solid ${tool.color}25`,
                              }}
                            >
                              <IconComponent className="h-5 w-5" style={{ color: tool.color }} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                                {tool.title}
                              </h4>
                              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                                {tool.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-white/5 py-20 bg-[#0c0c14]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            How It{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Works
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: FileCheck,
                title: "Upload Your File",
                desc: "Drag and drop or click to select your file. Supports PDF, Word, Excel, PowerPoint, images, and more.",
              },
              {
                step: "02",
                icon: Zap,
                title: "Process Instantly",
                desc: "Our engine processes your file in under 2 seconds. Watch real-time progress as it works.",
              },
              {
                step: "03",
                icon: ArrowRight,
                title: "Download Result",
                desc: "Download your processed file immediately. It's automatically deleted from our servers after 1 hour.",
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/15 mb-4 mx-auto">
                  <Icon className="h-6 w-6 text-indigo-400" />
                </div>
                <span className="absolute top-0 right-1/4 text-4xl font-extrabold text-white/[0.03]">{step}</span>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Why Choose OpenSuite for PDF Processing?
          </h2>

          <div className="prose prose-invert prose-gray max-w-none text-gray-400 space-y-6">
            <p>
              OpenSuite is the most comprehensive free online PDF toolkit available today. Whether you need to convert
              PDF documents to Word, Excel, PowerPoint, or image formats, or you need to merge, split, compress, rotate,
              or secure your PDFs — OpenSuite handles it all with professional-grade accuracy and speed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose my-8">
              {[
                {
                  icon: Globe,
                  title: "Complete Conversion Suite",
                  text: "Bidirectional conversion between PDF and Word, Excel, PowerPoint, JPG, PNG, HTML, and plain text with pixel-perfect formatting.",
                },
                {
                  icon: Sparkles,
                  title: "Professional Editing Tools",
                  text: "Merge, split, rotate, reorder, watermark, add page numbers, and compress — all in your browser.",
                },
                {
                  icon: Shield,
                  title: "Enterprise-Grade Security",
                  text: "HTTPS encryption, UUID filenames, auto-deletion, and zero document logging or content analysis.",
                },
                {
                  icon: Zap,
                  title: "Built for Performance",
                  text: "Most operations complete in under 2 seconds with real-time progress tracking for larger files.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="glass-card p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 mb-3">
                    <Icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-semibold text-white">No Hidden Costs, No Limitations</h3>
            <p>
              Unlike other PDF tools that lock features behind paywalls, OpenSuite provides every tool completely free.
              There are no daily limits, no file size restrictions beyond our generous 50MB maximum, no watermarks on
              output files, and no quality reduction. Professional PDF processing should be accessible to everyone —
              students, professionals, businesses, and individuals alike.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-white/5 py-20 bg-[#0c0c14]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>

          <div className="space-y-3">
            {[
              {
                q: "Is OpenSuite really completely free?",
                a: "Yes! All tools are 100% free with no hidden costs, no signup required, and no limits on usage. The platform is supported by non-intrusive advertising.",
              },
              {
                q: "Are my files secure?",
                a: "Absolutely. All file transfers are encrypted, files are stored with random UUID names, and everything is automatically deleted after 1 hour. We never access, read, or store your document content.",
              },
              {
                q: "What file formats are supported?",
                a: "OpenSuite supports PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), JPG, PNG, HTML, TXT, and EPUB formats. We're constantly adding more.",
              },
              {
                q: "What's the maximum file size?",
                a: "You can upload files up to 50MB in size. For larger files, consider compressing them first using our compression tool.",
              },
              {
                q: "Do I need to create an account?",
                a: "No account is needed. OpenSuite is designed for instant access — just visit any tool page, upload your file, and get your result immediately.",
              },
              {
                q: "How long do download links stay active?",
                a: "Download links expire after 10 minutes for security. All files are permanently deleted from our servers after 1 hour, regardless of whether they were downloaded.",
              },
            ].map(({ q, a }, i) => (
              <details key={i} className="faq-item glass-card overflow-hidden">
                <summary className="text-white text-sm">
                  {q}
                  <span className="text-gray-500 text-xs ml-auto">+</span>
                </summary>
                <div className="px-5 py-4 text-sm text-gray-400">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              { "@type": "Question", name: "Is OpenSuite really completely free?", acceptedAnswer: { "@type": "Answer", text: "Yes! All tools are 100% free with no hidden costs." } },
              { "@type": "Question", name: "Are my files secure?", acceptedAnswer: { "@type": "Answer", text: "All files are encrypted and auto-deleted after 1 hour." } },
              { "@type": "Question", name: "What file formats are supported?", acceptedAnswer: { "@type": "Answer", text: "PDF, Word, Excel, PowerPoint, JPG, PNG, HTML, TXT, and EPUB." } },
            ],
          }),
        }}
      />

      {/* Software Application Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "OpenSuite - Free PDF Tools",
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            description: "Professional PDF processing tools, completely free. Convert, edit, compress, and secure documents.",
          }),
        }}
      />
    </>
  );
}
