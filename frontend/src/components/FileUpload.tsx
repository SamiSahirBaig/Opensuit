"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";

interface FileUploadProps {
    acceptedTypes: string;
    multiFile?: boolean;
    onFilesSelected: (files: File[]) => void;
    maxSizeMB?: number;
}

export function FileUpload({ acceptedTypes, multiFile = false, onFilesSelected, maxSizeMB = 50 }: FileUploadProps) {
    const [dragging, setDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): boolean => {
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`File "${file.name}" exceeds ${maxSizeMB}MB limit`);
            return false;
        }
        return true;
    };

    const handleFiles = useCallback((newFiles: FileList | File[]) => {
        setError(null);
        const fileArray = Array.from(newFiles);
        const validFiles = fileArray.filter(validateFile);

        if (validFiles.length === 0) return;

        const selected = multiFile ? [...files, ...validFiles] : [validFiles[0]];
        setFiles(selected);
        onFilesSelected(selected);
    }, [files, multiFile, onFilesSelected, maxSizeMB]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const removeFile = (index: number) => {
        const updated = files.filter((_, i) => i !== index);
        setFiles(updated);
        onFilesSelected(updated);
    };

    return (
        <div className="w-full">
            <div
                className={`upload-zone p-8 sm:p-12 text-center ${dragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={acceptedTypes}
                    multiple={multiFile}
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                />

                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                        <Upload className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-base font-semibold text-white mb-1">
                            {dragging ? "Drop your files here" : "Drop files here or click to upload"}
                        </p>
                        <p className="text-sm text-gray-500">
                            {multiFile ? "Select one or more files" : "Select a file"} • Max {maxSizeMB}MB
                            {acceptedTypes && ` • ${acceptedTypes}`}
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    {files.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                            <div className="flex items-center gap-3 min-w-0">
                                <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
