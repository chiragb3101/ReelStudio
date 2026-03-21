"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToneSelector } from "@/components/shared/tone-selector";
import { usePipeline } from "@/hooks/use-pipeline";
import { type Tone } from "@/lib/types";

export function IdeaForm() {
  const { state, dispatch } = usePipeline();

  const [topic, setTopic] = useState(state.idea?.topic ?? "");
  const [pov, setPov] = useState(state.idea?.pov ?? "");
  const [tone, setTone] = useState<Tone | null>(state.idea?.tone ?? null);

  const isValid = topic.trim().length > 0 && tone !== null;

  function handleSave() {
    if (!isValid || !tone) return;
    dispatch({
      type: "SET_IDEA",
      data: { topic: topic.trim(), pov: pov.trim(), tone },
    });
  }

  // Auto-save on valid state change
  function handleTopicChange(value: string) {
    setTopic(value);
  }

  return (
    <div className="space-y-8">
      {/* Topic */}
      <div className="space-y-2">
        <Label htmlFor="topic" className="text-sm font-medium">
          What&apos;s your reel about?
        </Label>
        <div className="relative">
          <Input
            id="topic"
            placeholder="e.g., 5 morning habits that changed my life"
            value={topic}
            onChange={(e) => handleTopicChange(e.target.value)}
            className="h-12 rounded-xl bg-card border-border/50 text-base placeholder:text-muted-foreground/50 focus:ring-primary/30"
          />
          <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
        </div>
      </div>

      {/* POV / Angle */}
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
          className="rounded-xl bg-card border-border/50 text-base placeholder:text-muted-foreground/50 resize-none focus:ring-primary/30"
        />
      </div>

      {/* Tone */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Choose your tone
        </Label>
        <ToneSelector value={tone} onChange={setTone} />
      </div>

      {/* Save indicator */}
      {isValid && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Ready to continue
        </div>
      )}

      {/* Hidden save trigger — save is called by StageWrapper's onNext */}
      <input type="hidden" data-save={isValid ? "true" : "false"} />

      {/* Expose save for parent */}
      <button
        type="button"
        id="idea-save-trigger"
        className="hidden"
        onClick={handleSave}
      />
    </div>
  );
}
