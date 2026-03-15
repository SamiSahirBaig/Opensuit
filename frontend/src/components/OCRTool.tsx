"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";
import { getToolBySlug } from "@/lib/tools";
import {
  ScanSearch,
  Upload,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  FileText,
  FileSpreadsheet,
  Presentation,
  Info,
} from "lucide-react";

const LANGUAGES = [
  { code: "eng", label: "English" },
  { code: "spa", label: "Spanish" },
  { code: "fra", label: "French" },
  { code: "deu", label: "German" },
  { code: "ita", label: "Italian" },
];

const OUTPUT_FORMATS = [
  { value: "searchable-pdf", label: "Searchable PDF", icon: ScanSearch, endpoint: "/api/convert/ocr-pdf" },
  { value: "word", label: "Word (.docx)", icon: FileText, endpoint: "/api/convert/pdf-to-word" },
  { value: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet, endpoint: "/api/convert/pdf-to-excel" },
  { value: "text", label: "Plain Text (.txt)", icon: FileText, endpoint: "/api/convert/pdf-to-txt" },
];

export function OCRTool() {
  const tool = getToolBySlug("ocr-pdf");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [language, setLanguage] = useState("eng");
  const [outputFormat, setOutputFormat] = useState("searchable-pdf");
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accentColor = "#7c3aed";

  // Generate PDF thumbnail
  useEffect(() => {
    if (!file) { setThumbnail(null); setPageCount(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (!cancelled) setThumbnail(canvas.toDataURL());
      } catch { /* skip */ }
    })();
    return () => { cancelled = true; };
  }, [file]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setStatus("idle");
      setErrorMessage("");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setStatus("idle");
      setErrorMessage("");
    }
  }, []);

  const handleConvert = async () => {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);

    try {
      const fmt = OUTPUT_FORMATS.find(f => f.value === outputFormat) || OUTPUT_FORMATS[0];
      const useOcr = outputFormat !== "searchable-pdf" ? "true" : "false";
      const endpoint = outputFormat === "searchable-pdf"
        ? `${fmt.endpoint}?language=${language}`
        : `${fmt.endpoint}?ocr=true&language=${language}`;

      const res = await uploadFile(file, endpoint);
      setStatus("processing");

      const result: JobStatusResponse = await pollJobStatus(res.jobId, (s) => setProgress(s.progress));
      if (result.status === "COMPLETED" && result.downloadToken) {
        setDownloadToken(result.downloadToken);
        setStatus("done");
      } else {
        setErrorMessage(result.message || "OCR processing failed");
        setStatus("error");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "OCR processing failed");
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setDownloadToken(null);
    setErrorMessage("");
    setThumbnail(null);
    setPageCount(null);
  };

  const selectedFormat = OUTPUT_FORMATS.find(f => f.value === outputFormat) || OUTPUT_FORMATS[0];
  const FormatIcon = selectedFormat.icon;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 56, height: 56, borderRadius: 16, marginBottom: 12,
          background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`,
        }}>
          <ScanSearch size={28} color={accentColor} />
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
          {tool?.title || "OCR PDF"}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>
          {tool?.description || "Extract text from scanned PDFs using OCR"}
        </p>
      </div>

      {/* Upload / Preview */}
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? accentColor : "#d1d5db"}`,
            borderRadius: 16, padding: "3rem 1.5rem", textAlign: "center",
            cursor: "pointer", transition: "all 0.2s",
            background: isDragOver ? `${accentColor}08` : "#fafafa",
          }}
        >
          <Upload size={40} color={isDragOver ? accentColor : "#9ca3af"} style={{ margin: "0 auto 12px" }} />
          <p style={{ fontWeight: 600, fontSize: "1.05rem", margin: "0 0 4px" }}>
            Drop your scanned PDF here or click to browse
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>PDF files up to 50 MB</p>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: "none" }} />
        </div>
      ) : (
        <div style={{
          border: "1px solid #e5e7eb", borderRadius: 16, padding: "1.25rem",
          display: "flex", gap: "1rem", alignItems: "flex-start", background: "#fff",
        }}>
          {thumbnail && (
            <img src={thumbnail} alt="Preview" style={{
              width: 80, borderRadius: 8, border: "1px solid #e5e7eb", flexShrink: 0,
            }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: "0.95rem", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </p>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px" }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
              {pageCount && ` · ${pageCount} page${pageCount > 1 ? "s" : ""}`}
            </p>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 10px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600,
              background: `${accentColor}15`, color: accentColor,
            }}>
              <ScanSearch size={14} />
              OCR Processing
            </div>
          </div>
          {status === "idle" && (
            <button onClick={reset} style={{
              background: "none", border: "none", color: "#9ca3af", cursor: "pointer",
              fontSize: "1.2rem", padding: 4,
            }}>✕</button>
          )}
        </div>
      )}

      {/* Options */}
      {file && status === "idle" && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Language Selector */}
          <div style={{
            padding: "1rem 1.25rem", borderRadius: 12,
            border: "1px solid #e5e7eb", background: "#fff",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Globe size={18} color={accentColor} />
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>OCR Language</span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8,
                border: "1px solid #e5e7eb", fontSize: "0.9rem", background: "#fafafa",
              }}
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Output Format */}
          <div style={{
            padding: "1rem 1.25rem", borderRadius: 12,
            border: "1px solid #e5e7eb", background: "#fff",
          }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem", display: "block", marginBottom: 8 }}>
              Output Format
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {OUTPUT_FORMATS.map(fmt => {
                const Icon = fmt.icon;
                const isSelected = outputFormat === fmt.value;
                return (
                  <button
                    key={fmt.value}
                    onClick={() => setOutputFormat(fmt.value)}
                    style={{
                      padding: "0.6rem 0.75rem", borderRadius: 10,
                      border: isSelected ? `2px solid ${accentColor}` : "1px solid #e5e7eb",
                      background: isSelected ? `${accentColor}08` : "#fff",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                      fontSize: "0.85rem", fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? accentColor : "#374151",
                      transition: "all 0.15s",
                    }}
                  >
                    <Icon size={16} />
                    {fmt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* OCR Info */}
          <div style={{
            padding: "0.75rem 1rem", borderRadius: 10,
            background: `${accentColor}08`, border: `1px solid ${accentColor}22`,
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <Info size={16} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: "0.8rem", color: "#4b5563", margin: 0, lineHeight: 1.4 }}>
              OCR works best with clear, high-resolution scans (300+ DPI). Processing time depends on page count.
              {pageCount && pageCount > 1 && ` Estimated ~${pageCount * 3}s for ${pageCount} pages.`}
            </p>
          </div>
        </div>
      )}

      {/* Convert Button */}
      {file && status === "idle" && (
        <button
          onClick={handleConvert}
          style={{
            width: "100%", marginTop: "1.25rem", padding: "0.85rem",
            borderRadius: 12, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            color: "#fff", fontWeight: 700, fontSize: "1rem",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "opacity 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <ScanSearch size={18} />
          Start OCR Processing
        </button>
      )}

      {/* Processing */}
      {(status === "uploading" || status === "processing") && (
        <div style={{
          marginTop: "1.5rem", padding: "1.25rem", borderRadius: 12,
          border: "1px solid #e5e7eb", background: "#fff", textAlign: "center",
        }}>
          <Loader2 size={28} color={accentColor} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontWeight: 600, margin: "0 0 8px" }}>
            {status === "uploading" ? "Uploading..." : "Processing OCR..."}
          </p>
          {pageCount && status === "processing" && (
            <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 8px" }}>
              Processing {Math.max(1, Math.round(progress / 100 * pageCount))} of {pageCount} pages
            </p>
          )}
          <div style={{ height: 6, borderRadius: 3, background: "#f3f4f6", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3, background: accentColor,
              width: `${progress}%`, transition: "width 0.3s",
            }} />
          </div>
          <p style={{ color: "#9ca3af", fontSize: "0.8rem", margin: "6px 0 0" }}>{progress}%</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Done */}
      {status === "done" && downloadToken && (
        <div style={{
          marginTop: "1.5rem", padding: "1.5rem", borderRadius: 12,
          border: `1px solid ${accentColor}33`, background: `${accentColor}08`, textAlign: "center",
        }}>
          <CheckCircle size={36} color={accentColor} style={{ margin: "0 auto 10px" }} />
          <p style={{ fontWeight: 700, fontSize: "1.1rem", margin: "0 0 4px" }}>OCR Complete!</p>
          <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 1rem" }}>
            Your {selectedFormat.label} file is ready to download
          </p>
          <a
            href={`/api/download/${downloadToken}`}
            download
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "0.75rem 2rem", borderRadius: 10,
              background: accentColor, color: "#fff", fontWeight: 700,
              textDecoration: "none", fontSize: "0.95rem",
            }}
          >
            <Download size={18} />
            Download
          </a>
          <div style={{ marginTop: "1rem" }}>
            <button onClick={reset} style={{
              background: "none", border: "none", color: accentColor,
              cursor: "pointer", fontWeight: 600, fontSize: "0.9rem",
            }}>
              Process another file
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{
          marginTop: "1.5rem", padding: "1.25rem", borderRadius: 12,
          border: "1px solid #fecaca", background: "#fef2f2", textAlign: "center",
        }}>
          <AlertCircle size={28} color="#ef4444" style={{ margin: "0 auto 8px" }} />
          <p style={{ fontWeight: 600, color: "#dc2626", margin: "0 0 4px" }}>OCR Failed</p>
          <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 1rem" }}>{errorMessage}</p>
          <button onClick={reset} style={{
            padding: "0.6rem 1.5rem", borderRadius: 8,
            border: "1px solid #d1d5db", background: "#fff",
            cursor: "pointer", fontWeight: 600,
          }}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
