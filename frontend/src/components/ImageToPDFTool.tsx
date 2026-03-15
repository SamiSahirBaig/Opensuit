"use client";

import { useState, useCallback, useRef } from "react";
import { uploadFile, pollJobStatus, JobStatusResponse } from "@/lib/api";
import { getToolBySlug } from "@/lib/tools";
import {
  FileUp,
  Upload,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  GripVertical,
} from "lucide-react";

const PAGE_SIZES = [
  { value: "original", label: "Original (image size)" },
  { value: "a4", label: "A4" },
  { value: "letter", label: "US Letter" },
];

const ORIENTATIONS = [
  { value: "auto", label: "Auto-detect" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

interface ImageToPDFToolProps {
  slug: string;
}

const FORMAT_ACCEPT: Record<string, string> = {
  "jpg-to-pdf": ".jpg,.jpeg",
  "png-to-pdf": ".png",
  "bmp-to-pdf": ".bmp",
  "tiff-to-pdf": ".tif,.tiff",
  "gif-to-pdf": ".gif",
};

export function ImageToPDFTool({ slug }: ImageToPDFToolProps) {
  const tool = getToolBySlug(slug);
  const accentColor = tool?.color || "#f59e0b";
  const acceptTypes = FORMAT_ACCEPT[slug] || ".jpg,.jpeg,.png,.bmp,.tif,.tiff,.gif";

  const [files, setFiles] = useState<{ file: File; preview: string; id: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pageSize, setPageSize] = useState("original");
  const [orientation, setOrientation] = useState("auto");
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const items = Array.from(newFiles).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));
    setFiles(prev => [...prev, ...items]);
    setStatus("idle");
    setErrorMessage("");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  }, [addFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const item = prev.find(f => f.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  // Drag reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setFiles(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIdx, 1);
      copy.splice(idx, 0, moved);
      return copy;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const handleConvert = async () => {
    if (files.length === 0 || !tool) return;
    setStatus("uploading");
    setProgress(0);

    try {
      // For single image, use standard upload
      const endpoint = `${tool.apiEndpoint}?pageSize=${pageSize}&orientation=${orientation}`;
      const res = await uploadFile(files[0].file, endpoint);
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
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setStatus("idle");
    setProgress(0);
    setDownloadToken(null);
    setErrorMessage("");
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
          <FileUp size={28} color={accentColor} />
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
          {tool?.title || "Image to PDF"}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>
          {tool?.description}
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? accentColor : "#d1d5db"}`,
          borderRadius: 16, padding: files.length > 0 ? "1.5rem" : "3rem 1.5rem", textAlign: "center",
          cursor: "pointer", transition: "all 0.2s",
          background: isDragOver ? `${accentColor}08` : "#fafafa",
        }}
      >
        <Upload size={files.length > 0 ? 24 : 40} color={isDragOver ? accentColor : "#9ca3af"} style={{ margin: "0 auto 8px" }} />
        <p style={{ fontWeight: 600, fontSize: files.length > 0 ? "0.9rem" : "1.05rem", margin: "0 0 4px" }}>
          {files.length > 0 ? "Add more images" : "Drop your images here or click to browse"}
        </p>
        <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>
          Supported: {acceptTypes.replace(/\./g, "").toUpperCase().replace(/,/g, ", ")}
        </p>
        <input ref={fileInputRef} type="file" accept={acceptTypes} multiple onChange={handleFileSelect} style={{ display: "none" }} />
      </div>

      {/* Thumbnail grid */}
      {files.length > 0 && status === "idle" && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: 8 }}>
            {files.length} image{files.length > 1 ? "s" : ""} selected
            {files.length > 1 && " · Drag to reorder"}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
            {files.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  position: "relative", borderRadius: 10,
                  border: dragIdx === idx ? `2px solid ${accentColor}` : "1px solid #e5e7eb",
                  overflow: "hidden", cursor: "grab", background: "#fff",
                }}
              >
                <img src={item.preview} alt={item.file.name} style={{
                  width: "100%", height: 80, objectFit: "cover", display: "block",
                }} />
                <div style={{
                  position: "absolute", top: 4, right: 4,
                }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(0,0,0,0.5)", border: "none",
                      color: "#fff", cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div style={{
                  position: "absolute", top: 4, left: 4, color: "#fff",
                  opacity: files.length > 1 ? 0.6 : 0,
                }}>
                  <GripVertical size={14} />
                </div>
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "2px 6px", background: "rgba(0,0,0,0.5)",
                  color: "#fff", fontSize: "0.7rem",
                  textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap",
                }}>
                  {idx + 1}. {item.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page Settings */}
      {files.length > 0 && status === "idle" && (
        <div style={{
          marginTop: "1rem", padding: "1rem 1.25rem", borderRadius: 12,
          border: "1px solid #e5e7eb", background: "#fff",
        }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem", display: "block", marginBottom: 10 }}>
            PDF Page Settings
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "block", marginBottom: 4 }}>
                Page Size
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                style={{
                  width: "100%", padding: "0.5rem", borderRadius: 8,
                  border: "1px solid #e5e7eb", fontSize: "0.85rem", background: "#fafafa",
                }}
              >
                {PAGE_SIZES.map(ps => (
                  <option key={ps.value} value={ps.value}>{ps.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "block", marginBottom: 4 }}>
                Orientation
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                style={{
                  width: "100%", padding: "0.5rem", borderRadius: 8,
                  border: "1px solid #e5e7eb", fontSize: "0.85rem", background: "#fafafa",
                }}
              >
                {ORIENTATIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Convert Button */}
      {files.length > 0 && status === "idle" && (
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
          <FileUp size={18} />
          Convert to PDF
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
            {status === "uploading" ? "Uploading..." : "Converting to PDF..."}
          </p>
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
            Your PDF is ready to download
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
            Download .pdf
          </a>
          <div style={{ marginTop: "1rem" }}>
            <button onClick={reset} style={{
              background: "none", border: "none", color: accentColor,
              cursor: "pointer", fontWeight: 600, fontSize: "0.9rem",
            }}>
              Convert more images
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
