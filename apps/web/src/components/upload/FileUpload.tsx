"use client";

import { useRef, useState, useCallback } from "react";
import { useNeuronStore } from "@/store/useNeuronStore";
import { useImageStore } from "@/store/useImageStore";
import { isSupportedFile, isImageFile } from "@/lib/parsers";

export default function FileUpload() {
  const loadFile = useNeuronStore((s) => s.loadFile);
  const fileName = useNeuronStore((s) => s.fileName);
  const loading = useNeuronStore((s) => s.loading);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (isImageFile(file.name)) {
        useImageStore.getState().loadTiff(file);
      } else if (isSupportedFile(file.name)) {
        loadFile(file);
      }
    },
    [loadFile],
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
        accept=".swc,.asc,.json,.tif,.tiff"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {loading ? (
        <p className="text-text-muted text-sm">Loading...</p>
      ) : fileName ? (
        <p className="text-sm">
          <span className="text-accent font-medium">{fileName}</span>
          <span className="text-text-muted ml-2">&mdash; drop another to replace</span>
        </p>
      ) : (
        <p className="text-text-muted text-sm">Drop neuron file (.swc, .asc, .json) or image (.tif)</p>
      )}
    </div>
  );
}
