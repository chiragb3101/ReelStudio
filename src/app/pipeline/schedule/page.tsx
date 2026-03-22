"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Copy,
  Download,
  Check,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { StageWrapper } from "@/components/shared/stage-wrapper";
import { CopyButton } from "@/components/shared/copy-button";
import { usePipeline } from "@/hooks/use-pipeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function SchedulePage() {
  const { state, dispatch } = usePipeline();
  const router = useRouter();
  const [bufferToken, setBufferToken] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const caption = state.caption?.caption ?? "";
  const hashtags = state.caption?.hashtags ?? [];
  const fullCaption = `${caption}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;

  async function handleSchedule() {
    if (!bufferToken) {
      setError("Please enter your Buffer access token");
      return;
    }

    setScheduling(true);
    setError(null);

    try {
      const scheduledAt = scheduleDate
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : undefined;

      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: bufferToken,
          profile_ids: [],
          text: fullCaption,
          scheduled_at: scheduledAt,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setScheduled(true);
      dispatch({
        type: "SET_SCHEDULE",
        data: {
          scheduledAt: scheduledAt ?? null,
          platform: "instagram",
          status: "scheduled",
        },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScheduling(false);
    }
  }

  function handleNewReel() {
    dispatch({ type: "RESET" });
    router.push("/pipeline/idea");
  }

  if (scheduled) {
    return (
      <StageWrapper stage="schedule">
        <div className="max-w-lg mx-auto text-center space-y-6 py-12">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mx-auto">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold">Reel Scheduled!</h2>
          <p className="text-muted-foreground">
            Your reel has been scheduled via Buffer. Check your Buffer dashboard
            for details.
          </p>
          <Button
            onClick={handleNewReel}
            size="lg"
            className="rounded-xl bg-primary hover:bg-primary/90 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Start New Reel
          </Button>
        </div>
      </StageWrapper>
    );
  }

  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);

  // Build an object URL for the rendered blob once
  useEffect(() => {
    const blob = state.edit?.renderedVideoBlob;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setVideoObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [state.edit?.renderedVideoBlob]);

  return (
    <StageWrapper stage="schedule">
      <div className="space-y-6 max-w-2xl">
        {/* Final video preview */}
        {videoObjectUrl && (
          <Card className="glass rounded-2xl overflow-hidden border-border/50">
            <video
              src={videoObjectUrl}
              controls
              playsInline
              className="w-full max-h-[480px] object-contain bg-black"
            />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Final Reel</span>
              <a
                href={videoObjectUrl}
                download="reel.mp4"
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"
              >
                <Download className="w-3.5 h-3.5" />
                Download MP4
              </a>
            </div>
          </Card>
        )}

        {/* Caption preview */}
        <Card className="glass rounded-2xl p-6 border-border/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Caption Preview
            </span>
            <CopyButton text={fullCaption} />
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {caption}
          </p>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {hashtags.map((h) => (
                <Badge
                  key={h}
                  variant="outline"
                  className="text-[10px] border-accent/30 text-accent"
                >
                  #{h}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Buffer scheduling */}
        <Card className="glass rounded-2xl p-6 border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-semibold">Schedule via Buffer</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Buffer Access Token
              </Label>
              <Input
                type="password"
                value={bufferToken}
                onChange={(e) => setBufferToken(e.target.value)}
                placeholder="Enter your Buffer access token"
                className="h-9 rounded-lg bg-background/50 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="h-9 rounded-lg bg-background/50 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Time</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="h-9 rounded-lg bg-background/50 text-sm"
                />
              </div>
            </div>

            <Button
              onClick={handleSchedule}
              disabled={scheduling}
              className="w-full rounded-xl bg-primary hover:bg-primary/90"
            >
              {scheduling ? "Scheduling..." : "Schedule Post"}
            </Button>
          </div>
        </Card>

        {/* Manual fallback */}
        <Card className="glass rounded-2xl p-6 border-border/50 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Or post manually
          </span>
          <div className="flex gap-2">
            <CopyButton text={fullCaption} />
            {state.edit?.renderedVideoBlob && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-lg border-border/50"
                onClick={() => {
                  const url = URL.createObjectURL(state.edit!.renderedVideoBlob!);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "reel.mp4";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Download Video
              </Button>
            )}
          </div>
        </Card>

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </StageWrapper>
  );
}
