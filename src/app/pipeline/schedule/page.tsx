"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  Check,
  RotateCcw,
  PartyPopper,
  Send,
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
        <div className="max-w-lg mx-auto text-center space-y-6 py-16 animate-fade-in-up">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 mx-auto border border-green-500/15 shadow-lg shadow-green-500/10">
            <PartyPopper className="w-9 h-9 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold gradient-text">Reel Scheduled!</h2>
          <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Your reel has been scheduled via Buffer. Check your Buffer dashboard
            for details.
          </p>
          <Button
            onClick={handleNewReel}
            size="lg"
            className="rounded-xl bg-primary hover:bg-primary/90 gap-2.5 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all"
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
          <Card className="glass rounded-2xl overflow-hidden border-border/30 animate-scale-in">
            <video
              src={videoObjectUrl}
              controls
              playsInline
              className="w-full max-h-[480px] object-contain bg-black"
            />
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/20">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Final Reel</span>
              <a
                href={videoObjectUrl}
                download="reel.mp4"
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download MP4
              </a>
            </div>
          </Card>
        )}

        {/* Caption preview */}
        <Card className="glass rounded-2xl p-6 border-border/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Caption Preview
            </span>
            <CopyButton text={fullCaption} />
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {caption}
          </p>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {hashtags.map((h) => (
                <Badge
                  key={h}
                  variant="outline"
                  className="text-[10px] border-accent/20 text-accent bg-accent/5"
                >
                  #{h}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Buffer scheduling */}
        <Card className="glass rounded-2xl p-6 border-border/30 space-y-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500/30 to-blue-500/30" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center border border-primary/15">
              <Calendar className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="font-semibold">Schedule via Buffer</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Buffer Access Token
              </Label>
              <Input
                type="password"
                value={bufferToken}
                onChange={(e) => setBufferToken(e.target.value)}
                placeholder="Enter your Buffer access token"
                className="h-10 rounded-xl bg-background/50 text-sm border-border/30 focus:border-primary/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="h-10 rounded-xl bg-background/50 text-sm border-border/30 focus:border-primary/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="h-10 rounded-xl bg-background/50 text-sm border-border/30 focus:border-primary/40"
                />
              </div>
            </div>

            <Button
              onClick={handleSchedule}
              disabled={scheduling}
              className="w-full rounded-xl bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all h-10"
            >
              <Send className="w-4 h-4" />
              {scheduling ? "Scheduling..." : "Schedule Post"}
            </Button>
          </div>
        </Card>

        {/* Manual fallback */}
        <Card className="glass rounded-2xl p-6 border-border/30 border-dashed space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Or post manually
          </span>
          <div className="flex gap-2">
            <CopyButton text={fullCaption} />
            {state.edit?.renderedVideoBlob && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl border-border/30 hover:border-primary/30 hover:bg-primary/5"
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
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-fade-in-up">
            {error}
          </div>
        )}
      </div>
    </StageWrapper>
  );
}
