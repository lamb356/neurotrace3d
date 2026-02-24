"use client";

import { useCallback, useRef, useState } from "react";
import { isSupportedFile } from "@/lib/parsers";

interface BatchDropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export default function BatchDropZone({ onFiles, disabled }: BatchDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;

      const files: File[] = [];
      if (e.dataTransfer.items) {
        for (const item of Array.from(e.dataTransfer.items)) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file && isSupportedFile(file.name)) {
              files.push(file);
            }
          }
        }
      } else {
        for (const file of Array.from(e.dataTransfer.files)) {
          if (isSupportedFile(file.name)) {
            files.push(file);
          }
        }
      }
      if (files.length > 0) onFiles(files);
    },
    [onFiles, disabled],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList) return;
      const files = Array.from(fileList).filter((f) =>
        f.name.toLowerCase().endsWith(".swc"),
      );
      if (files.length > 0) onFiles(files);
      // Reset so same files can be re-selected
      e.target.value = "";
    },
    [onFiles],
  );

  return (
    <div
      className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
        dragOver
          ? "border-accent bg-accent/10"
          : "border-border hover:border-accent/40 hover:bg-surface-hover"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <svg
        className="text-text-muted mb-3 h-10 w-10"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
      <p className="text-text-muted text-sm font-medium">
        Drop neuron files (.swc, .asc, .json)
      </p>
      <p className="text-text-muted mt-1 text-xs">
        or click to select files
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".swc,.asc,.json"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
