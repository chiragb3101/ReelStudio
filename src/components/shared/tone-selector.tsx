"use client";

import { TONES, type Tone } from "@/lib/types";
import { TONE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ToneSelectorProps {
  value: Tone | null;
  onChange: (tone: Tone) => void;
}

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {TONES.map((tone) => {
        const config = TONE_CONFIG[tone];
        const isSelected = value === tone;

        return (
          <button
            key={tone}
            type="button"
            onClick={() => onChange(tone)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200",
              isSelected
                ? `${config.color} border-current shadow-sm`
                : "bg-muted/20 text-muted-foreground border-border/20 hover:bg-muted/40 hover:text-foreground hover:border-border/40"
            )}
          >
            <span className="text-base">{config.emoji}</span>
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
