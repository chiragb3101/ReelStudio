"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePipeline } from "@/hooks/use-pipeline";
import { STAGES, type StageName } from "@/lib/types";
import { STAGE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StageWrapperProps {
  stage: StageName;
  children: ReactNode;
  nextLabel?: string;
  nextDisabled?: boolean;
  onNext?: () => void;
  actions?: ReactNode;
  className?: string;
}

export function StageWrapper({
  stage,
  children,
  nextLabel,
  nextDisabled = false,
  onNext,
  actions,
  className,
}: StageWrapperProps) {
  const { state, dispatch } = usePipeline();
  const router = useRouter();
  const config = STAGE_CONFIG[stage];
  const stageIdx = STAGES.indexOf(stage);
  const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;

  function handleNext() {
    if (onNext) onNext();
    if (nextStage) {
      dispatch({ type: "SET_STAGE", stage: nextStage });
      const base = state.projectId ? `/pipeline/${state.projectId}` : "/pipeline";
      router.push(`${base}/${nextStage}`);
    }
  }

  return (
    <div className={cn("flex flex-col flex-1 p-4 lg:p-8 max-w-4xl mx-auto w-full animate-fade-in-up", className)}>
      {/* Stage header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">
              Step {stageIdx + 1} of {STAGES.length}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{config.label}</h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {config.description}
          </p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Content */}
      <div className="flex-1">{children}</div>

      {/* Next CTA */}
      {nextStage && (
        <div className="flex justify-end mt-8 pt-6 border-t border-border/30">
          <Button
            onClick={handleNext}
            disabled={nextDisabled}
            size="lg"
            className="gap-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-7 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all hover:scale-[1.02] disabled:shadow-none disabled:hover:scale-100"
          >
            {nextLabel ?? `Continue to ${STAGE_CONFIG[nextStage].label}`}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
