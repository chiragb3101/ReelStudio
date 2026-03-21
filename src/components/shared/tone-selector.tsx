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
    <div className="flex flex-wrap gap-2">
      {TONES.map((tone) => {
        const config = TONE_CONFIG[tone];
        const isSelected = value === tone;

        return (
          <button
            key={tone}
            type="button"
            onClick={() => onChange(tone)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200",
              isSelected
                ? `${config.color} border-current shadow-sm`
                : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span>{config.emoji}</span>
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
