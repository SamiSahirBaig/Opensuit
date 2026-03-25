"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

export function DragDropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    
    // Auto-detect and redirect
    const file = files[0];
    const type = file.type;
    const name = file.name.toLowerCase();

    // Default target
    let targetTool = "/merge-pdf";

    if (files.length > 1) {
      targetTool = "/merge-pdf";
    } else if (type === "application/pdf" || name.endsWith(".pdf")) {
      targetTool = "/edit-pdf"; // general default, could also be split-pdf depending on user preference
    } else if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) {
      targetTool = "/word-to-pdf";
    } else if (type === "image/jpeg" || type === "image/png" || name.endsWith(".jpg") || name.endsWith(".png")) {
      targetTool = "/jpg-to-pdf"; // Handles both since they are image to pdf
    }

    router.push(targetTool);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-8 mb-16 relative z-20">
      <div 
        className={`drag-drop-zone flex flex-col items-center justify-center text-center p-8 group ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="bg-[#f8cb46]/10 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
          <UploadCloud className="h-20 w-20 text-[#1a1a1a]" strokeWidth={1.5} />
        </div>
        
        <h3 className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] mb-3">
          Drag & Drop PDF here or Click to Browse
        </h3>
        
        <p className="text-base text-[#666666] mb-8 font-medium">
          Supported Formats: PDF, DOCX, XLSX, PPTX, JPG, PNG
        </p>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleChange} 
          className="hidden" 
          multiple 
          accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png" 
        />
        
        <div className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-lg">
          Select Files
        </div>
        
        <p className="mt-6 text-sm text-[#9ca3af]">Up to 100MB per file</p>
      </div>
    </div>
  );
}
