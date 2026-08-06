"use client";

import { useState } from "react";
import { ImageIcon, Loader2, Check, Sparkles } from "lucide-react";
import { StageWrapper } from "@/components/shared/stage-wrapper";
import { RegenerateButton } from "@/components/shared/regenerate-button";
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
    if (!state.idea) return;
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
          frames: frames.slice(0, 3),
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
        {!hasContent && !loading && (
          <div className="glass rounded-2xl p-10 text-center space-y-5 mesh-gradient-card border border-border/30 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 mx-auto border border-amber-500/15 relative z-[1]">
              <ImageIcon className="w-7 h-7 text-amber-400" />
            </div>
            <div className="relative z-[1]">
              <h3 className="font-semibold text-xl mb-2">Generate thumbnails</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                AI captures frames from your video clips and designs 3 thumbnail
                covers using them.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!state.idea}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all relative z-[1]"
            >
              <Sparkles className="w-4 h-4" />
              Generate Thumbnails
            </Button>
          </div>
        )}

        {loading && (
          <div className="glass rounded-2xl p-12 border border-border/30 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              {loadingStatus}
            </span>
          </div>
        )}

        {/* Frame previews */}
        {capturedFrames.length > 0 && !loading && (
          <div className="glass rounded-xl p-4 border border-border/30">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2.5 block">
              Captured frames used
            </span>
            <div className="flex gap-2 overflow-x-auto">
              {capturedFrames.slice(0, 4).map((frame, i) => (
                <img
                  key={i}
                  src={frame}
                  alt={`Frame ${i + 1}`}
                  className="w-16 h-28 rounded-xl object-cover border border-border/20"
                />
              ))}
            </div>
          </div>
        )}

        {hasContent && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
            {thumbnails.map((thumb) => (
              <Card
                key={thumb.id}
                onClick={() => handleSelect(thumb.id)}
                className={`glass rounded-2xl overflow-hidden cursor-pointer transition-all border-2 card-hover ${
                  selectedId === thumb.id
                    ? "border-primary glow-purple"
                    : "border-transparent hover:border-border/30"
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
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <span className="text-xs font-semibold">{thumb.label}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-fade-in-up">
            {error}
          </div>
        )}
      </div>
    </StageWrapper>
  );
}
