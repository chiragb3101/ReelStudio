"use client";

import { useCallback, useMemo } from "react";
import { Search } from "lucide-react";
import { StageWrapper } from "@/components/shared/stage-wrapper";
import { StreamingText } from "@/components/shared/streaming-text";
import { RegenerateButton } from "@/components/shared/regenerate-button";
import { CopyButton } from "@/components/shared/copy-button";
import { useAiStream } from "@/hooks/use-ai-stream";
import { usePipeline } from "@/hooks/use-pipeline";
import { Button } from "@/components/ui/button";

export default function ResearchPage() {
  const { state, dispatch } = usePipeline();

  const onComplete = useCallback(
    (markdown: string) => {
      dispatch({ type: "SET_RESEARCH", data: { markdown } });
    },
    [dispatch]
  );

  const streamOptions = useMemo(() => ({ onComplete }), [onComplete]);
  const { text, isStreaming, error, generate } = useAiStream(streamOptions);

  const displayText = text || state.research?.markdown || "";
  const hasContent = displayText.length > 0;

  function handleGenerate() {
    if (!state.idea) return;
    generate("/api/ai/research", {
      topic: state.idea.topic,
      pov: state.idea.pov,
    });
  }

  return (
    <StageWrapper
      stage="research"
      nextDisabled={!state.research}
      actions={
        hasContent ? (
          <div className="flex gap-2">
            <CopyButton text={displayText} />
            <RegenerateButton onClick={handleGenerate} isLoading={isStreaming} />
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6 max-w-3xl">
        {!hasContent && !isStreaming && (
          <div className="glass rounded-2xl p-8 text-center space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Research your topic</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI will research &quot;{state.idea?.topic}&quot; and provide insights for
                your reel.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!state.idea}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              Generate Research
            </Button>
          </div>
        )}

        {(hasContent || isStreaming) && (
          <div className="glass rounded-2xl p-6 border border-border/50">
            <StreamingText text={displayText} isStreaming={isStreaming} />
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
