"use client";

import { Loader2 } from "lucide-react";

interface JsonStreamingIndicatorProps {
  text: string;
  label: string;
}

/**
 * Shows a clean loading state while JSON is streaming in (partial/unparseable).
 * Extracts any readable values from the partial JSON to show progress.
 */
export function JsonStreamingIndicator({ text, label }: JsonStreamingIndicatorProps) {
  // Try to extract partial string values from the incomplete JSON for a preview
  const partialValues = extractPartialStrings(text);

  return (
    <div className="glass rounded-2xl p-6 border border-border/50 space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
        <div>
          <span className="text-sm font-medium">Generating {label}...</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI is writing structured content
          </p>
        </div>
      </div>

      {partialValues.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          {partialValues.map((item, i) => (
            <div key={i} className="flex gap-2">
              {item.key && (
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold shrink-0 mt-1">
                  {item.key}
                </span>
              )}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.value}
                <span className="inline-block w-1.5 h-3.5 bg-primary/60 animate-pulse ml-0.5 align-middle rounded-sm" />
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function extractPartialStrings(text: string): { key?: string; value: string }[] {
  const results: { key?: string; value: string }[] = [];

  // Match "key": "value (possibly incomplete)
  const regex = /"(\w+)"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const key = match[1];
    const value = match[2];
    // Only show meaningful values (not just whitespace or very short)
    if (value.trim().length > 5) {
      results.push({
        key: key.replace(/_/g, " "),
        value: value.replace(/\\n/g, " ").replace(/\\"/g, '"'),
      });
    }
  }

  return results;
}
