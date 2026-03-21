"use client";

import { useState, useCallback } from "react";

interface RenderState {
  isRendering: boolean;
  progress: number;
  error: string | null;
  videoUrl: string | null;
}

export function useRenderVideo() {
  const [renderState, setRenderState] = useState<RenderState>({
    isRendering: false,
    progress: 0,
    error: null,
    videoUrl: null,
  });

  const render = useCallback(async () => {
    setRenderState({
      isRendering: true,
      progress: 0,
      error: null,
      videoUrl: null,
    });

    try {
      // WebCodecs-based rendering
      // The @remotion/webcodecs API uses convertMedia, not renderMedia
      setRenderState((prev) => ({ ...prev, progress: 50 }));

      // For MVP, guide users to use the preview player
      // Full WebCodecs rendering requires additional setup with convertMedia
      setRenderState({
        isRendering: false,
        progress: 100,
        error: null,
        videoUrl: null,
      });
    } catch (err) {
      setRenderState((prev) => ({
        ...prev,
        isRendering: false,
        error: (err as Error).message,
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
