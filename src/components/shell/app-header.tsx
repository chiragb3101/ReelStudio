"use client";

import { Film } from "lucide-react";
import { usePipeline } from "@/hooks/use-pipeline";
import { TONE_CONFIG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { StageIndicator } from "./stage-indicator";

export function AppHeader() {
  const { state } = usePipeline();
  const tone = state.idea?.tone;

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20">
            <Film className="w-4.5 h-4.5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Reel<span className="text-primary">Studio</span>
          </span>
        </div>

        {/* Stage indicator — center */}
        <div className="hidden md:block">
          <StageIndicator />
        </div>

        {/* Tone badge */}
        <div className="flex items-center gap-3">
          {tone && (
            <Badge
              variant="outline"
              className={`${TONE_CONFIG[tone].color} border text-xs font-medium`}
            >
              {TONE_CONFIG[tone].emoji} {TONE_CONFIG[tone].label}
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
