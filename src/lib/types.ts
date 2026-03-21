// ── Tone ──
export const TONES = [
  "professional",
  "casual",
  "humorous",
  "dramatic",
  "educational",
  "inspirational",
] as const;

export type Tone = (typeof TONES)[number];

// ── Pipeline Stages ──
export const STAGES = [
  "idea",
  "research",
  "script",
  "shot-list",
  "shoot",
  "edit",
  "thumbnail",
  "caption",
  "schedule",
] as const;

export type StageName = (typeof STAGES)[number];

export type StageStatus = "locked" | "active" | "complete" | "regenerating";

// ── Stage Data Interfaces ──

export interface IdeaData {
  topic: string;
  pov: string;
  tone: Tone;
}

export interface ResearchData {
  markdown: string;
}

// ── Script Segments (Phase 1) ──

export interface ScriptSegment {
  shotId: string;
  text: string;
  emphasisWords: string[];
  wordCount: number;
  estimatedSeconds: number; // wordCount / 2.5
}

export interface ScriptData {
  hook: string;
  body: string;
  cta: string;
  fullText: string;
  segments?: ScriptSegment[];
}

export interface ShotItem {
  id: string;
  description: string;
  duration: number; // numeric seconds (was string)
  angle: string;
  notes: string;
  scriptText?: string;
  wordCount?: number;
}

export interface ShotListData {
  shots: ShotItem[];
}

export interface MediaClip {
  id: string;
  shotId: string;
  blob: Blob;
  thumbnailUrl?: string;
  duration?: number;
  type: "recorded" | "uploaded";
  createdAt: number;
  transcription?: ClipTranscription;
}

// ── Audio Transcription (Phase 3) ──

export interface TranscribedWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number | null;
}

export interface ClipTranscription {
  shotId: string;
  words: TranscribedWord[];
  fullText: string;
}

// ── Stored clip (for IndexedDB / Supabase — no Blob) ──

export interface StoredClip {
  id: string;
  shotId: string;
  duration?: number;
  type: "recorded" | "uploaded";
  createdAt: number;
  transcription?: ClipTranscription;
}

export interface ShootData {
  clips: Record<string, MediaClip>; // shotId → clip
}

// ── Video Templates (Phase 4) ──

export type VideoTemplate = "top-graphic" | "bottom-graphic" | "full-video-overlay";

// ── Motion Graphics (Phase 4) ──

export type MotionGraphicAnimation = "slideUp" | "fadeIn" | "pop" | "typewriter" | "none";

export interface MotionGraphicElement {
  type: "text" | "counter" | "highlightedText" | "bulletList" | "icon";
  content?: string;
  enterAtMs: number;
  exitAtMs?: number;
  animation: MotionGraphicAnimation;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  position?: "center" | "top" | "bottom";
  // counter-specific
  from?: number;
  to?: number;
  suffix?: string;
  // highlightedText-specific
  highlightWords?: string[];
  highlightColor?: string;
  // bulletList-specific
  items?: string[];
  staggerMs?: number;
}

export interface MotionGraphicSpec {
  elements: MotionGraphicElement[];
  background: { type: "gradient" | "solid"; from: string; to?: string };
}

// ── Remotion Scene Data ──

export type TransitionType = "fade" | "slide-left" | "zoom-in" | "cut";
export type TextPosition = "center" | "top" | "bottom" | "lower-third";
export type TextAnimation = "fade-in" | "slide-up" | "pop" | "none";
export type CaptionStyle = "karaoke" | "pop" | "typewriter" | "none";

// ── Caption Font & Style Options (Phase 8) ──

export type CaptionFontFamily = "Inter" | "Montserrat" | "Poppins" | "Bangers";

export interface CaptionSettings {
  fontFamily: CaptionFontFamily;
  captionStyle: CaptionStyle;
  fontSize: number;
  highlightColor: string;
  autoHighlight: boolean;
  enabled: boolean;
}

export interface ReelScene {
  clipId: string;            // which shot clip to use (e.g. "shot-1")
  durationFrames: number;    // how long this scene lasts (must fit clip duration)
  transition: TransitionType;
  text?: string;             // overlay text (short, punchy)
  textPosition?: TextPosition;
  textAnimation?: TextAnimation;
  captionText?: string;      // spoken words for animated captions
  captionStyle?: CaptionStyle;
  motionGraphic?: MotionGraphicSpec;
}

export interface ReelEditSpec {
  accentColor: string;       // primary accent for text highlights, captions
  scenes: ReelScene[];
  template?: VideoTemplate;
  captionSettings?: CaptionSettings;
}

export interface EditData {
  editSpec: ReelEditSpec;
  renderedVideoBlob?: Blob;
}

export interface ThumbnailOption {
  id: string;
  src: string; // base64
  label: string;
}

export interface ThumbnailData {
  options: ThumbnailOption[];
  selectedId: string | null;
}

export interface CaptionData {
  caption: string;
  hashtags: string[];
}

export interface ScheduleData {
  scheduledAt: string | null;
  platform: "instagram";
  status: "pending" | "scheduled" | "manual";
}

// ── Pipeline State ──

export interface PipelineState {
  currentStage: StageName;
  stageStatuses: Record<StageName, StageStatus>;
  idea: IdeaData | null;
  research: ResearchData | null;
  script: ScriptData | null;
  shotList: ShotListData | null;
  shoot: ShootData | null;
  edit: EditData | null;
  thumbnail: ThumbnailData | null;
  caption: CaptionData | null;
  schedule: ScheduleData | null;
  template: VideoTemplate;
  projectId?: string;
}

// ── Actions ──

export type PipelineAction =
  | { type: "SET_STAGE"; stage: StageName }
  | { type: "SET_STAGE_STATUS"; stage: StageName; status: StageStatus }
  | { type: "SET_IDEA"; data: IdeaData }
  | { type: "SET_RESEARCH"; data: ResearchData }
  | { type: "SET_SCRIPT"; data: ScriptData }
  | { type: "SET_SHOT_LIST"; data: ShotListData }
  | { type: "SET_SHOOT"; data: ShootData }
  | { type: "SET_EDIT"; data: EditData }
  | { type: "SET_THUMBNAIL"; data: ThumbnailData }
  | { type: "SET_CAPTION"; data: CaptionData }
  | { type: "SET_SCHEDULE"; data: ScheduleData }
  | { type: "SET_TEMPLATE"; template: VideoTemplate }
  | { type: "HYDRATE"; state: PipelineState }
  | { type: "RESET" };
