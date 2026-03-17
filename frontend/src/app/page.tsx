import Link from "next/link";
import { tools, toolCategories } from "@/lib/tools";
import { Shield, Zap, Lock, Clock, ArrowRight, CheckCircle, FileCheck, Globe, Sparkles } from "lucide-react";
import { AdLeaderboard, AdBillboard, AdNativeGrid } from "@/components/AdUnit";
import { DragDropZone } from "@/components/DragDropZone";
import { CategoryAccordion } from "@/components/CategoryAccordion";

/* 12 most used tool slugs */
const MOST_USED_SLUGS = [
  "merge-pdf", "split-pdf", "compress-pdf", "pdf-to-word",
  "word-to-pdf", "pdf-to-jpg", "jpg-to-pdf", "protect-pdf",
  "unlock-pdf", "rotate-pdf", "reorder-pdf-pages", "sign-pdf",
];

export default function HomePage() {
  const mostUsedTools = MOST_USED_SLUGS
    .map(slug => tools.find(t => t.slug === slug))
    .filter(Boolean) as typeof tools;

  return (
    <>
      {/* ─── Hero Section ─── */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-22 lg:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF3CC] border border-[#F8CB46]/40 text-[#9A7B1A] text-xs font-semibold mb-6 animate-fade-in-up">
              <Sparkles className="h-3.5 w-3.5" />
              100% FREE · NO SIGNUP REQUIRED
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1A1A1A] mb-5 animate-fade-in-up animate-delay-100">
              All PDF Tools in{" "}
              <span className="text-[#E5B62E]">One Place</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#666666] max-w-2xl mx-auto mb-8 animate-fade-in-up animate-delay-200">
              Convert, edit, compress, merge, split, and secure your PDF documents.
              Free · Fast · No Login Required.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up animate-delay-300">
              <Link href="#tools" className="btn-primary inline-flex items-center justify-center gap-2 text-base px-8 py-3.5">
                Explore All Tools
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/merge-pdf" className="btn-secondary inline-flex items-center justify-center gap-2 text-base px-8 py-3.5">
                Merge PDFs Now
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-14 grid grid-cols-3 gap-8 max-w-md mx-auto animate-fade-in-up animate-delay-300">
              {[
                { value: "25+", label: "Free Tools" },
                { value: "<2s", label: "Processing" },
                { value: "100MB", label: "Max File Size" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#E5B62E]">
                    {value}
                  </p>
                  <p className="text-xs text-[#999999] mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Ad #1: Billboard Below Hero ─── */}
      <AdBillboard />

      {/* ─── Trust Indicators ─── */}
      <section className="border-y border-[#E5E5E5] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, label: "Privacy First", desc: "Files auto-deleted" },
              { icon: Zap, label: "Lightning Fast", desc: "Under 2s processing" },
              { icon: Lock, label: "Secure", desc: "Encrypted transfer" },
              { icon: Clock, label: "No Signup", desc: "Instant access" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF3CC]">
                  <Icon className="h-5 w-5 text-[#E5B62E]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{label}</p>
                  <p className="text-xs text-[#999999]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Drag & Drop Zone ─── */}
      <DragDropZone />

      {/* ─── Most Used Tools ─── */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] mb-3">
              Most Used <span className="text-[#E5B62E]">Tools</span>
            </h2>
            <p className="text-[#666666] max-w-xl mx-auto">
              Jump straight into our most popular tools — trusted by millions.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {mostUsedTools.map((tool, index) => {
              const IconComponent = tool.icon;
              return (
                <div key={tool.slug} className="contents">
                  {index === 7 && (
                    <AdNativeGrid slot="native-grid" className="hidden sm:flex" />
                  )}
                  <Link href={`/${tool.slug}`} className="group">
                    <div className="tool-card h-full flex flex-col items-center text-center p-6">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-xl mb-4 transition-all group-hover:scale-110 group-hover:shadow-lg"
                        style={{
                          background: `${tool.color}15`,
                          border: `1px solid ${tool.color}25`,
                        }}
                      >
                        <IconComponent className="h-7 w-7" style={{ color: tool.color }} />
                      </div>
                      <h4 className="text-base font-semibold text-[#1A1A1A] mb-1 group-hover:text-[#E5B62E] transition-colors">
                        {tool.title}
                      </h4>
                      <p className="text-xs text-[#999999] leading-relaxed line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Ad #2: Between tools sections ─── */}
      <div className="border-t border-[#E5E5E5]">
        <AdLeaderboard />
      </div>

      {/* ─── All Tools by Category (Expandable) ─── */}
      <section id="tools" className="py-14 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] mb-3">
              All <span className="text-[#E5B62E]">Tools</span> by Category
            </h2>
            <p className="text-[#666666] max-w-xl mx-auto">
              Everything you need to work with documents — conversion, editing, security, and more.
            </p>
          </div>

          <CategoryAccordion categories={toolCategories} tools={tools} />
        </div>
      </section>

      {/* ─── Ad: Between sections ─── */}
      <div className="border-t border-[#E5E5E5]">
        <AdLeaderboard />
      </div>

      {/* ─── Why Choose OpenSuite ─── */}
      <section className="py-14 sm:py-20 bg-[#FFFDF5]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-10 text-center">
            Why Choose <span className="text-[#E5B62E]">OpenSuite</span>?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { text: "100% Free Forever", desc: "No hidden fees, no premium tiers. Every tool is completely free." },
              { text: "No Registration Required", desc: "Instant access to all tools. No account, no email, no hassle." },
              { text: "Files Deleted After 1 Hour", desc: "Your privacy matters. All uploads are automatically removed." },
              { text: "Fast Processing", desc: "Most operations complete in under 2 seconds." },
              { text: "All Premium Features Included", desc: "No watermarks, no limits, no quality reduction." },
              { text: "Works on Any Device", desc: "Use on desktop, tablet, or phone — no app install needed." },
            ].map(({ text, desc }) => (
              <div key={text} className="flex gap-3 p-5 rounded-xl bg-white border border-[#E5E5E5] hover:border-[#F8CB46] transition-colors">
                <CheckCircle className="h-5 w-5 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-sm">{text}</p>
                  <p className="text-xs text-[#666666] mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="border-t border-[#E5E5E5] py-14 sm:py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-12 text-center">
            How It <span className="text-[#E5B62E]">Works</span>
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
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3CC] mb-4 mx-auto">
                  <Icon className="h-6 w-6 text-[#E5B62E]" />
                </div>
                <span className="absolute top-0 right-1/4 text-5xl font-extrabold text-[#F8CB46]/10">{step}</span>
                <h3 className="text-base font-semibold text-[#1A1A1A] mb-2">{title}</h3>
                <p className="text-sm text-[#666666] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SEO Content ─── */}
      <section className="border-t border-[#E5E5E5] py-14 sm:py-20 bg-[#FAFAFA]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-8 text-center">
            Why Choose OpenSuite for PDF Processing?
          </h2>

          <div className="prose max-w-none text-[#666666] space-y-6">
            <p>
              OpenSuite is the most comprehensive free online PDF toolkit available today. Whether you need to convert
              PDF documents to Word, Excel, PowerPoint, or image formats, or you need to merge, split, compress, rotate,
              or secure your PDFs — OpenSuite handles it all with professional-grade accuracy and speed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose my-8">
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
                <div key={title} className="p-5 rounded-xl bg-white border border-[#E5E5E5] hover:border-[#F8CB46] transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF3CC] mb-3">
                    <Icon className="h-4 w-4 text-[#E5B62E]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1.5">{title}</h3>
                  <p className="text-xs text-[#666666] leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-semibold text-[#1A1A1A]">No Hidden Costs, No Limitations</h3>
            <p>
              Unlike other PDF tools that lock features behind paywalls, OpenSuite provides every tool completely free.
              There are no daily limits, no file size restrictions beyond our generous 100MB maximum, no watermarks on
              output files, and no quality reduction. Professional PDF processing should be accessible to everyone —
              students, professionals, businesses, and individuals alike.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section className="border-t border-[#E5E5E5] py-14 sm:py-20 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8 text-center">Frequently Asked Questions</h2>

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
                a: "You can upload files up to 100MB in size. For larger files, consider compressing them first using our compression tool.",
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
              <details key={i} className="faq-item">
                <summary className="text-sm">
                  {q}
                  <span className="text-[#999999] text-xs ml-auto">+</span>
                </summary>
                <div className="px-5 py-4 text-sm text-[#666666]">{a}</div>
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
