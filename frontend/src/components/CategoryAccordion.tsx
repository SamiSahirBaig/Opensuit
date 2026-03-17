"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Tool } from "@/lib/tools";

interface CategoryAccordionProps {
    categories: { id: string; label: string; description: string }[];
    tools: Tool[];
}

export function CategoryAccordion({ categories, tools }: CategoryAccordionProps) {
    const [openCategory, setOpenCategory] = useState<string | null>(null);

    const toggle = (id: string) => {
        setOpenCategory(prev => (prev === id ? null : id));
    };

    return (
        <div className="space-y-3">
            {categories.map(category => {
                const categoryTools = tools.filter(t => t.category === category.id);
                if (categoryTools.length === 0) return null;
                const isOpen = openCategory === category.id;

                return (
                    <div key={category.id} className="border-2 border-[#E5E5E5] rounded-xl overflow-hidden transition-colors hover:border-[#F8CB46]">
                        <button
                            id={`category-${category.id}`}
                            onClick={() => toggle(category.id)}
                            className="w-full flex items-center justify-between px-6 py-4 text-left bg-white hover:bg-[#FFFEF9] transition-colors"
                        >
                            <div>
                                <h3 className="text-lg font-bold text-[#1A1A1A]">
                                    {category.label}
                                </h3>
                                <p className="text-sm text-[#666666] mt-0.5">
                                    {category.description} · {categoryTools.length} tools
                                </p>
                            </div>
                            <ChevronDown
                                className={`h-5 w-5 text-[#999999] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                            />
                        </button>

                        <div
                            className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                            }`}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 pt-2 bg-[#FAFAFA] border-t border-[#E5E5E5]">
                                {categoryTools.map(tool => {
                                    const IconComponent = tool.icon;
                                    return (
                                        <Link key={tool.slug} href={`/${tool.slug}`} className="group">
                                            <div className="tool-card p-4 h-full !rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all group-hover:scale-110"
                                                        style={{
                                                            background: `${tool.color}15`,
                                                            border: `1px solid ${tool.color}25`,
                                                        }}
                                                    >
                                                        <IconComponent className="h-5 w-5" style={{ color: tool.color }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm font-semibold text-[#1A1A1A] group-hover:text-[#E5B62E] transition-colors">
                                                            {tool.title}
                                                        </h4>
                                                        <p className="text-xs text-[#999999] truncate">
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
                    </div>
                );
            })}
        </div>
    );
}
