import type { ScriptSegment } from "@/lib/types";

export function buildShotListPrompt(
  topic: string,
  script: { hook: string; body: string; cta: string },
  segments?: ScriptSegment[]
): string {
  const segmentBlock = segments
    ? segments
        .map(
          (s) =>
            `  ${s.shotId}: "${s.text}" (${s.wordCount} words, ~${s.estimatedSeconds.toFixed(1)}s)`
        )
        .join("\n")
    : null;

  return `You are a professional video director planning shots for an Instagram Reel (9:16 vertical format, 30-60 seconds).

Topic: ${topic}

Script:
- Hook: ${script.hook}
- Body: ${script.body}
- CTA: ${script.cta}

${
  segmentBlock
    ? `SCRIPT SEGMENTS (one per shot — durations MUST match):
${segmentBlock}

CRITICAL: Each shot's "duration" MUST be a NUMBER (in seconds) matching the segment's estimatedSeconds above.
Each shot's "scriptText" MUST be the exact segment text.
The number of shots MUST equal the number of segments.`
    : `Create 4-8 shots with numeric duration values in seconds.`
}

Create a detailed shot list. Return a JSON array of shots:
\`\`\`json
{
  "shots": [
    {
      "id": "shot-1",
      "description": "Brief description of what to film",
      "duration": 4.8,
      "angle": "Close-up / Medium / Wide / POV / Overhead",
      "notes": "Specific direction for the creator (lighting, movement, expression)",
      "scriptText": "The exact words the creator says during this shot",
      "wordCount": 12
    }
  ]
}
\`\`\`

Guidelines:
- First shot must be visually striking to match the hook
- Vary angles to keep it dynamic
- Include B-roll suggestions where appropriate
- Each shot should be simple enough to film with a smartphone
- Duration is a NUMBER in seconds, NOT a string like "3-5s"
- Duration total should be 30-60 seconds
- Consider transitions between shots

Return ONLY the JSON, no other text.`;
}
