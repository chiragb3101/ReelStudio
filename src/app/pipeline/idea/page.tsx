"use client";

import { useCallback, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToneSelector } from "@/components/shared/tone-selector";
import { StageWrapper } from "@/components/shared/stage-wrapper";
import { usePipeline } from "@/hooks/use-pipeline";
import { type Tone } from "@/lib/types";

export default function IdeaPage() {
  const { state, dispatch } = usePipeline();

  const [topic, setTopic] = useState(state.idea?.topic ?? "");
  const [pov, setPov] = useState(state.idea?.pov ?? "");
  const [tone, setTone] = useState<Tone | null>(state.idea?.tone ?? null);

  const isValid = topic.trim().length > 0 && tone !== null;

  const handleNext = useCallback(() => {
    if (!isValid || !tone) return;
    dispatch({
      type: "SET_IDEA",
      data: { topic: topic.trim(), pov: pov.trim(), tone },
    });
  }, [isValid, tone, topic, pov, dispatch]);

  return (
    <StageWrapper
      stage="idea"
      nextDisabled={!isValid}
      onNext={handleNext}
    >
      <div className="space-y-8 max-w-2xl">
        {/* Hero prompt */}
        <div className="glass rounded-2xl p-6 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              Start with an idea
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Tell us what your reel is about. The more specific, the better your
            AI-generated content will be.
          </p>
        </div>

        {/* Topic */}
        <div className="space-y-2">
          <Label htmlFor="topic" className="text-sm font-medium">
            What&apos;s your reel about? <span className="text-destructive">*</span>
          </Label>
          <Input
            id="topic"
            placeholder="e.g., 5 morning habits that changed my life"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="h-12 rounded-xl bg-card border-border/50 text-base placeholder:text-muted-foreground/50"
          />
        </div>

        {/* POV */}
        <div className="space-y-2">
          <Label htmlFor="pov" className="text-sm font-medium">
            Your unique angle or POV{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="pov"
            placeholder="e.g., As a college student who went from failing to 4.0 GPA..."
            value={pov}
            onChange={(e) => setPov(e.target.value)}
            rows={3}
            className="rounded-xl bg-card border-border/50 text-base placeholder:text-muted-foreground/50 resize-none"
          />
        </div>

        {/* Tone */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Choose your tone <span className="text-destructive">*</span>
          </Label>
          <ToneSelector value={tone} onChange={setTone} />
        </div>
      </div>
    </StageWrapper>
  );
}
