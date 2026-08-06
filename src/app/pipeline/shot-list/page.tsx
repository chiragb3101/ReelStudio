"use client";

import { useCallback, useMemo } from "react";
import { ListVideo, Camera, Clock, Clapperboard, FileText, Hash, Sparkles } from "lucide-react";
import { StageWrapper } from "@/components/shared/stage-wrapper";
import { JsonStreamingIndicator } from "@/components/shared/json-streaming-indicator";
import { RegenerateButton } from "@/components/shared/regenerate-button";
import { CopyButton } from "@/components/shared/copy-button";
import { useAiStream } from "@/hooks/use-ai-stream";
import { usePipeline } from "@/hooks/use-pipeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ShotItem } from "@/lib/types";

function parseShotList(text: string) {
  try {
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const json = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(json);
    if (parsed.shots && Array.isArray(parsed.shots)) {
      // Ensure duration is numeric
      for (const shot of parsed.shots) {
        if (typeof shot.duration === "string") {
          const num = parseFloat(shot.duration);
          shot.duration = isNaN(num) ? 4 : num;
        }
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export default function ShotListPage() {
  const { state, dispatch } = usePipeline();

  const onComplete = useCallback(
    (rawText: string) => {
      const parsed = parseShotList(rawText);
      if (parsed) {
        dispatch({ type: "SET_SHOT_LIST", data: { shots: parsed.shots } });
      }
    },
    [dispatch]
  );

  const streamOptions = useMemo(() => ({ onComplete }), [onComplete]);
  const { text, isStreaming, error, generate } = useAiStream(streamOptions);

  const parsedLive = text ? parseShotList(text) : null;
  const shots = parsedLive?.shots || state.shotList?.shots;

  const showCards = !!shots && !isStreaming;
  const showStreaming = isStreaming;
  const showEmpty = !shots && !isStreaming && !text;

  function handleGenerate() {
    if (!state.idea || !state.script) return;
    generate("/api/ai/shot-list", {
      topic: state.idea.topic,
      script: {
        hook: state.script.hook,
        body: state.script.body,
        cta: state.script.cta,
      },
      segments: state.script.segments ?? undefined,
    });
  }

  const totalDuration = shots
    ? shots.reduce((sum: number, s: ShotItem) => sum + (typeof s.duration === "number" ? s.duration : 0), 0)
    : 0;

  const copyText = shots
    ? shots
        .map(
          (s: ShotItem, i: number) =>
            `Shot ${i + 1}: ${s.description} (${s.duration}s, ${s.angle})\nScript: ${s.scriptText || "N/A"}\nNotes: ${s.notes}`
        )
        .join("\n\n")
    : "";

  return (
    <StageWrapper
      stage="shot-list"
      nextDisabled={!state.shotList}
      actions={
        shots ? (
          <div className="flex gap-2">
            <CopyButton text={copyText} />
            <RegenerateButton onClick={handleGenerate} isLoading={isStreaming} />
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6 max-w-3xl">
        {showEmpty && (
          <div className="glass rounded-2xl p-10 text-center space-y-5 mesh-gradient-card border border-border/30 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 mx-auto border border-cyan-500/15 relative z-[1]">
              <ListVideo className="w-7 h-7 text-cyan-400" />
            </div>
            <div className="relative z-[1]">
              <h3 className="font-semibold text-xl mb-2">Plan your shots</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                AI will create a detailed shot-by-shot plan for your reel.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!state.script}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all relative z-[1]"
            >
              <Sparkles className="w-4 h-4" />
              Generate Shot List
            </Button>
          </div>
        )}

        {showStreaming && (
          <JsonStreamingIndicator text={text} label="shot list" />
        )}

        {showCards && shots && (
          <div className="space-y-3 animate-fade-in-up">
            {/* Total duration bar */}
            <div className="flex items-center gap-2 px-1">
              <Badge variant="outline" className="text-xs gap-1.5 border-primary/20 text-primary bg-primary/5">
                <Clock className="w-3 h-3" />
                {totalDuration.toFixed(1)}s total
              </Badge>
              <Badge variant="outline" className="text-xs gap-1 border-border/40 text-muted-foreground">
                {shots.length} shots
              </Badge>
            </div>

            {shots.map((shot: ShotItem, i: number) => (
              <Card
                key={shot.id}
                className="glass rounded-2xl p-5 border-border/30 hover:border-primary/20 transition-all card-hover relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/40 to-transparent rounded-l-2xl" />
                <div className="flex items-start justify-between mb-3 pl-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/15">
                      {i + 1}
                    </div>
                    <span className="font-semibold">{shot.description}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3 pl-2">
                  <Badge
                    variant="outline"
                    className="text-xs gap-1 border-border/30"
                  >
                    <Clock className="w-3 h-3" />
                    {typeof shot.duration === "number" ? `${shot.duration.toFixed(1)}s` : shot.duration}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs gap-1 border-border/30"
                  >
                    <Camera className="w-3 h-3" />
                    {shot.angle}
                  </Badge>
                  {shot.wordCount && (
                    <Badge
                      variant="outline"
                      className="text-xs gap-1 border-border/30"
                    >
                      <Hash className="w-3 h-3" />
                      {shot.wordCount}w
                    </Badge>
                  )}
                </div>

                {/* Script text for this shot */}
                {shot.scriptText && (
                  <div className="mb-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10 ml-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText className="w-3 h-3 text-primary/60" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">
                        Script
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {shot.scriptText}
                    </p>
                  </div>
                )}

                {shot.notes && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1.5 pl-2">
                    <Clapperboard className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {shot.notes}
                  </p>
                )}
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
