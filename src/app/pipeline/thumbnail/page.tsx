"use client";

import { useState } from "react";
import { ImageIcon, Loader2, Check, VideoIcon } from "lucide-react";
import { StageWrapper } from "@/components/shared/stage-wrapper";
import { RegenerateButton } from "@/components/shared/regenerate-button";
import { ApiKeyInput, useApiKey } from "@/components/shared/api-key-input";
import { usePipeline } from "@/hooks/use-pipeline";
import { getAllClips } from "@/lib/media-db";
import { captureFramesFromClips } from "@/lib/frame-capture";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  renderThumbnailToDataUrl,
  type ThumbnailDesign,
} from "@/lib/thumbnail-renderer";
import type { ThumbnailOption } from "@/lib/types";

export default function ThumbnailPage() {
  const { state, dispatch } = usePipeline();
  const { apiKey, saveKey } = useApiKey();
  const [thumbnails, setThumbnails] = useState<ThumbnailOption[]>(
    state.thumbnail?.options ?? []
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    state.thumbnail?.selectedId ?? null
  );
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasContent = thumbnails.length > 0;

  async function handleGenerate() {
    if (!state.idea || !apiKey) return;
    setLoading(true);
    setError(null);

    try {
      // Step 1: Capture frames from video clips
      setLoadingStatus("Capturing video frames...");
      let frames: string[] = capturedFrames;

      if (frames.length === 0) {
        const allClips = await getAllClips();
        if (allClips.length > 0) {
          frames = await captureFramesFromClips(
            allClips.map((c) => ({ blob: c.blob, duration: c.duration })),
            1 // 1 frame per clip
          );
          setCapturedFrames(frames);
        }
      }

      // Step 2: Send to AI with frame context
      setLoadingStatus("AI designing thumbnails...");
      const res = await fetch("/api/ai/thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: state.idea.topic,
          hook: state.script?.hook ?? "",
          tone: state.idea.tone,
          apiKey,
          frames: frames.slice(0, 3), // Send up to 3 frames
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // Step 3: Render designs to canvas, compositing a captured frame as background
      setLoadingStatus("Rendering thumbnails...");
      const rendered: ThumbnailOption[] = (
        data.thumbnails as ThumbnailDesign[]
      ).map((design, i) => ({
        id: `thumb-${i + 1}`,
        src: renderThumbnailToDataUrl(design, frames[i % frames.length]),
        label: design.style,
      }));

      setThumbnails(rendered);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    dispatch({
      type: "SET_THUMBNAIL",
      data: { options: thumbnails, selectedId: id },
    });
  }

  return (
    <StageWrapper
      stage="thumbnail"
      nextDisabled={!state.thumbnail}
      actions={
        hasContent ? (
          <RegenerateButton onClick={handleGenerate} isLoading={loading} />
        ) : undefined
      }
    >
      <div className="space-y-6 max-w-3xl">
        <ApiKeyInput apiKey={apiKey} onChange={saveKey} />

        {!hasContent && !loading && (
          <div className="glass rounded-2xl p-8 text-center space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto">
              <ImageIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Generate thumbnails</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI captures frames from your video clips and designs 3 thumbnail
                covers using them.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!apiKey || !state.idea}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              <VideoIcon className="w-4 h-4 mr-2" />
              Generate Thumbnails
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {loadingStatus}
            </span>
          </div>
        )}

        {/* Frame previews */}
        {capturedFrames.length > 0 && !loading && (
          <div className="glass rounded-xl p-3 border border-border/50">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">
              Captured frames used
            </span>
            <div className="flex gap-2 overflow-x-auto">
              {capturedFrames.slice(0, 4).map((frame, i) => (
                <img
                  key={i}
                  src={frame}
                  alt={`Frame ${i + 1}`}
                  className="w-16 h-28 rounded-lg object-cover border border-border/30"
                />
              ))}
            </div>
          </div>
        )}

        {hasContent && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {thumbnails.map((thumb) => (
              <Card
                key={thumb.id}
                onClick={() => handleSelect(thumb.id)}
                className={`glass rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${
                  selectedId === thumb.id
                    ? "border-primary glow-purple"
                    : "border-transparent hover:border-border/50"
                }`}
              >
                <div className="aspect-[9/16] bg-muted relative">
                  {thumb.src ? (
                    <img
                      src={thumb.src}
                      alt={thumb.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-center p-4">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  {selectedId === thumb.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <span className="text-xs font-medium">{thumb.label}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </StageWrapper>
  );
}
