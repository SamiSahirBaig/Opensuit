"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";
import { getToolBySlug } from "@/lib/tools";
import {
  Image,
  Upload,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings2,
} from "lucide-react";

const DPI_OPTIONS = [
  { value: 72, label: "72 DPI (Low)" },
  { value: 150, label: "150 DPI (Medium)" },
  { value: 300, label: "300 DPI (High)" },
  { value: 600, label: "600 DPI (Ultra)" },
];

interface PDFToImageToolProps {
  slug: string;
}

export function PDFToImageTool({ slug }: PDFToImageToolProps) {
  const tool = getToolBySlug(slug);
  const format = slug === "pdf-to-jpg" ? "JPG" : "PNG";
  const accentColor = slug === "pdf-to-jpg" ? "#f59e0b" : "#8b5cf6";

  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dpi, setDpi] = useState(300);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!file || !tool) return;
    setStatus("uploading");
    setProgress(0);

    try {
      const endpoint = `${tool.apiEndpoint}?dpi=${dpi}`;
      const res = await uploadFile(file, endpoint);
      setStatus("processing");

      const result: JobStatusResponse = await pollJobStatus(res.jobId, (s) => setProgress(s.progress));
      if (result.status === "COMPLETED" && result.downloadToken) {
        setDownloadToken(result.downloadToken);
        setStatus("done");
      } else {
        setErrorMessage(result.message || "Conversion failed");
        setStatus("error");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Conversion failed");
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

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 56, height: 56, borderRadius: 16, marginBottom: 12,
          background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`,
        }}>
          <Image size={28} color={accentColor} />
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
          {tool?.title || `PDF to ${format}`}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>
          {tool?.description}
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
            Drop your PDF here or click to browse
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
              <Image size={14} />
              Converting to {format}
              {pageCount && pageCount > 1 && " (ZIP)"}
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

      {/* DPI Selector */}
      {file && status === "idle" && (
        <div style={{
          marginTop: "1rem", padding: "1rem 1.25rem", borderRadius: 12,
          border: "1px solid #e5e7eb", background: "#fff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Settings2 size={18} color={accentColor} />
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Image Quality (DPI)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {DPI_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDpi(opt.value)}
                style={{
                  padding: "0.55rem 0.75rem", borderRadius: 10,
                  border: dpi === opt.value ? `2px solid ${accentColor}` : "1px solid #e5e7eb",
                  background: dpi === opt.value ? `${accentColor}08` : "#fff",
                  cursor: "pointer", fontSize: "0.85rem",
                  fontWeight: dpi === opt.value ? 600 : 400,
                  color: dpi === opt.value ? accentColor : "#374151",
                  transition: "all 0.15s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {pageCount && pageCount > 1 && (
            <p style={{ color: "#9ca3af", fontSize: "0.8rem", margin: "8px 0 0" }}>
              All {pageCount} pages will be converted and packaged as a ZIP file.
            </p>
          )}
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
          <Image size={18} />
          Convert to {format}
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
            {status === "uploading" ? "Uploading..." : "Converting..."}
          </p>
          {pageCount && pageCount > 1 && status === "processing" && (
            <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 8px" }}>
              Processing page {Math.max(1, Math.round(progress / 100 * pageCount))} of {pageCount}
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
          <p style={{ fontWeight: 700, fontSize: "1.1rem", margin: "0 0 4px" }}>Conversion Complete!</p>
          <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 1rem" }}>
            Your {format} {pageCount && pageCount > 1 ? "ZIP archive" : "image"} is ready
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
            Download {pageCount && pageCount > 1 ? ".zip" : `.${format.toLowerCase()}`}
          </a>
          <div style={{ marginTop: "1rem" }}>
            <button onClick={reset} style={{
              background: "none", border: "none", color: accentColor,
              cursor: "pointer", fontWeight: 600, fontSize: "0.9rem",
            }}>
              Convert another file
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
          <p style={{ fontWeight: 600, color: "#dc2626", margin: "0 0 4px" }}>Conversion Failed</p>
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
