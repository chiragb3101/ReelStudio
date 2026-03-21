import { z } from "zod/v4";

const motionGraphicElementSchema = z.object({
  type: z.enum(["text", "counter", "highlightedText", "bulletList", "icon"]),
  content: z.string().optional(),
  enterAtMs: z.number(),
  exitAtMs: z.number().optional(),
  animation: z.enum(["slideUp", "fadeIn", "pop", "typewriter", "none"]).default("fadeIn"),
  fontSize: z.number().optional(),
  fontWeight: z.number().optional(),
  color: z.string().optional(),
  position: z.enum(["center", "top", "bottom"]).optional(),
  from: z.number().optional(),
  to: z.number().optional(),
  suffix: z.string().optional(),
  highlightWords: z.array(z.string()).optional(),
  highlightColor: z.string().optional(),
  items: z.array(z.string()).optional(),
  staggerMs: z.number().optional(),
}).passthrough();

const motionGraphicSpecSchema = z.object({
  elements: z.array(motionGraphicElementSchema),
  background: z.object({
    type: z.enum(["gradient", "solid"]).default("gradient"),
    from: z.string(),
    to: z.string().optional(),
  }),
}).passthrough();

const reelSceneSchema = z.object({
  clipId: z.string(),
  durationFrames: z.number(),
  transition: z.enum(["fade", "slide-left", "zoom-in", "cut"]).default("fade"),
  text: z.string().optional(),
  textPosition: z.enum(["center", "top", "bottom", "lower-third"]).optional(),
  textAnimation: z.enum(["fade-in", "slide-up", "pop", "none"]).optional(),
  captionText: z.string().optional(),
  captionStyle: z.enum(["karaoke", "pop", "typewriter", "none"]).optional(),
  motionGraphic: motionGraphicSpecSchema.optional(),
}).passthrough();

export const reelEditSpecSchema = z.object({
  accentColor: z.string().default("#22D3EE"),
  scenes: z.array(reelSceneSchema),
  template: z.enum(["top-graphic", "bottom-graphic", "full-video-overlay"]).optional(),
}).passthrough();

export type ValidatedReelEditSpec = z.infer<typeof reelEditSpecSchema>;
