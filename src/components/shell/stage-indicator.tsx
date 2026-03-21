"use client";

import { STAGES } from "@/lib/types";
import { STAGE_CONFIG } from "@/lib/constants";
import { usePipeline } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";

export function StageIndicator() {
  const { state } = usePipeline();

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const status = state.stageStatuses[stage];
        const isCurrent = state.currentStage === stage;

        return (
          <div key={stage} className="flex items-center">
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                status === "complete" && "bg-primary",
                status === "active" && isCurrent && "bg-primary pulse-active",
                status === "active" && !isCurrent && "bg-primary/50",
                status === "locked" && "bg-muted-foreground/30",
                status === "regenerating" && "bg-accent animate-pulse"
              )}
              title={STAGE_CONFIG[stage].label}
            />
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "w-4 h-px mx-0.5 transition-colors duration-300",
                  status === "complete"
                    ? "bg-primary/60"
                    : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
