"use client";

import { useCallback, useMemo, useState } from "react";
import { MessageSquare, Hash, Sparkles } from "lucide-react";
import { StageWrapper } from "@/components/shared/stage-wrapper";
import { JsonStreamingIndicator } from "@/components/shared/json-streaming-indicator";
import { RegenerateButton } from "@/components/shared/regenerate-button";
import { CopyButton } from "@/components/shared/copy-button";
import { useAiStream } from "@/hooks/use-ai-stream";
import { usePipeline } from "@/hooks/use-pipeline";
import { TONE_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function parseCaption(text: string) {
  try {
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const json = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(json);
    if (parsed.caption && parsed.hashtags) return parsed;
    return null;
  } catch {
    return null;
  }
}

export default function CaptionPage() {
  const { state, dispatch } = usePipeline();
  const [editedCaption, setEditedCaption] = useState<string | null>(null);

  const onComplete = useCallback(
    (rawText: string) => {
      const parsed = parseCaption(rawText);
      if (parsed) {
        dispatch({
          type: "SET_CAPTION",
          data: { caption: parsed.caption, hashtags: parsed.hashtags },
        });
      }
    },
    [dispatch]
  );

  const streamOptions = useMemo(() => ({ onComplete }), [onComplete]);
  const { text, isStreaming, error, generate } = useAiStream(streamOptions);

  const parsedLive = text ? parseCaption(text) : null;
  const captionData = parsedLive || state.caption;

  const showCards = !!captionData && !isStreaming;
  const showStreaming = isStreaming;
  const showEmpty = !captionData && !isStreaming && !text;

  const displayCaption = editedCaption ?? captionData?.caption ?? "";

  function handleGenerate() {
    if (!state.idea || !state.script) return;
    setEditedCaption(null);
    const toneModifier = TONE_CONFIG[state.idea.tone].promptModifier;
    generate("/api/ai/caption", {
      topic: state.idea.topic,
      script: {
        hook: state.script.hook,
        body: state.script.body,
        cta: state.script.cta,
      },
      toneModifier,
    });
  }

  const hashtagText = captionData?.hashtags
    ? captionData.hashtags.map((h: string) => `#${h}`).join(" ")
    : "";

  const fullCopyText = `${displayCaption}\n\n${hashtagText}`;

  return (
    <StageWrapper
      stage="caption"
      nextDisabled={!state.caption}
      actions={
        captionData ? (
          <div className="flex gap-2">
            <CopyButton text={fullCopyText} />
            <RegenerateButton onClick={handleGenerate} isLoading={isStreaming} />
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6 max-w-3xl">
        {showEmpty && (
          <div className="glass rounded-2xl p-10 text-center space-y-5 mesh-gradient-card border border-border/30 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/10 mx-auto border border-orange-500/15 relative z-[1]">
              <MessageSquare className="w-7 h-7 text-orange-400" />
            </div>
            <div className="relative z-[1]">
              <h3 className="font-semibold text-xl mb-2">Write your caption</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                AI will craft an engaging caption with hashtags for your reel.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!state.script}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all relative z-[1]"
            >
              <Sparkles className="w-4 h-4" />
              Generate Caption
            </Button>
          </div>
        )}

        {showStreaming && (
          <JsonStreamingIndicator text={text} label="caption" />
        )}

        {showCards && captionData && (
          <div className="space-y-4 animate-fade-in-up">
            <Card className="glass rounded-2xl p-6 border-border/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-accent to-primary" />
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Caption
                </span>
                <span className="text-[10px] text-muted-foreground/60 ml-auto">
                  Click to edit
                </span>
              </div>
              <Textarea
                value={displayCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={8}
                className="bg-transparent border-0 p-0 text-foreground leading-relaxed resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              />
            </Card>

            <Card className="glass rounded-2xl p-6 border-border/30">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Hashtags
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {captionData.hashtags.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs border-accent/20 text-accent bg-accent/5 px-3 py-1"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </Card>
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
