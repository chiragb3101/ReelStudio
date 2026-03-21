import { type StageName, type Tone } from "./types";

export const STAGE_CONFIG: Record<
  StageName,
  { label: string; icon: string; description: string }
> = {
  idea: {
    label: "Idea",
    icon: "Lightbulb",
    description: "Define your reel concept",
  },
  research: {
    label: "Research",
    icon: "Search",
    description: "AI-powered topic research",
  },
  script: {
    label: "Script",
    icon: "FileText",
    description: "Generate your reel script",
  },
  "shot-list": {
    label: "Shot List",
    icon: "ListVideo",
    description: "Plan your shots",
  },
  shoot: {
    label: "Shoot",
    icon: "Camera",
    description: "Record or upload clips",
  },
  edit: {
    label: "Edit",
    icon: "Film",
    description: "Preview and render your reel",
  },
  thumbnail: {
    label: "Thumbnail",
    icon: "Image",
    description: "Choose your cover image",
  },
  caption: {
    label: "Caption",
    icon: "MessageSquare",
    description: "Generate your post caption",
  },
  schedule: {
    label: "Schedule",
    icon: "Calendar",
    description: "Schedule or publish",
  },
};

export const TONE_CONFIG: Record<
  Tone,
  { label: string; color: string; emoji: string; promptModifier: string }
> = {
  professional: {
    label: "Professional",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    emoji: "💼",
    promptModifier:
      "Use a polished, authoritative tone. Formal vocabulary, concise sentences. Think LinkedIn thought-leader.",
  },
  casual: {
    label: "Casual",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    emoji: "✌️",
    promptModifier:
      "Keep it chill and conversational. Use contractions, everyday language, like talking to a friend.",
  },
  humorous: {
    label: "Humorous",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    emoji: "😂",
    promptModifier:
      "Make it funny and entertaining. Use wit, wordplay, unexpected twists. Think comedy sketch energy.",
  },
  dramatic: {
    label: "Dramatic",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    emoji: "🎭",
    promptModifier:
      "High intensity and emotional impact. Short punchy sentences, dramatic pauses, tension building.",
  },
  educational: {
    label: "Educational",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    emoji: "📚",
    promptModifier:
      "Clear, informative, and structured. Break down complex ideas simply. Think teacher explaining to students.",
  },
  inspirational: {
    label: "Inspirational",
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    emoji: "✨",
    promptModifier:
      "Uplifting and motivational. Use powerful imagery, emotional language, and a call to believe.",
  },
};

export const FPS = 30;
export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
export const REEL_ASPECT_RATIO = 9 / 16;
