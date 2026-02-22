"use client";

import { useRef, useState, useCallback } from "react";

interface FileUploadProps {
  onFile: (file: File) => void;
  filename: string | null;
  loading: boolean;
}

export default function FileUpload({ onFile, filename, loading }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (file.name.endsWith(".swc")) {
        onFile(file);
      }
    },
    [onFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div
      className={`flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed px-4 py-3 transition-colors ${
        dragOver
          ? "border-accent bg-accent/10"
          : "border-border bg-surface hover:bg-surface-hover"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".swc"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {loading ? (
        <p className="text-text-muted text-sm">Loading...</p>
      ) : filename ? (
        <p className="text-sm">
          <span className="text-accent font-medium">{filename}</span>
          <span className="text-text-muted ml-2">— drop another to replace</span>
        </p>
      ) : (
        <p className="text-text-muted text-sm">Drop .swc file or click to browse</p>
      )}
    </div>
  );
}
