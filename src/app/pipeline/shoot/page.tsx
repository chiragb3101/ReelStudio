"use client";

import { useState, useCallback, useRef } from "react";
import {
  Camera,
  Trash2,
  Check,
  Play,
  Clock,
  Upload,
  Mic,
} from "lucide-react";
import { StageWrapper } from "@/components/shared/stage-wrapper";
import { CameraModal } from "@/components/shared/camera-modal";
import { ClipUpload } from "@/components/shared/clip-upload";
import { VideoPopup } from "@/components/shared/video-popup";
import { useMediaStore } from "@/hooks/use-media-store";
import { usePipeline } from "@/hooks/use-pipeline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ClipTranscription } from "@/lib/types";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `0:${s.toString().padStart(2, "0")}`;
}

export default function ShootPage() {
  const { state, dispatch } = usePipeline();
  const { clips, addClip, removeClip } = useMediaStore();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [popupVideo, setPopupVideo] = useState<string | null>(null);
  const [fullVideoMode, setFullVideoMode] = useState(false);
  const fullVideoInputRef = useRef<HTMLInputElement>(null);

  // Store transcriptions in a ref alongside clips
  const transcriptionsRef = useRef<Record<string, ClipTranscription>>({});

  const shots = state.shotList?.shots ?? [];
  const filledCount = shots.filter((s) => clips[s.id]).length;
  const allFilled = shots.length > 0 && filledCount === shots.length;
  const progress = shots.length > 0 ? (filledCount / shots.length) * 100 : 0;
  const totalRecordedTime = Object.values(clips).reduce(
    (sum, c) => sum + (c.duration ?? 0),
    0
  );

  function handleRecord(shotId: string) {
    setActiveShotId(shotId);
    setCameraOpen(true);
  }

  function handleRecorded(blob: Blob, durationMs: number, transcription?: ClipTranscription) {
    if (activeShotId) {
      addClip(activeShotId, blob, "recorded", durationMs / 1000);
      if (transcription) {
        transcriptionsRef.current[activeShotId] = transcription;
      }
    }
    setCameraOpen(false);
    setActiveShotId(null);
  }

  function handleUpload(shotId: string, file: File) {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      addClip(shotId, file, "uploaded", video.duration);
    };
    video.src = URL.createObjectURL(file);
  }

  function handleFullVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      // Store as a single clip covering all shots
      for (const shot of shots) {
        addClip(shot.id, file, "uploaded", video.duration / shots.length);
      }
    };
    video.src = URL.createObjectURL(file);
  }

  const handleNext = useCallback(() => {
    if (!allFilled) return;
    dispatch({
      type: "SET_SHOOT",
      data: { clips: {} }, // Actual blobs are in IndexedDB
    });
  }, [allFilled, dispatch]);

  // Find segment for active shot
  const activeSegment = activeShotId && state.script?.segments
    ? state.script.segments.find((s) => s.shotId === activeShotId)
    : undefined;

  return (
    <StageWrapper
      stage="shoot"
      nextDisabled={!allFilled}
      onNext={handleNext}
    >
      <div className="space-y-6 max-w-3xl">
        {/* Progress */}
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {filledCount} of {shots.length} shots filmed
            </span>
            <div className="flex items-center gap-3">
              {totalRecordedTime > 0 && (
                <span className="text-xs text-primary font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(totalRecordedTime)} total
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Full video upload option */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fullVideoInputRef.current?.click()}
            className="gap-1.5 rounded-lg flex-1"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Full Video
          </Button>
          <input
            ref={fullVideoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFullVideoUpload}
          />
        </div>

        {shots.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">
              No shot list available. Complete the Shot List stage first.
            </p>
          </div>
        )}

        {/* Shot cards */}
        <div className="space-y-3">
          {shots.map((shot, i) => {
            const clip = clips[shot.id];
            const isFilled = !!clip;
            const hasTranscription = !!transcriptionsRef.current[shot.id];

            return (
              <Card
                key={shot.id}
                className={`glass rounded-xl border transition-colors ${
                  isFilled ? "border-primary/30" : "border-border/50"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          isFilled
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isFilled ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-sm">
                          {shot.description}
                        </span>
                        <div className="flex gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-border/50"
                          >
                            {typeof shot.duration === "number" ? `${shot.duration.toFixed(1)}s` : shot.duration}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-border/50"
                          >
                            {shot.angle}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Script text preview */}
                  {shot.scriptText && (
                    <p className="text-xs text-muted-foreground mb-3 px-2 py-1.5 rounded-lg bg-muted/30 italic">
                      &ldquo;{shot.scriptText}&rdquo;
                    </p>
                  )}

                  {/* Clip preview or actions */}
                  {clip ? (
                    <div className="flex items-center gap-3">
                      <div
                        className="relative w-24 h-14 rounded-lg overflow-hidden bg-muted cursor-pointer group"
                        onClick={() => setPopupVideo(clip.blobUrl)}
                      >
                        <video
                          src={clip.blobUrl}
                          className="w-full h-full object-cover"
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                          <Play className="w-4 h-4 text-white" />
                        </div>
                        {clip.duration != null && (
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                            {formatDuration(clip.duration)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/30 text-primary"
                          >
                            {clip.type === "recorded" ? "Recorded" : "Uploaded"}
                          </Badge>
                          {clip.duration != null && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border/50 text-muted-foreground gap-1"
                            >
                              <Clock className="w-2.5 h-2.5" />
                              {formatDuration(clip.duration)}
                            </Badge>
                          )}
                          {hasTranscription && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-green-500/30 text-green-400 gap-1"
                            >
                              <Mic className="w-2.5 h-2.5" />
                              Transcribed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeClip(shot.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRecord(shot.id)}
                        className="gap-1.5 rounded-lg bg-primary hover:bg-primary/90 flex-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Record
                      </Button>
                      <ClipUpload
                        onUpload={(file) => handleUpload(shot.id, file)}
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onRecorded={handleRecorded}
        prompter={
          activeShotId
            ? {
                shot: shots.find((s) => s.id === activeShotId)!,
                shotIndex: shots.findIndex((s) => s.id === activeShotId),
                totalShots: shots.length,
                scriptHook: state.script?.hook ?? "",
                scriptBody: state.script?.body ?? "",
                scriptCta: state.script?.cta ?? "",
                segment: activeSegment,
              }
            : undefined
        }
      />

      <VideoPopup
        src={popupVideo ?? ""}
        open={!!popupVideo}
        onClose={() => setPopupVideo(null)}
      />
    </StageWrapper>
  );
}
