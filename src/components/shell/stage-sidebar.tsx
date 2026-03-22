"use client";

import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Lock,
} from "lucide-react";
import { STAGES, type StageName } from "@/lib/types";
import { STAGE_CONFIG } from "@/lib/constants";
import { usePipeline } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";


export function StageSidebar() {
  const { state, dispatch } = usePipeline();
  const router = useRouter();

  // Find index of last completed stage for gradient line height
  const currentIdx = STAGES.indexOf(state.currentStage);

  function handleNav(stage: StageName) {
    const status = state.stageStatuses[stage];
    if (status === "locked") return;
    dispatch({ type: "SET_STAGE", stage });
    const base = state.projectId ? `/pipeline/${state.projectId}` : "/pipeline";
    router.push(`${base}/${stage}`);
  }

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-border/30 glass-strong py-5">
      <nav className="flex flex-col gap-0.5 px-3 relative">
        {/* Vertical connecting line — gradient */}
        <div className="absolute left-[27px] top-5 bottom-5 w-px bg-border/20" />
        <div
          className="absolute left-[27px] top-5 w-px sidebar-progress-line transition-all duration-500"
          style={{ height: `${Math.max(0, (currentIdx / (STAGES.length - 1)) * 100)}%` }}
        />

        {STAGES.map((stage, i) => {
          const status = state.stageStatuses[stage];
          const isCurrent = state.currentStage === stage;
          const config = STAGE_CONFIG[stage];

          return (
            <button
              key={stage}
              onClick={() => handleNav(stage)}
              disabled={status === "locked"}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 text-left group",
                isCurrent &&
                  "bg-primary/10 text-primary font-medium",
                !isCurrent &&
                  status !== "locked" &&
                  "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                status === "locked" &&
                  "text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              {/* Stage number/icon circle */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-7 h-7 rounded-full border text-xs font-semibold transition-all duration-300",
                  status === "complete" &&
                    "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/30",
                  isCurrent &&
                    status !== "complete" &&
                    "border-primary bg-primary/20 text-primary pulse-active",
                  status === "active" &&
                    !isCurrent &&
                    "border-primary/30 bg-transparent text-primary/50",
                  status === "locked" &&
                    "border-muted-foreground/15 bg-muted/20 text-muted-foreground/30",
                  status === "regenerating" &&
                    "border-accent bg-accent/20 text-accent animate-pulse"
                )}
              >
                {status === "complete" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : status === "locked" ? (
                  <Lock className="w-3 h-3" />
                ) : status === "regenerating" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <span className="truncate">{config.label}</span>

              {/* Active indicator dot */}
              {isCurrent && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
