"use client";

import { useState } from "react";
import Link from "next/link";
import { tools, toolCategories } from "@/lib/tools";
import { AdBanner, AdUnit } from "@/components/AdUnit";
import { DragDropZone } from "@/components/DragDropZone";
import { ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

export default function HomePage() {
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    convert: true, // Default open the first one
  });

  const toggleCategory = (catId: string) => {
    setExpandedCats((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // 12 Most Used Tools specified by user
  const mostUsedSlugs = [
    "merge-pdf",
    "split-pdf",
    "compress-pdf",
    "pdf-to-word",
    "word-to-pdf",
    "pdf-to-jpg",
    "jpg-to-pdf",
    "protect-pdf",
    "unlock-pdf",
    "rotate-pdf",
    "edit-pdf",
    "sign-pdf"
  ];

  const mostUsedTools = mostUsedSlugs
    .map((slug) => tools.find((t) => t.slug === slug))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  return (
    <>
      {/* Search Bar / Top Action Area Could go here, but omitted for clean Hero */}
      
      {/* Hero Section */}
      <section className="bg-white pt-16 pb-8 text-center relative z-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1A1A1A] mb-4">
            All PDF Tools in <span className="text-[#F8CB46]">One Place</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#666666] font-medium mb-8">
            Free • Fast • No Login Required
          </p>
        </div>
      </section>

      {/* Drag & Drop Zone */}
      <DragDropZone />

      {/* Ad #1: Homepage - Above Most Used Tools (Billboard 970x250 / Mobile 300x250) */}
      <div className="w-full flex justify-center pb-12 bg-white relative z-10">
        <AdUnit slot="homepage_billboard" format="auto" responsive={true} className="w-[300px] md:w-[970px] min-h-[250px]" />
      </div>

      {/* Most Used Tools */}
      <section className="py-16 bg-[#F9FAFB] border-t border-[#E5E5E5]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-10 text-center">
            Most Used Tools
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mostUsedTools.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <Link key={tool.slug} href={`/${tool.slug}`} className="block">
                  <div className="tool-card flex flex-col items-center justify-center text-center h-full">
                    <IconComponent className="tool-icon" style={{ color: tool.color }} />
                    <h3 className="tool-title">{tool.title}</h3>
                    <p className="tool-description line-clamp-2">{tool.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* All Tools by Category (Accordion) */}
      <section id="tools" className="py-20 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-[#1A1A1A] mb-12 text-center">
            All Tools by Category
          </h2>

          <div className="space-y-4">
            {toolCategories.map((category) => {
              const categoryTools = tools.filter((t) => t.category === category.id);
              if (categoryTools.length === 0) return null;
              
              const isExpanded = expandedCats[category.id];

              return (
                <div key={category.id} className="border border-[#E5E5E5] rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-[#F9FAFB] transition-colors focus:outline-none"
                  >
                    <div>
                      <h3 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-3">
                        {category.label} 
                        <span className="text-sm font-medium text-[#666666] bg-gray-100 px-2 py-0.5 rounded-full">
                          {categoryTools.length} tools
                        </span>
                      </h3>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-6 w-6 text-[#666666]" />
                    ) : (
                      <ChevronDown className="h-6 w-6 text-[#666666]" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="p-6 pt-0 border-t border-[#E5E5E5] bg-[#F9FAFB]/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                        {categoryTools.map((tool) => {
                          const IconComponent = tool.icon;
                          return (
                            <Link key={tool.slug} href={`/${tool.slug}`} className="group">
                              <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 hover:border-[#F8CB46] hover:shadow-md transition-all flex items-start gap-4 h-full">
                                <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${tool.color}15` }}>
                                  <IconComponent className="h-5 w-5" style={{ color: tool.color }} />
                                </div>
                                <div>
                                  <h4 className="text-[#1A1A1A] font-semibold text-sm mb-1 group-hover:text-[#F8CB46] transition-colors">
                                    {tool.title}
                                  </h4>
                                  <p className="text-xs text-[#666666] line-clamp-2">
                                    {tool.description}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Middle Ad Banner */}
      <div className="bg-[#F9FAFB] border-y border-[#E5E5E5]">
        <AdBanner />
      </div>

      {/* Why Choose Us */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-12">
            Why Choose OpenSuit?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {[
              { title: "100% Free Forever", desc: "No hidden costs, no paywalls, just professional tools free for everyone." },
              { title: "No Registration Required", desc: "Start using tools instantly without handing over your email or data." },
              { title: "Files Deleted After 1 Hour", desc: "Your privacy is guaranteed. We automatically destroy files shortly after processing." },
              { title: "Fast Processing", desc: "Powered by modern cloud infrastructure to process your PDFs in milliseconds." },
              { title: "All Premium Features Included", desc: "Extract, Sign, PDF/A, Repair, and more—all the powerful tools in one place." },
              { title: "Cross-Platform Support", desc: "Works perfectly on Mac, Windows, Linux, iOS, and Android devices." }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-[#10B981]/10 flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-[#10B981]" />
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{feature.title}</h3>
                <p className="text-[#666666] text-sm leading-relaxed max-w-xs">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
