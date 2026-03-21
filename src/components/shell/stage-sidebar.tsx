"use client";

import { useRouter } from "next/navigation";
import {
  Lightbulb,
  Search,
  FileText,
  ListVideo,
  Camera,
  Film,
  ImageIcon,
  MessageSquare,
  Calendar,
  Check,
  Loader2,
  Lock,
} from "lucide-react";
import { STAGES, type StageName } from "@/lib/types";
import { STAGE_CONFIG } from "@/lib/constants";
import { usePipeline } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";

const STAGE_ICONS: Record<StageName, React.ElementType> = {
  idea: Lightbulb,
  research: Search,
  script: FileText,
  "shot-list": ListVideo,
  shoot: Camera,
  edit: Film,
  thumbnail: ImageIcon,
  caption: MessageSquare,
  schedule: Calendar,
};

export function StageSidebar() {
  const { state, dispatch } = usePipeline();
  const router = useRouter();

  function handleNav(stage: StageName) {
    const status = state.stageStatuses[stage];
    if (status === "locked") return;
    dispatch({ type: "SET_STAGE", stage });
    router.push(`/pipeline/${stage}`);
  }

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-border/50 glass py-4">
      <nav className="flex flex-col gap-0.5 px-3 relative">
        {/* Vertical connecting line */}
        <div className="absolute left-[27px] top-5 bottom-5 w-px bg-border/50" />

        {STAGES.map((stage, i) => {
          const status = state.stageStatuses[stage];
          const isCurrent = state.currentStage === stage;
          const Icon = STAGE_ICONS[stage];
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
                  "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                status === "locked" &&
                  "text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              {/* Stage number/icon circle */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-7 h-7 rounded-full border text-xs font-semibold transition-all duration-300",
                  status === "complete" &&
                    "bg-primary border-primary text-primary-foreground",
                  isCurrent &&
                    status !== "complete" &&
                    "border-primary bg-primary/20 text-primary pulse-active",
                  status === "active" &&
                    !isCurrent &&
                    "border-primary/40 bg-transparent text-primary/60",
                  status === "locked" &&
                    "border-muted-foreground/20 bg-muted/30 text-muted-foreground/40",
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
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
