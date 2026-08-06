"use client";

import { useCallback, useMemo } from "react";
import { FileText, Clock, Hash, Sparkles } from "lucide-react";
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
          <div className="glass rounded-2xl p-10 text-center space-y-5 mesh-gradient-card border border-border/30 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/10 mx-auto border border-primary/15 relative z-[1]">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <div className="relative z-[1]">
              <h3 className="font-semibold text-xl mb-2">Generate your script</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                AI will write a scroll-stopping script based on your research.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!state.idea}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all relative z-[1]"
            >
              <Sparkles className="w-4 h-4" />
              Generate Script
            </Button>
          </div>
        )}

        {showStreaming && (
          <JsonStreamingIndicator text={text} label="script" />
        )}

        {showCards && script && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Stats bar */}
            <div className="flex items-center gap-3 px-1">
              <Badge variant="outline" className="text-xs gap-1.5 border-primary/20 text-primary bg-primary/5">
                <Hash className="w-3 h-3" />
                {totalWords} words
              </Badge>
              <Badge variant="outline" className="text-xs gap-1.5 border-primary/20 text-primary bg-primary/5">
                <Clock className="w-3 h-3" />
                ~{totalSeconds.toFixed(0)}s
              </Badge>
              {script.segments && (
                <Badge variant="outline" className="text-xs gap-1 border-border/40 text-muted-foreground">
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
                    ? "text-rose-400"
                    : isCta
                      ? "text-cyan-400"
                      : "text-primary";
                  const dotColor = isHook
                    ? "bg-rose-400"
                    : isCta
                      ? "bg-cyan-400"
                      : "bg-primary";
                  const label = isHook ? "Hook" : isCta ? "Call to Action" : `Segment ${i + 1}`;
                  const borderClass = isHook
                    ? "border-rose-400/15"
                    : isCta
                      ? "border-cyan-400/15"
                      : "border-border/30";
                  const accentGradient = isHook
                    ? "from-rose-500/10 to-transparent"
                    : isCta
                      ? "from-cyan-500/10 to-transparent"
                      : "from-primary/5 to-transparent";

                  return (
                    <Card key={seg.shotId} className={`glass rounded-2xl p-6 ${borderClass} relative overflow-hidden`}>
                      <div className={`absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b ${accentGradient} pointer-events-none`} />
                      <div className="flex items-center justify-between mb-3 relative z-[1]">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-sm`} />
                          <span className={`text-xs font-semibold uppercase tracking-wider ${labelColor}`}>
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground gap-1">
                            <Hash className="w-2.5 h-2.5" />
                            {seg.wordCount}w
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {seg.estimatedSeconds.toFixed(1)}s
                          </Badge>
                        </div>
                      </div>
                      <p className="text-lg font-medium leading-relaxed relative z-[1]">
                        {renderWithEmphasis(seg.text, seg.emphasisWords)}
                      </p>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* Legacy 3-card view */
              <div className="space-y-4">
                <Card className="glass rounded-2xl p-6 border-rose-400/15 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-rose-500/8 to-transparent pointer-events-none" />
                  <div className="flex items-center gap-2.5 mb-3 relative z-[1]">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                      Hook
                    </span>
                  </div>
                  <p className="text-lg font-medium leading-relaxed relative z-[1]">{script.hook}</p>
                </Card>

                <Card className="glass rounded-2xl p-6 border-border/30">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Body
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {script.body}
                  </p>
                </Card>

                <Card className="glass rounded-2xl p-6 border-cyan-400/15 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-cyan-500/8 to-transparent pointer-events-none" />
                  <div className="flex items-center gap-2.5 mb-3 relative z-[1]">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-sm" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Call to Action
                    </span>
                  </div>
                  <p className="font-medium relative z-[1]">{script.cta}</p>
                </Card>
              </div>
            )}
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
