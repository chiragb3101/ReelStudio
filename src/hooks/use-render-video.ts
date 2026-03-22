"use client";

import { useState, useCallback } from "react";
import type { ReelEditSpec } from "@/lib/types";

interface RenderState {
  isRendering: boolean;
  progress: number;
  progressLabel: string;
  error: string | null;
  videoUrl: string | null;
}

interface RenderOptions {
  editSpec: ReelEditSpec;
  /** Map of clipId → Blob (from IndexedDB) */
  clipBlobs: Record<string, Blob>;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function useRenderVideo() {
  const [renderState, setRenderState] = useState<RenderState>({
    isRendering: false,
    progress: 0,
    progressLabel: "",
    error: null,
    videoUrl: null,
  });

  const render = useCallback(async (options: RenderOptions) => {
    const { editSpec, clipBlobs } = options;

    setRenderState({ isRendering: true, progress: 0, progressLabel: "Uploading clips...", error: null, videoUrl: null });

    try {
      // ── Step 1: Upload clips to server ──
      const clipTokens: Record<string, string> = {};
      const clipEntries = Object.entries(clipBlobs);

      for (let i = 0; i < clipEntries.length; i++) {
        const [clipId, blob] = clipEntries[i];
        setRenderState((prev) => ({
          ...prev,
          progress: Math.round((i / clipEntries.length) * 30),
          progressLabel: `Uploading clip ${i + 1}/${clipEntries.length}...`,
        }));

        const res = await fetch(`/api/render/upload?clipId=${encodeURIComponent(clipId)}`, {
          method: "POST",
          headers: { "Content-Type": blob.type || "video/mp4" },
          body: blob,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error || `Upload failed: ${res.status}`);
        }

        const { token } = await res.json();
        clipTokens[clipId] = token;
      }

      // ── Step 2: Start render job ──
      setRenderState((prev) => ({ ...prev, progress: 35, progressLabel: "Starting render..." }));

      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editSpec, clipTokens }),
      });

      if (!renderRes.ok) {
        const err = await renderRes.json().catch(() => ({ error: "Render failed" }));
        throw new Error(err.error || `Render failed: ${renderRes.status}`);
      }

      const { jobId } = await renderRes.json();

      // ── Step 3: Poll for completion ──
      setRenderState((prev) => ({ ...prev, progress: 40, progressLabel: "Rendering reel..." }));

      const startedAt = Date.now();
      while (true) {
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          throw new Error("Render timed out after 10 minutes");
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const statusRes = await fetch(`/api/render/status?jobId=${jobId}`);
        if (!statusRes.ok) throw new Error("Failed to check render status");

        const { status, error, videoReady } = await statusRes.json();

        if (status === "error") throw new Error(error || "Render failed");

        if (status === "done" && videoReady) {
          setRenderState((prev) => ({ ...prev, progress: 90, progressLabel: "Downloading video..." }));

          // ── Step 4: Download rendered video ──
          const videoRes = await fetch(`/api/render/video?jobId=${jobId}`);
          if (!videoRes.ok) throw new Error("Failed to download rendered video");

          const blob = await videoRes.blob();
          const url = URL.createObjectURL(blob);

          setRenderState((prev) => {
            if (prev.videoUrl) URL.revokeObjectURL(prev.videoUrl);
            return { isRendering: false, progress: 100, progressLabel: "Done!", error: null, videoUrl: url };
          });
          return;
        }

        // Update progress estimate (40–85% during render)
        const elapsed = Date.now() - startedAt;
        const estimatedDuration = 90000; // ~90s estimate
        const renderProgress = Math.min(85, 40 + Math.round((elapsed / estimatedDuration) * 45));
        setRenderState((prev) => ({ ...prev, progress: renderProgress }));
      }
    } catch (err) {
      setRenderState((prev) => ({
        ...prev,
        isRendering: false,
        error: (err as Error).message,
        progressLabel: "",
      }));
    }
  }, []);

  const downloadVideo = useCallback(() => {
    if (renderState.videoUrl) {
      const a = document.createElement("a");
      a.href = renderState.videoUrl;
      a.download = "reel.mp4";
      a.click();
    }
  }, [renderState.videoUrl]);

  return { ...renderState, render, downloadVideo };
}
