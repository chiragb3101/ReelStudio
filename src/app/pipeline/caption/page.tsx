"use client";

import { useCallback, useMemo, useState } from "react";
import { MessageSquare, Hash } from "lucide-react";
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
          <div className="glass rounded-2xl p-8 text-center space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Write your caption</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI will craft an engaging caption with hashtags for your reel.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!state.script}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              Generate Caption
            </Button>
          </div>
        )}

        {showStreaming && (
          <JsonStreamingIndicator text={text} label="caption" />
        )}

        {showCards && captionData && (
          <div className="space-y-4">
            <Card className="glass rounded-2xl p-6 border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Caption
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  Click to edit
                </span>
              </div>
              <Textarea
                value={displayCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={8}
                className="bg-transparent border-0 p-0 text-foreground leading-relaxed resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </Card>

            <Card className="glass rounded-2xl p-6 border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Hashtags
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {captionData.hashtags.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs border-accent/30 text-accent"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </Card>
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
