"use client";

import { useCallback, useMemo } from "react";
import { Search, Sparkles } from "lucide-react";
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
          <div className="glass rounded-2xl p-10 text-center space-y-5 mesh-gradient-card border border-border/30 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/10 mx-auto border border-primary/15 relative z-[1]">
              <Search className="w-7 h-7 text-primary" />
            </div>
            <div className="relative z-[1]">
              <h3 className="font-semibold text-xl mb-2">Research your topic</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                AI will research &quot;{state.idea?.topic}&quot; and provide insights, trends, and key points for
                your reel.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!state.idea}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all relative z-[1]"
            >
              <Sparkles className="w-4 h-4" />
              Generate Research
            </Button>
          </div>
        )}

        {(hasContent || isStreaming) && (
          <div className="glass rounded-2xl p-6 lg:p-8 border border-border/30 animate-scale-in">
            <StreamingText text={displayText} isStreaming={isStreaming} />
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
