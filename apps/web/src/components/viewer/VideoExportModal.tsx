"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import { useNeuronStore } from "@/store/useNeuronStore";
import { DEFAULT_VIDEO_CONFIG, RESOLUTION_MAP } from "@/lib/videoExport";
import type { AnimationStrategy, VideoResolution, VideoExportConfig } from "@/lib/videoExport";

interface VideoExportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function VideoExportModal({ open, onClose }: VideoExportModalProps) {
  const [strategy, setStrategy] = useState<AnimationStrategy>(DEFAULT_VIDEO_CONFIG.strategy);
  const [duration, setDuration] = useState(DEFAULT_VIDEO_CONFIG.duration);
  const [fps] = useState(DEFAULT_VIDEO_CONFIG.fps);
  const [resolution, setResolution] = useState<VideoResolution>(DEFAULT_VIDEO_CONFIG.resolution);

  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [frameCount, setFrameCount] = useState("");

  // Save/restore post-processing
  const savedPP = useNeuronStore((s) => s.postProcessing);

  const handleProgress = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail as { frame: number; totalFrames: number; progress: number };
    setProgress(detail.progress);
    setFrameCount(`${detail.frame + 1} / ${detail.totalFrames}`);
  }, []);

  const handleComplete = useCallback(
    (e: Event) => {
      const { blob } = (e as CustomEvent).detail as { blob: Blob };
      setRecording(false);
      setProgress(0);

      // Restore post-processing
      useNeuronStore.getState().setPostProcessing(savedPP);

      // Download
      const fileName = useNeuronStore.getState().fileName ?? "neuron";
      const baseName = fileName.replace(/\.swc$/i, "");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neurotrace3d-${baseName}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [savedPP],
  );

  const handleCancelled = useCallback(() => {
    setRecording(false);
    setProgress(0);
    useNeuronStore.getState().setPostProcessing(savedPP);
  }, [savedPP]);

  useEffect(() => {
    window.addEventListener("video-capture-progress", handleProgress);
    window.addEventListener("video-capture-complete", handleComplete);
    window.addEventListener("video-capture-cancelled", handleCancelled);
    return () => {
      window.removeEventListener("video-capture-progress", handleProgress);
      window.removeEventListener("video-capture-complete", handleComplete);
      window.removeEventListener("video-capture-cancelled", handleCancelled);
    };
  }, [handleProgress, handleComplete, handleCancelled]);

  function handleStart() {
    // Disable post-processing during recording
    useNeuronStore.getState().setPostProcessing("off");

    setRecording(true);
    setProgress(0);
    setFrameCount("");

    // Wait one tick for post-processing to unmount, then start
    setTimeout(() => {
      const config: VideoExportConfig = { strategy, duration, fps, resolution };
      window.dispatchEvent(new CustomEvent("start-video-capture", { detail: config }));
    }, 50);
  }

  function handleCancel() {
    window.dispatchEvent(new CustomEvent("cancel-video-capture"));
  }

  const res = RESOLUTION_MAP[resolution];

  return (
    <Modal open={open} onClose={recording ? () => {} : onClose} title="Video Export" width="max-w-sm">
      {!recording ? (
        <div className="flex flex-col gap-3">
          {/* Strategy */}
          <label className="text-text-muted text-xs font-medium">
            Animation
            <select
              className="bg-surface border-border text-text mt-1 block w-full rounded border px-2 py-1.5 text-sm"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as AnimationStrategy)}
            >
              <option value="orbit">Orbit (360°)</option>
              <option value="fly-along">Fly Along Longest Path</option>
              <option value="zoom-to-soma">Zoom to Soma</option>
            </select>
          </label>

          {/* Duration */}
          <label className="text-text-muted text-xs font-medium">
            Duration: {duration}s
            <input
              type="range"
              min={2}
              max={60}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 block w-full"
            />
          </label>

          {/* Resolution */}
          <label className="text-text-muted text-xs font-medium">
            Resolution
            <select
              className="bg-surface border-border text-text mt-1 block w-full rounded border px-2 py-1.5 text-sm"
              value={resolution}
              onChange={(e) => setResolution(e.target.value as VideoResolution)}
            >
              <option value="720p">720p (1280 x 720)</option>
              <option value="1080p">1080p (1920 x 1080)</option>
              <option value="4k">4K (3840 x 2160)</option>
            </select>
          </label>

          <div className="text-text-muted text-xs">
            {res.width} x {res.height} @ {fps}fps — {Math.round(duration * fps)} frames
          </div>

          <button
            className="bg-accent mt-1 w-full rounded px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
            onClick={handleStart}
          >
            Start Recording
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-text text-sm font-medium">Recording...</div>
          <div className="bg-surface-hover h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-accent h-full transition-all duration-100"
              style={{ width: `${(progress * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="text-text-muted text-xs">
            Frame {frameCount} — {(progress * 100).toFixed(0)}%
          </div>
          <button
            className="border-border text-text-muted hover:text-text mt-1 w-full rounded border px-3 py-2 text-sm transition-colors"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      )}
    </Modal>
  );
}
