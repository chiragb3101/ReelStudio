import type { VideoTemplate, ScriptSegment } from "@/lib/types";

export interface ClipDurationInfo {
  shotId: string;
  durationSeconds: number;
  description: string;
}

export function buildEditSpecPrompt(
  topic: string,
  script: { hook: string; body: string; cta: string },
  clips: ClipDurationInfo[],
  tone: string,
  template: VideoTemplate = "full-video-overlay",
  segments?: ScriptSegment[]
): string {
  const clipLines = clips
    .map((c) => `  "${c.shotId}": ${c.durationSeconds.toFixed(1)}s (max ${Math.floor(c.durationSeconds * 30)} frames) — ${c.description}`)
    .join("\n");

  const segmentLines = segments
    ? segments
        .map((s) => `  ${s.shotId}: "${s.text}" (emphasis: ${s.emphasisWords.join(", ")})`)
        .join("\n")
    : "";

  const templateInstructions = getTemplateInstructions(template);

  return `Create an edit spec for an Instagram Reel. You are deciding the ORDER of clips, TRANSITIONS, TEXT overlays, CAPTIONS, and MOTION GRAPHICS.

TOPIC: ${topic}
TONE: ${tone}
TEMPLATE: ${template}

SCRIPT:
  Hook: "${script.hook}"
  Body: "${script.body}"
  CTA: "${script.cta}"

${segmentLines ? `SCRIPT SEGMENTS (with emphasis words):\n${segmentLines}\n` : ""}
AVAILABLE CLIPS:
${clipLines}

${templateInstructions}

RULES:
1. Each scene uses ONE clip. durationFrames MUST be ≤ the clip's max frames shown above.
2. Use every clip exactly once, in a logical order matching the script flow.
3. First scene = hook. Last scene = CTA. Middle scenes = body.
4. Keep it punchy — don't pad scenes. Use most of each clip's available frames.

TRANSITIONS (between scenes):
- "fade" — smooth crossfade, use for most transitions
- "slide-left" — energetic slide, use 1-2 times max
- "zoom-in" — dramatic zoom, good for hook entrance
- "cut" — hard cut, use for fast pacing

TEXT OVERLAYS (optional per scene):
- Short punchy text (max 6 words) that reinforces the spoken content
- textPosition: "center" (big hook text), "lower-third" (subtle), "top", "bottom"
- textAnimation: "slide-up" (default), "fade-in", "pop"
- Only add text to 2-4 key scenes, not every scene

CAPTIONS (spoken word display):
- captionText: the EXACT words the creator says in that scene
- captionStyle: "karaoke" (word-by-word highlight — best for most), "pop" (words pop in), "typewriter" (type effect)
- Add captions to EVERY scene where the creator speaks

MOTION GRAPHICS (for template "${template}"):
For scenes that benefit from kinetic text or data visualization, add a "motionGraphic" field:
{
  "elements": [
    {
      "type": "text|counter|highlightedText|bulletList",
      "content": "text content",
      "enterAtMs": 0,
      "exitAtMs": 3000,
      "animation": "slideUp|fadeIn|pop|typewriter|none",
      "fontSize": 54,
      "color": "#FFFFFF"
    }
  ],
  "background": { "type": "gradient", "from": "#0F0F23", "to": "#1a1a3e" }
}

Element types:
- "text": Simple animated text. Fields: content, fontSize, fontWeight, color, position, animation
- "counter": Animated number counter. Fields: from, to, suffix, color, animation
- "highlightedText": Text with highlighted keywords. Fields: content, highlightWords[], highlightColor, animation
- "bulletList": Staggered bullet points. Fields: items[], staggerMs, color, animation

Animation types: slideUp, fadeIn, pop, typewriter, none
Timing: enterAtMs/exitAtMs in milliseconds from scene start

Guidelines:
- Add motion graphics to 2-4 key scenes, especially hook and data-heavy segments
- Use "counter" for statistics/numbers mentioned in script
- Use "highlightedText" when emphasizing key phrases
- Use "bulletList" for lists or multiple points
- Keep motion graphics clean — max 3 elements per scene
- Match colors to the accent color and tone

Return ONLY this JSON:
{
  "accentColor": "#bright_hex_color_matching_tone",
  "template": "${template}",
  "scenes": [
    {
      "clipId": "shot-1",
      "durationFrames": 90,
      "transition": "zoom-in",
      "text": "Hook text here",
      "textPosition": "center",
      "textAnimation": "slide-up",
      "captionText": "exact spoken words for this scene",
      "captionStyle": "karaoke",
      "motionGraphic": {
        "elements": [...],
        "background": { "type": "gradient", "from": "#0F0F23", "to": "#1a1a3e" }
      }
    }
  ]
}`;
}

function getTemplateInstructions(template: VideoTemplate): string {
  switch (template) {
    case "top-graphic":
      return `TEMPLATE LAYOUT: Motion graphic renders in the top 960px, video in the bottom 960px.
Motion graphics should be data-rich and text-heavy since they have dedicated space.
Add motionGraphic to at least 3 scenes.`;
    case "bottom-graphic":
      return `TEMPLATE LAYOUT: Video renders in the top 960px, motion graphic in the bottom 960px.
Motion graphics should complement the video above with supporting text/data.
Add motionGraphic to at least 3 scenes.`;
    case "full-video-overlay":
    default:
      return `TEMPLATE LAYOUT: Full-bleed video with motion graphic as centered overlay.
Keep motion graphics minimal — they overlay the video, so use sparingly (1-2 scenes max).
Prefer text overlays and captions over motion graphics for this layout.`;
  }
}
