import { z } from "zod";

export const researchSchema = z.object({
  topic: z.string().min(1).max(200),
  pov: z.string().max(500).optional(),
});

export const scriptSchema = z.object({
  topic: z.string().min(1).max(200),
  pov: z.string().max(500).optional(),
  research: z.string().max(8000).optional(),
  toneModifier: z.string().max(100).optional(),
});

export const shotListSchema = z.object({
  topic: z.string().min(1).max(200),
  script: z.unknown(),
  segments: z.unknown().optional(),
});

export const editSpecSchema = z.object({
  topic: z.string().min(1).max(200),
  script: z.unknown(),
  clips: z.array(z.unknown()).max(50).optional(),
  tone: z.string().max(50).optional(),
  template: z.string().max(50).optional(),
  segments: z.unknown().optional(),
});

export const captionSchema = z.object({
  topic: z.string().min(1).max(200),
  script: z.unknown(),
  toneModifier: z.string().max(100).optional(),
});

export const thumbnailSchema = z.object({
  topic: z.string().min(1).max(200),
  hook: z.string().max(300).optional(),
  tone: z.string().max(50).optional(),
  frames: z.array(z.string()).max(3).optional(),
});

export const motionGraphicSchema = z.object({
  script: z.string().min(1).max(15000),
  topic: z.string().max(200).optional(),
  tone: z.string().max(50).optional(),
  durationSeconds: z.number().min(5).max(120).optional(),
  template: z.string().max(50).optional(),
  chatHistory: z.array(z.object({ role: z.string(), content: z.string() })).max(20).optional(),
  userPrompt: z.string().max(1000).optional(),
});

export const imageSchema = z.object({
  prompt: z.string().min(1).max(500),
});

export const generateImageSchema = z.object({
  prompt: z.string().max(500).optional(),
  filename: z.string().max(100).optional(),
  width: z.number().min(64).max(2048).optional(),
  height: z.number().min(64).max(2048).optional(),
});

export const scheduleSchema = z.object({
  accessToken: z.string().min(1),
  profile_ids: z.array(z.string()).optional(),
  text: z.string().max(2200).optional(),
  scheduled_at: z.string().optional(),
  media: z.unknown().optional(),
});
