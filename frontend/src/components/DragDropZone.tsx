"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Upload, X, FileText, Image as ImageIcon, FileSpreadsheet, Presentation } from "lucide-react";
import { useRouter } from "next/navigation";

interface UploadedFile {
    id: string;
    file: File;
    preview: string;
    progress: number;
    status: "uploading" | "completed" | "error";
}

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

// Helper to get right icon based on file type
const getFileIcon = (file: File) => {
    if (file.type.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" />;
    if (file.type.includes("image")) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (file.type.includes("sheet") || file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    if (file.type.includes("presentation") || file.name.endsWith(".ppt") || file.name.endsWith(".pptx")) return <Presentation className="h-8 w-8 text-orange-500" />;
    if (file.type.includes("word") || file.name.endsWith(".doc") || file.name.endsWith(".docx")) return <FileText className="h-8 w-8 text-blue-600" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

interface EnhancedDragDropProps {
    onFilesUploaded?: (files: File[]) => void;
    autoRedirect?: boolean;
}

const FILE_TYPE_MAP: Record<string, string> = {
    "application/pdf": "/merge-pdf",
    "application/msword": "/word-to-pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "/word-to-pdf",
    "application/vnd.ms-excel": "/excel-to-pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "/excel-to-pdf",
    "application/vnd.ms-powerpoint": "/ppt-to-pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "/ppt-to-pdf",
    "image/jpeg": "/jpg-to-pdf",
    "image/png": "/png-to-pdf",
};

export function EnhancedDragDrop({ onFilesUploaded, autoRedirect = true }: EnhancedDragDropProps) {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const router = useRouter();
    // For hydration issue with dnd
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    const uploadFiles = async (filesToUpload: UploadedFile[]) => {
        // Mock upload progress since actual file upload logic depends on the specific backend endpoints
        // In real impl, we use XMLHttpRequest or axios for precise progress.
        // For the UI demonstration per requirements:
        for (const fileObj of filesToUpload) {
            // Simulate progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 30;
                setFiles(prev => prev.map(f =>
                    f.id === fileObj.id
                        ? { ...f, progress: Math.min(100, progress) }
                        : f
                ));

                if (progress >= 100) {
                    clearInterval(interval);
                    setFiles(prev => prev.map(f =>
                        f.id === fileObj.id ? { ...f, progress: 100, status: "completed" } : f
                    ));

                    // If autoRedirect is enabled and we just uploaded the first file seamlessly
                    if (autoRedirect && filesToUpload.length === 1) {
                        const file = fileObj.file;
                        let route = FILE_TYPE_MAP[file.type];
                        if (!route) {
                            const ext = "." + file.name.split(".").pop()?.toLowerCase();
                            // Simple fallback mapping
                            if (ext === ".pdf") route = "/merge-pdf";
                            else if (ext === ".docx" || ext === ".doc") route = "/word-to-pdf";
                            else if (ext === ".jpg" || ext === ".png") route = "/jpg-to-pdf";
                            else route = "/merge-pdf";
                        }
                        // Short delay before redirect for UX
                        setTimeout(() => router.push(route), 500);
                    }
                }
            }, 300);
        }

        if (onFilesUploaded) {
            onFilesUploaded(filesToUpload.map(f => f.file));
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = acceptedFiles.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
            progress: 0,
            status: "uploading" as const
        }));

        setFiles(prev => [...prev, ...newFiles]);
        uploadFiles(newFiles);
    }, [autoRedirect, onFilesUploaded, router]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            "application/msword": [".doc"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
            "application/vnd.ms-powerpoint": [".ppt"],
            "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
            "text/plain": [".txt"],
            "text/html": [".html"]
        },
        maxSize: MAX_SIZE,
        multiple: true
    });

    const removeFile = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file?.preview) URL.revokeObjectURL(file.preview);
            return prev.filter(f => f.id !== id);
        });
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const startIndex = result.source.index;
        const endIndex = result.destination.index;

        const resultFiles = Array.from(files);
        const [removed] = resultFiles.splice(startIndex, 1);
        resultFiles.splice(endIndex, 0, removed);
        setFiles(resultFiles);
    };

    if (!isMounted) return null; // Prevent hydration mismatch with dnd

    return (
        <section className="py-10 sm:py-14">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                {files.length === 0 ? (
                    // Default State
                    <div
                        {...getRootProps()}
                        className={`relative flex flex-col items-center justify-center text-center cursor-pointer rounded-2xl transition-all duration-300 ${
                            isDragActive
                                ? "border-[3px] border-solid border-[#F8CB46] bg-[#FFF9E6] shadow-[0_0_40px_rgba(248,203,70,0.2)] animate-[pulse_1.5s_infinite]"
                                : isDragReject
                                ? "border-[3px] border-dashed border-red-500 bg-red-50"
                                : "border-[3px] border-dashed border-[#F8CB46] bg-[#FFFEF9] hover:border-[#E5B62E] hover:bg-[#FFF9E6]"
                        }`}
                        style={{ minHeight: "500px" }}
                    >
                        <input {...getInputProps()} />

                        <div
                            className={`flex items-center justify-center rounded-full mb-6 transition-all duration-300 ${
                                isDragActive
                                    ? "h-28 w-28 bg-[#F8CB46] shadow-lg scale-110"
                                    : "h-24 w-24 bg-[#FFF3CC]"
                            }`}
                        >
                            <Upload
                                className={`transition-all duration-300 ${
                                    isDragActive ? "h-14 w-14 text-white" : "h-12 w-12 text-[#E5B62E]"
                                }`}
                            />
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-2">
                            {isDragActive
                                ? "Drop files here!"
                                : isDragReject
                                ? "Unsupported format"
                                : "Drag & Drop files here or Click to Browse"}
                        </h3>

                        {!isDragActive && (
                            <>
                                <p className="text-[#666666] text-sm mb-6 max-w-md">
                                    Upload multiple files. We&apos;ll automatically detect the file types.
                                </p>

                                <div className="flex flex-wrap justify-center gap-2 mb-4">
                                    {["PDF", "DOCX", "XLSX", "PPTX", "JPG", "PNG"].map(fmt => (
                                        <span
                                            key={fmt}
                                            className="px-3 py-1 text-xs font-medium rounded-full bg-white border border-[#E5E5E5] text-[#666666]"
                                        >
                                            {fmt}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-[#999999]">Up to 100MB per file</p>
                            </>
                        )}
                    </div>
                ) : (
                    // Uploaded / Uploading State Grid
                    <div className="bg-[#FFFEF9] border-2 border-[#E5E5E5] rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E5E5]">
                            <h3 className="text-lg font-bold text-[#1A1A1A]">
                                Uploaded Files <span className="text-[#999999] ml-1">({files.length})</span>
                            </h3>
                            <button
                                // We use a separate input for "Add More" since useDropzone occupies the whole zero-state UI
                                onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.multiple = true;
                                    input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.html";
                                    input.onchange = (e) => {
                                        const target = e.target as HTMLInputElement;
                                        if (target.files) onDrop(Array.from(target.files));
                                    };
                                    input.click();
                                }}
                                className="px-4 py-2 text-sm font-semibold text-[#1A1A1A] bg-[#F8CB46] hover:bg-[#E5B62E] rounded-lg transition-colors shadow-sm"
                            >
                                Add More Files
                            </button>
                        </div>

                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="files-grid" direction="horizontal">
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                    >
                                        {files.map((fileObj, index) => (
                                            <Draggable key={fileObj.id} draggableId={fileObj.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`relative flex flex-col p-4 bg-white border-2 rounded-xl transition-all duration-200 cursor-move ${
                                                            snapshot.isDragging
                                                                ? "border-[#F8CB46] shadow-xl scale-105 z-50 opacity-90 rotate-2"
                                                                : "border-[#E5E5E5] hover:border-[#F8CB46] hover:shadow-md"
                                                        }`}
                                                        style={provided.draggableProps.style}
                                                    >
                                                        {/* Remove button */}
                                                        <button
                                                            onClick={(e) => removeFile(fileObj.id, e)}
                                                            className="absolute -top-2 -right-2 p-1.5 bg-white border border-[#E5E5E5] text-[#999999] hover:text-red-500 hover:border-red-500 rounded-full shadow-sm z-10 transition-colors"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>

                                                        {/* Thumbnail/Icon Area */}
                                                        <div className="h-28 flex items-center justify-center bg-[#FAFAFA] rounded-lg mb-3 border border-[#E5E5E5] overflow-hidden">
                                                            {fileObj.preview ? (
                                                                <img
                                                                    src={fileObj.preview}
                                                                    alt={fileObj.file.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                getFileIcon(fileObj.file)
                                                            )}
                                                        </div>

                                                        {/* Meta */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-[#1A1A1A] truncate" title={fileObj.file.name}>
                                                                {fileObj.file.name}
                                                            </p>
                                                            <p className="text-xs text-[#999999] mt-0.5">
                                                                {formatFileSize(fileObj.file.size)}
                                                            </p>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        {fileObj.status === "uploading" && (
                                                            <div className="mt-3">
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="text-[#666666]">Uploading...</span>
                                                                    <span className="text-[#1A1A1A] font-medium">{Math.round(fileObj.progress)}%</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-[#E5E5E5] rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-[#10B981] transition-all duration-300 ease-out"
                                                                        style={{ width: `${fileObj.progress}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {fileObj.status === "completed" && (
                                                            <div className="mt-3 text-xs font-semibold text-[#10B981] flex items-center gap-1">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                                                Ready to process
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>

                        {files.length > 0 && files.every(f => f.status === "completed") && (
                            <div className="mt-6 flex justify-end">
                                <button className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#333333] text-white text-sm font-semibold rounded-xl transition-colors shadow-md">
                                    Continue with {files.length} file{files.length > 1 ? "s" : ""}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
