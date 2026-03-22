"use client";

import { useCallback, useMemo } from "react";
import { FileText, Clock, Hash } from "lucide-react";
import { StageWrapper } from "@/components/shared/stage-wrapper";
import { JsonStreamingIndicator } from "@/components/shared/json-streaming-indicator";
import { RegenerateButton } from "@/components/shared/regenerate-button";
import { CopyButton } from "@/components/shared/copy-button";
import { useAiStream } from "@/hooks/use-ai-stream";
import { usePipeline } from "@/hooks/use-pipeline";
import { TONE_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScriptSegment } from "@/lib/types";

function parseScript(text: string) {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const json = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(json);
    if (parsed.hook && parsed.body && parsed.cta) return parsed;
    return null;
  } catch {
    return null;
  }
}

export default function ScriptPage() {
  const { state, dispatch } = usePipeline();

  const onComplete = useCallback(
    (rawText: string) => {
      const parsed = parseScript(rawText);
      if (parsed) {
        // Reconstruct body from segments if segments exist but body is missing
        const body =
          parsed.body ||
          (parsed.segments
            ? parsed.segments.map((s: ScriptSegment) => s.text).join(" ")
            : "");

        dispatch({
          type: "SET_SCRIPT",
          data: {
            hook: parsed.hook,
            body,
            cta: parsed.cta,
            fullText: `${parsed.hook}\n\n${body}\n\n${parsed.cta}`,
            segments: parsed.segments ?? undefined,
          },
        });
      }
    },
    [dispatch]
  );

  const streamOptions = useMemo(() => ({ onComplete }), [onComplete]);
  const { text, isStreaming, error, generate } = useAiStream(streamOptions);

  const parsedLive = text ? parseScript(text) : null;
  const script = parsedLive || state.script;

  const showCards = !!script && !isStreaming;
  const showStreaming = isStreaming;
  const showEmpty = !script && !isStreaming && !text;

  function handleGenerate() {
    if (!state.idea) return;
    const toneModifier = TONE_CONFIG[state.idea.tone].promptModifier;
    generate("/api/ai/script", {
      topic: state.idea.topic,
      pov: state.idea.pov,
      research: state.research?.markdown ?? "",
      toneModifier,
    });
  }

  const fullText = script
    ? `${script.hook}\n\n${script.body}\n\n${script.cta}`
    : "";

  const totalWords = script?.segments
    ? script.segments.reduce((sum: number, s: ScriptSegment) => sum + s.wordCount, 0)
    : fullText.split(/\s+/).filter(Boolean).length;

  const totalSeconds = script?.segments
    ? script.segments.reduce((sum: number, s: ScriptSegment) => sum + s.estimatedSeconds, 0)
    : totalWords / 2.5;

  return (
    <StageWrapper
      stage="script"
      nextDisabled={!state.script}
      actions={
        script ? (
          <div className="flex gap-2">
            <CopyButton text={fullText} />
            <RegenerateButton onClick={handleGenerate} isLoading={isStreaming} />
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6 max-w-3xl">
        {showEmpty && (
          <div className="glass rounded-2xl p-8 text-center space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Generate your script</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI will write a scroll-stopping script based on your research.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!state.idea}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              Generate Script
            </Button>
          </div>
        )}

        {showStreaming && (
          <JsonStreamingIndicator text={text} label="script" />
        )}

        {showCards && script && (
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="flex items-center gap-3 px-1">
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                <Hash className="w-3 h-3" />
                {totalWords} words
              </Badge>
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                <Clock className="w-3 h-3" />
                ~{totalSeconds.toFixed(0)}s
              </Badge>
              {script.segments && (
                <Badge variant="outline" className="text-xs gap-1 border-border/50 text-muted-foreground">
                  {script.segments.length} segments
                </Badge>
              )}
            </div>

            {/* Segments view (if available) */}
            {script.segments && script.segments.length > 0 ? (
              <div className="space-y-3">
                {script.segments.map((seg: ScriptSegment, i: number) => {
                  const isHook = i === 0;
                  const isCta = i === script.segments!.length - 1;
                  const labelColor = isHook
                    ? "text-red-400"
                    : isCta
                      ? "text-cyan-400"
                      : "text-primary";
                  const dotColor = isHook
                    ? "bg-red-400"
                    : isCta
                      ? "bg-cyan-400"
                      : "bg-primary";
                  const label = isHook ? "Hook" : isCta ? "Call to Action" : `Segment ${i + 1}`;
                  const borderClass = isHook
                    ? "border-red-400/20"
                    : isCta
                      ? "border-cyan-400/20"
                      : "border-border/50";

                  return (
                    <Card key={seg.shotId} className={`glass rounded-2xl p-6 ${borderClass}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span className={`text-xs font-semibold uppercase tracking-wider ${labelColor}`}>
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground gap-1">
                            <Hash className="w-2.5 h-2.5" />
                            {seg.wordCount}w
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {seg.estimatedSeconds.toFixed(1)}s
                          </Badge>
                        </div>
                      </div>
                      <p className="text-lg font-medium leading-relaxed">
                        {renderWithEmphasis(seg.text, seg.emphasisWords)}
                      </p>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* Legacy 3-card view */
              <div className="space-y-4">
                <Card className="glass rounded-2xl p-6 border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                      Hook
                    </span>
                  </div>
                  <p className="text-lg font-medium leading-relaxed">{script.hook}</p>
                </Card>

                <Card className="glass rounded-2xl p-6 border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Body
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {script.body}
                  </p>
                </Card>

                <Card className="glass rounded-2xl p-6 border-accent/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Call to Action
                    </span>
                  </div>
                  <p className="font-medium">{script.cta}</p>
                </Card>
              </div>
            )}
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

/** Render text with emphasis words bolded in accent color */
function renderWithEmphasis(text: string, emphasisWords: string[]) {
  if (!emphasisWords || emphasisWords.length === 0) return text;
  const lowerEmphasis = emphasisWords.map((w) => w.toLowerCase());

  return text.split(/(\s+)/).map((part, i) => {
    const clean = part.replace(/[.,!?;:'"]/g, "").toLowerCase();
    if (lowerEmphasis.includes(clean)) {
      return (
        <span key={i} className="text-primary font-bold">
          {part}
        </span>
      );
    }
    return part;
  });
}
