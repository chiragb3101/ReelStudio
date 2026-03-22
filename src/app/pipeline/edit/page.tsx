"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Film, Loader2, Sparkles, Type, Palette, Wand2, Download, Send,
  Mic, Upload, Scissors, ChevronRight, Trash2, AlertTriangle,
  Play, Volume2, VolumeX, Image as ImageIcon, Paperclip, Clapperboard,
} from "lucide-react";
import { StageWrapper } from "@/components/shared/stage-wrapper";
import { useMotionGraphic } from "@/hooks/use-motion-graphic";
import { useRenderVideo } from "@/hooks/use-render-video";
import { useMediaStore } from "@/hooks/use-media-store";
import { StitchedVideoPlayer } from "@/components/shared/stitched-video-player";
import { VideoPopup } from "@/components/shared/video-popup";
import { usePipeline } from "@/hooks/use-pipeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VideoTemplate, CaptionFontFamily, CaptionStyle, TransitionType } from "@/lib/types";

// ── Subtitle style presets ──

interface SubtitlePreset {
  id: string;
  label: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  highlightColor: string;
  bgColor: string;
  stroke: string;
  italic: boolean;
  uppercase: boolean;
  mixSizes: boolean;  // big/small word alternation
  curveStyle: "none" | "shadow" | "outline" | "box" | "vintage";
  description: string;
}

const SUBTITLE_PRESETS: SubtitlePreset[] = [
  {
    id: "classic-white",
    label: "Classic",
    fontFamily: "Inter",
    fontSize: 46,
    fontWeight: 800,
    color: "#FFFFFF",
    highlightColor: "#22D3EE",
    bgColor: "rgba(0,0,0,0.5)",
    stroke: "",
    italic: false,
    uppercase: false,
    mixSizes: false,
    curveStyle: "box",
    description: "Clean white on dark box",
  },
  {
    id: "bold-impact",
    label: "Bold Impact",
    fontFamily: "Bebas Neue",
    fontSize: 64,
    fontWeight: 400,
    color: "#FFFFFF",
    highlightColor: "#EF4444",
    bgColor: "transparent",
    stroke: "2px black",
    italic: false,
    uppercase: true,
    mixSizes: true,
    curveStyle: "outline",
    description: "Big/small word mix like reels",
  },
  {
    id: "yellow-vintage",
    label: "Yellow Vintage",
    fontFamily: "Georgia",
    fontSize: 52,
    fontWeight: 700,
    color: "#FFD700",
    highlightColor: "#FFD700",
    bgColor: "transparent",
    stroke: "2px black",
    italic: true,
    uppercase: false,
    mixSizes: false,
    curveStyle: "shadow",
    description: "Yellow italic with dark shadow",
  },
  {
    id: "neon-glow",
    label: "Neon Glow",
    fontFamily: "Montserrat",
    fontSize: 48,
    fontWeight: 900,
    color: "#00FF88",
    highlightColor: "#FF00FF",
    bgColor: "transparent",
    stroke: "",
    italic: false,
    uppercase: true,
    mixSizes: false,
    curveStyle: "shadow",
    description: "Glowing neon text",
  },
  {
    id: "handwritten",
    label: "Handwritten",
    fontFamily: "Dancing Script",
    fontSize: 56,
    fontWeight: 700,
    color: "#FFFFFF",
    highlightColor: "#F59E0B",
    bgColor: "transparent",
    stroke: "",
    italic: false,
    uppercase: false,
    mixSizes: false,
    curveStyle: "shadow",
    description: "Cursive handwriting style",
  },
  {
    id: "minimal-sans",
    label: "Minimal",
    fontFamily: "Poppins",
    fontSize: 38,
    fontWeight: 500,
    color: "#FFFFFF",
    highlightColor: "#8B5CF6",
    bgColor: "rgba(0,0,0,0.3)",
    stroke: "",
    italic: false,
    uppercase: false,
    mixSizes: false,
    curveStyle: "box",
    description: "Clean minimal captions",
  },
  {
    id: "big-outline",
    label: "Outline",
    fontFamily: "Oswald",
    fontSize: 60,
    fontWeight: 700,
    color: "#FFFFFF",
    highlightColor: "#FF6B6B",
    bgColor: "transparent",
    stroke: "3px black",
    italic: false,
    uppercase: true,
    mixSizes: true,
    curveStyle: "outline",
    description: "Thick outlined text",
  },
  {
    id: "pastel-soft",
    label: "Pastel Soft",
    fontFamily: "Quicksand",
    fontSize: 44,
    fontWeight: 600,
    color: "#FCD5CE",
    highlightColor: "#CDB4DB",
    bgColor: "rgba(0,0,0,0.2)",
    stroke: "",
    italic: false,
    uppercase: false,
    mixSizes: false,
    curveStyle: "box",
    description: "Soft pastel colors",
  },
];

const ALL_FONTS = [
  "Inter", "Montserrat", "Poppins", "Bangers", "Bebas Neue",
  "Oswald", "Dancing Script", "Pacifico", "Playfair Display",
  "Georgia", "Quicksand", "Raleway", "Lato", "Roboto Condensed",
];

const TRANSITIONS: { id: TransitionType; label: string }[] = [
  { id: "cut", label: "None (Cut)" },
  { id: "fade", label: "Fade" },
  { id: "slide-left", label: "Slide" },
  { id: "zoom-in", label: "Zoom" },
];

const TEMPLATES: { id: VideoTemplate; label: string; visual: string }[] = [
  { id: "top-graphic", label: "Graphic Top", visual: "MG\n───\nVID" },
  { id: "bottom-graphic", label: "Graphic Bottom", visual: "VID\n───\nMG" },
  { id: "full-video-overlay", label: "Overlay", visual: "VID\n+MG" },
];

const LOADING_MESSAGES = [
  "Claude is writing Remotion code...",
  "Designing particle effects & gradients...",
  "Building spring animations...",
  "Laying out typography & shapes...",
  "Adding SVG illustrations...",
  "Polishing visual effects...",
  "Compiling the composition...",
  "Rendering frames to video...",
  "Encoding MP4...",
  "Almost done — finalizing...",
];

type TabId = "user-video" | "motion-graphic" | "subtitles";

interface TimelineClip {
  shotId: string;
  blobUrl: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  transition: TransitionType;
}

export default function EditPage() {
  const { state, dispatch } = usePipeline();
  const { clips } = useMediaStore();
  const [activeTab, setActiveTab] = useState<TabId>("user-video");

  // ── User video timeline ──
  const [timeline, setTimeline] = useState<TimelineClip[]>([]);
  const [timelineInit, setTimelineInit] = useState(false);
  const [popupVideo, setPopupVideo] = useState<string | null>(null); // blobUrl for popup
  const [syncKey, setSyncKey] = useState(0); // increment to sync restart
  const [mgAttachments, setMgAttachments] = useState<{ name: string; dataUrl: string }[]>([]);
  const mgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timelineInit) return;
    const shots = state.shotList?.shots ?? [];
    const tl: TimelineClip[] = [];
    for (const shot of shots) {
      const c = clips[shot.id];
      if (c) tl.push({ shotId: shot.id, blobUrl: c.blobUrl, duration: c.duration ?? 5, trimStart: 0, trimEnd: 0, transition: "cut" });
    }
    if (tl.length > 0) { setTimeline(tl); setTimelineInit(true); }
  }, [clips, state.shotList, timelineInit]);

  // ── Motion graphic ──
  const motionGraphic = useMotionGraphic();
  const renderVideo = useRenderVideo();
  const [mgPrompt, setMgPrompt] = useState("");
  const mgInputRef = useRef<HTMLInputElement>(null);
  const [loadingIdx, setLoadingIdx] = useState(0);

  useEffect(() => {
    if (!motionGraphic.isGenerating) { setLoadingIdx(0); return; }
    const iv = setInterval(() => setLoadingIdx((i) => (i + 1) % LOADING_MESSAGES.length), 3500);
    return () => clearInterval(iv);
  }, [motionGraphic.isGenerating]);

  // Sync restart when motion graphic finishes
  const prevMgUrl = useRef(motionGraphic.videoUrl);
  useEffect(() => {
    if (motionGraphic.videoUrl && motionGraphic.videoUrl !== prevMgUrl.current) {
      prevMgUrl.current = motionGraphic.videoUrl;
      setSyncKey((k) => k + 1);
      setSubAnimFrame(0); // sync subtitle animation too
    }
  }, [motionGraphic.videoUrl]);

  // ── Subtitles ──
  const [activePreset, setActivePreset] = useState<SubtitlePreset>(SUBTITLE_PRESETS[0]);
  const [captionFont, setCaptionFont] = useState("Inter");
  const [captionSize, setCaptionSize] = useState(46);
  const [captionWeight, setCaptionWeight] = useState(800);
  const [captionColor, setCaptionColor] = useState("#FFFFFF");
  const [highlightColor, setHighlightColor] = useState("#22D3EE");
  const [captionBg, setCaptionBg] = useState("rgba(0,0,0,0.5)");
  const [captionStroke, setCaptionStroke] = useState("");
  const [captionItalic, setCaptionItalic] = useState(false);
  const [captionUppercase, setCaptionUppercase] = useState(false);
  const [mixSizes, setMixSizes] = useState(false);
  const [subtitlePos, setSubtitlePos] = useState<"bottom" | "center" | "top">("bottom");
  const [transcribedText, setTranscribedText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [subAnimFrame, setSubAnimFrame] = useState(0);

  // Animate subtitle preview
  useEffect(() => {
    const iv = setInterval(() => setSubAnimFrame((f) => f + 1), 600);
    return () => clearInterval(iv);
  }, []);

  // Apply preset
  function applyPreset(preset: SubtitlePreset) {
    setActivePreset(preset);
    setCaptionFont(preset.fontFamily);
    setCaptionSize(preset.fontSize);
    setCaptionWeight(preset.fontWeight);
    setCaptionColor(preset.color);
    setHighlightColor(preset.highlightColor);
    setCaptionBg(preset.bgColor);
    setCaptionStroke(preset.stroke);
    setCaptionItalic(preset.italic);
    setCaptionUppercase(preset.uppercase);
    setMixSizes(preset.mixSizes);
  }

  // Preview audio
  const [previewMuted, setPreviewMuted] = useState(false);

  // ── Computed ──
  const totalDur = useMemo(() => timeline.reduce((s, c) => s + (c.duration - c.trimStart - c.trimEnd), 0), [timeline]);

  const clipSources = useMemo(() => timeline.map((c) => ({
    blobUrl: c.blobUrl,
    startTime: c.trimStart,
    endTime: c.duration - c.trimEnd,
  })), [timeline]);

  // ── Handlers ──
  function updateClip(i: number, u: Partial<TimelineClip>) { setTimeline((p) => { const n = [...p]; n[i] = { ...n[i], ...u }; return n; }); }
  function moveClip(from: number, to: number) { if (to < 0 || to >= timeline.length) return; setTimeline((p) => { const n = [...p]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; }); }
  function removeClip(i: number) { setTimeline((p) => p.filter((_, j) => j !== i)); }

  function handleGenMG() {
    if (!state.script) return;
    motionGraphic.generate({ script: state.script.fullText, topic: state.idea?.topic ?? "", tone: state.idea?.tone ?? "professional", durationSeconds: Math.max(Math.round(totalDur), 10), template: state.template });
  }
  function handleRefineMG() {
    if (!mgPrompt.trim() || motionGraphic.isGenerating) return;
    const attachmentText = mgAttachments.length > 0
      ? `\n\n[User attached ${mgAttachments.length} image(s). Image data URLs are provided below for reference in the composition.]\n${mgAttachments.map((a, i) => `Image ${i + 1} (${a.name}): ${a.dataUrl.slice(0, 100)}...`).join("\n")}`
      : "";
    motionGraphic.refine(mgPrompt.trim() + attachmentText);
    setMgPrompt("");
    setMgAttachments([]);
  }

  function handleMgAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setMgAttachments((prev) => [...prev, { name: file.name, dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function handleTranscribeFromVideo() { setTranscribedText(state.script?.fullText ?? ""); }
  function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setIsTranscribing(true);
    setTranscribedText(state.script?.fullText ?? "");
    setIsTranscribing(false);
  }

  function handleFinish() {
    dispatch({
      type: "SET_EDIT",
      data: {
        editSpec: {
          accentColor: highlightColor,
          scenes: timeline.map((c) => ({ clipId: c.shotId, durationFrames: Math.round((c.duration - c.trimStart - c.trimEnd) * 30), transition: c.transition })),
          template: state.template,
        },
      },
    });
  }

  async function handleExportReel() {
    if (timeline.length === 0 && !motionGraphic.videoBlob) return;

    const editSpec = {
      accentColor: highlightColor,
      scenes: timeline.map((c) => ({
        clipId: c.shotId,
        durationFrames: Math.round((c.duration - c.trimStart - c.trimEnd) * 30),
        transition: c.transition,
        text: "",
      })),
      template: state.template ?? "full-video-overlay",
    };

    // Convert blob URLs → Blobs
    const clipBlobs: Record<string, Blob> = {};
    for (const clip of timeline) {
      try {
        const res = await fetch(clip.blobUrl);
        clipBlobs[clip.shotId] = await res.blob();
      } catch { /* skip clips that fail to fetch */ }
    }

    await renderVideo.render({ editSpec, clipBlobs });
  }

  // Save rendered blob into pipeline state when export completes
  useEffect(() => {
    if (!renderVideo.videoUrl || renderVideo.isRendering) return;
    fetch(renderVideo.videoUrl)
      .then((r) => r.blob())
      .then((blob) => {
        dispatch({
          type: "SET_EDIT",
          data: {
            editSpec: state.edit?.editSpec ?? {
              accentColor: highlightColor,
              scenes: [],
              template: state.template ?? "full-video-overlay",
            },
            renderedVideoBlob: blob,
          },
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderVideo.videoUrl]);

  useEffect(() => {
    if (!motionGraphic.isGenerating) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [motionGraphic.isGenerating]);

  // ── Subtitle word renderer ──
  function renderSubtitleWords(text: string, maxWords: number = 6, animate: boolean = true) {
    const allWords = text.split(/\s+/).filter(Boolean);
    if (allWords.length === 0) return null;

    // Group words into pages of maxWords, cycle through pages over time
    const totalPages = Math.ceil(allWords.length / maxWords);
    const currentPage = animate ? Math.floor(subAnimFrame / maxWords) % totalPages : 0;
    const pageStart = currentPage * maxWords;
    const pageWords = allWords.slice(pageStart, pageStart + maxWords);

    // Within the current page, highlight one word at a time
    const activeIdx = animate ? subAnimFrame % maxWords : -1;

    const scaleFn = (i: number) => mixSizes ? (i % 2 === 0 ? 1.4 : 0.8) : 1;

    return pageWords.map((w, i) => {
      const isActive = i === activeIdx && i < pageWords.length;
      const sz = captionSize * scaleFn(i) * 0.32;
      const textStyle: React.CSSProperties = {
        fontFamily: `'${captionFont}', sans-serif`,
        fontSize: `${sz}px`,
        fontWeight: isActive ? 900 : captionWeight,
        fontStyle: captionItalic ? "italic" : "normal",
        color: isActive ? (captionBg === "transparent" ? highlightColor : "#000") : captionColor,
        backgroundColor: isActive && captionBg !== "transparent" ? highlightColor : captionBg,
        padding: captionBg !== "transparent" ? "2px 8px" : "0 2px",
        borderRadius: captionBg !== "transparent" ? "6px" : "0",
        display: "inline-block",
        textTransform: captionUppercase ? "uppercase" : "none",
        transform: `scale(${isActive ? 1.08 : 1})`,
        transition: "all 0.2s ease",
        textShadow: captionStroke
          ? `-1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black`
          : activePreset.curveStyle === "shadow"
            ? "0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)"
            : "none",
        WebkitTextStroke: captionStroke || undefined,
        lineHeight: 1.4,
      };
      return <span key={`${currentPage}-${i}`} style={textStyle}>{w}</span>;
    });
  }

  return (
    <StageWrapper stage="edit" nextDisabled={false} onNext={handleFinish}>
      <div className="flex gap-6 min-h-[80vh]">
        {/* ══ LEFT: Tabs ══ */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Template */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Layout</span>
            <div className="flex gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => dispatch({ type: "SET_TEMPLATE", template: t.id })}
                  className={`rounded-lg px-3 py-1.5 text-center border text-[9px] leading-tight font-mono whitespace-pre ${state.template === t.id ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30"}`}>
                  {t.visual}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border/50">
            {([
              { id: "user-video" as TabId, label: "User Video", icon: Scissors, c: "#10b981" },
              { id: "motion-graphic" as TabId, label: "Motion Graphic", icon: Wand2, c: "#a855f7" },
              { id: "subtitles" as TabId, label: "Subtitles", icon: Type, c: "#22d3ee" },
            ]).map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5"
                style={activeTab === tab.id ? { borderColor: tab.c, color: tab.c } : { borderColor: "transparent", color: "var(--muted-foreground)" }}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === "motion-graphic" && motionGraphic.isGenerating && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </button>
            ))}
          </div>

          {/* ═══ TAB 1: USER VIDEO ═══ */}
          {activeTab === "user-video" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">{timeline.length} clips · {totalDur.toFixed(1)}s</h3>
              </div>

              {timeline.length === 0 ? (
                <Card className="glass rounded-xl p-8 text-center border-border/50">
                  <Film className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No clips yet. Complete the Shoot stage first.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {timeline.map((clip, i) => {
                    const eff = clip.duration - clip.trimStart - clip.trimEnd;
                    const trimStartPct = (clip.trimStart / clip.duration) * 100;
                    const trimEndPct = (clip.trimEnd / clip.duration) * 100;
                    const keepPct = 100 - trimStartPct - trimEndPct;
                    return (
                      <Card key={`${clip.shotId}-${i}`} className="glass rounded-xl border-border/50 overflow-hidden">
                        <div className="flex items-stretch">
                          {/* Video thumbnail — click opens popup */}
                          <div
                            className="relative w-24 shrink-0 bg-black cursor-pointer group"
                            onClick={() => setPopupVideo(clip.blobUrl)}
                          >
                            <video src={clip.blobUrl} className="w-full h-full object-cover" style={{ aspectRatio: "9/16", maxHeight: 90 }} muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                              <Play className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-mono px-1 py-0.5 rounded">{eff.toFixed(1)}s</div>
                          </div>

                          <div className="flex-1 p-3 space-y-2.5">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-0.5">
                                  <button onClick={() => moveClip(i, i - 1)} disabled={i === 0} className="text-muted-foreground hover:text-primary disabled:opacity-20 text-[10px]">▲</button>
                                  <button onClick={() => moveClip(i, i + 1)} disabled={i === timeline.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-20 text-[10px]">▼</button>
                                </div>
                                <Badge variant="outline" className="text-[10px]">{clip.shotId}</Badge>
                                <span className="text-[9px] text-muted-foreground font-mono">{clip.duration.toFixed(1)}s total</span>
                              </div>
                              <button onClick={() => removeClip(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>

                            {/* Visual trim bar */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Trim</span>
                                <span className="text-[8px] text-emerald-400 font-mono">Keep: {eff.toFixed(1)}s</span>
                              </div>
                              <div className="relative h-6 rounded-md bg-muted/50 overflow-hidden border border-border/30">
                                {/* Full clip background */}
                                <div className="absolute inset-0 bg-muted/30" />
                                {/* Active region (the part we keep) */}
                                <div
                                  className="absolute top-0 bottom-0 bg-emerald-500/20 border-x-2 border-emerald-500"
                                  style={{ left: `${trimStartPct}%`, width: `${keepPct}%` }}
                                />
                                {/* Trimmed start overlay */}
                                {trimStartPct > 0 && (
                                  <div className="absolute top-0 bottom-0 left-0 bg-black/40" style={{ width: `${trimStartPct}%` }}>
                                    <span className="absolute inset-0 flex items-center justify-center text-[7px] text-red-400/80">-{clip.trimStart.toFixed(1)}s</span>
                                  </div>
                                )}
                                {/* Trimmed end overlay */}
                                {trimEndPct > 0 && (
                                  <div className="absolute top-0 bottom-0 right-0 bg-black/40" style={{ width: `${trimEndPct}%` }}>
                                    <span className="absolute inset-0 flex items-center justify-center text-[7px] text-red-400/80">-{clip.trimEnd.toFixed(1)}s</span>
                                  </div>
                                )}
                              </div>
                              {/* Trim sliders below the bar */}
                              <div className="flex gap-4 mt-1.5">
                                <label className="flex-1">
                                  <span className="text-[8px] text-muted-foreground flex justify-between">
                                    <span>Start</span><span className="font-mono">{clip.trimStart.toFixed(1)}s</span>
                                  </span>
                                  <input type="range" min="0" max={Math.max(0, clip.duration - clip.trimEnd - 0.3)} step="0.1" value={clip.trimStart}
                                    onChange={(e) => updateClip(i, { trimStart: parseFloat(e.target.value) })}
                                    className="w-full h-1 accent-emerald-500" />
                                </label>
                                <label className="flex-1">
                                  <span className="text-[8px] text-muted-foreground flex justify-between">
                                    <span>End</span><span className="font-mono">{clip.trimEnd.toFixed(1)}s</span>
                                  </span>
                                  <input type="range" min="0" max={Math.max(0, clip.duration - clip.trimStart - 0.3)} step="0.1" value={clip.trimEnd}
                                    onChange={(e) => updateClip(i, { trimEnd: parseFloat(e.target.value) })}
                                    className="w-full h-1 accent-emerald-500" />
                                </label>
                              </div>
                            </div>

                            {/* Transition to next */}
                            {i < timeline.length - 1 && (
                              <div className="flex items-center gap-2">
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                <select value={clip.transition} onChange={(e) => updateClip(i, { transition: e.target.value as TransitionType })} className="text-[10px] rounded-md bg-muted border border-border/50 px-2 py-0.5">
                                  {TRANSITIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 2: MOTION GRAPHIC ═══ */}
          {activeTab === "motion-graphic" && (
            <div className="space-y-4">
              {!motionGraphic.videoUrl && !motionGraphic.isGenerating && !motionGraphic.error && (
                <div className="glass rounded-2xl p-8 text-center space-y-4 border border-purple-500/20">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 mx-auto">
                    <Wand2 className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-lg">Generate Motion Graphic</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">AI creates a full Remotion composition — shapes, particles, gradients, animated text — rendered as MP4.</p>
                  <Button onClick={handleGenMG} disabled={!state.script} size="lg" className="rounded-xl bg-purple-600 hover:bg-purple-700 gap-2">
                    <Sparkles className="w-4 h-4" /> Generate from Script
                  </Button>
                </div>
              )}

              {motionGraphic.isGenerating && (
                <div className="glass rounded-2xl p-8 text-center space-y-5 border border-purple-500/20">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-purple-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                    <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-purple-300">{LOADING_MESSAGES[loadingIdx]}</p>
                  <p className="text-[11px] text-muted-foreground">30-90 seconds typically</p>
                  <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-xs text-yellow-400 mx-auto max-w-sm">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Don&apos;t close the browser — generation continues across tabs
                  </div>
                </div>
              )}

              {motionGraphic.error && !motionGraphic.isGenerating && (
                <Card className="glass rounded-xl p-4 border-destructive/30">
                  <p className="text-sm text-destructive">{motionGraphic.error}</p>
                  <Button onClick={handleGenMG} size="sm" className="mt-3 rounded-lg bg-purple-600 hover:bg-purple-700 gap-1.5">Retry</Button>
                </Card>
              )}

              {motionGraphic.videoUrl && !motionGraphic.isGenerating && (
                <Card className="glass rounded-xl p-4 border-border/50">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Conversation</h4>
                  <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-2">
                    <div className="flex justify-end">
                      <div className="rounded-xl px-3 py-2 max-w-[90%] text-xs bg-purple-600/20 text-purple-200 border border-purple-500/30">
                        Generate a {state.idea?.tone} motion graphic for &ldquo;{state.idea?.topic?.slice(0, 60)}&rdquo;
                        <div className="text-[10px] text-purple-300/50 mt-1">{state.script?.fullText?.slice(0, 80)}...</div>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="rounded-xl px-3 py-2 text-xs bg-muted/50 text-muted-foreground border border-border/50">Generated {Math.max(Math.round(totalDur), 10)}s motion graphic</div>
                    </div>
                    {motionGraphic.chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`rounded-xl px-3 py-2 max-w-[85%] text-xs ${msg.role === "user" ? "bg-purple-600/20 text-purple-200 border border-purple-500/30" : "bg-muted/50 text-muted-foreground border border-border/50"}`}>{msg.content}</div>
                      </div>
                    ))}
                  </div>
                  {/* Attachments preview */}
                  {mgAttachments.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {mgAttachments.map((att, idx) => (
                        <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-purple-500/30">
                          <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                          <button onClick={() => setMgAttachments((p) => p.filter((_, j) => j !== idx))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[8px] flex items-center justify-center">×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input with attachment button */}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => mgFileInputRef.current?.click()} className="shrink-0 w-9 h-9 rounded-xl bg-muted border border-border/50 flex items-center justify-center text-muted-foreground hover:text-purple-400 hover:border-purple-500/30 transition-colors" title="Attach image">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input ref={mgFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleMgAttachment} />
                    <input ref={mgInputRef} type="text" value={mgPrompt} onChange={(e) => setMgPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRefineMG()} placeholder="Refine: more particles, add this image..." className="flex-1 rounded-xl bg-muted border border-border/50 px-3 py-2 text-sm focus:outline-none focus:border-purple-500/50" disabled={motionGraphic.isGenerating} />
                    <Button onClick={handleRefineMG} disabled={!mgPrompt.trim() || motionGraphic.isGenerating} size="sm" className="rounded-xl bg-purple-600 hover:bg-purple-700 px-3"><Send className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["More effects", "Slower", "Change colors", "Add images", "Regenerate"].map((s) => (
                      <button key={s} onClick={() => { if (s === "Regenerate") handleGenMG(); else { setMgPrompt(s); mgInputRef.current?.focus(); }}} className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20">{s}</button>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ═══ TAB 3: SUBTITLES ═══ */}
          {activeTab === "subtitles" && (
            <div className="space-y-5">
              {/* Audio source */}
              <Card className="glass rounded-xl p-4 border-cyan-500/20">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" /> Audio Source
                </h4>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button onClick={handleTranscribeFromVideo} className="glass rounded-xl p-3 border border-border/50 hover:border-cyan-500/30 text-left">
                    <Film className="w-4 h-4 text-cyan-400 mb-1" /><div className="text-xs font-medium">From User Video</div>
                  </button>
                  <button onClick={() => audioInputRef.current?.click()} className="glass rounded-xl p-3 border border-border/50 hover:border-cyan-500/30 text-left">
                    <Upload className="w-4 h-4 text-cyan-400 mb-1" /><div className="text-xs font-medium">Upload Audio</div>
                  </button>
                  <input ref={audioInputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleAudioUpload} />
                </div>
                {transcribedText && (
                  <textarea value={transcribedText} onChange={(e) => setTranscribedText(e.target.value)} rows={3} className="w-full rounded-xl bg-muted border border-border/50 px-3 py-2 text-xs focus:outline-none focus:border-cyan-500/50 resize-none" placeholder="Edit transcript..." />
                )}
              </Card>

              {/* Style presets — the big addition */}
              <Card className="glass rounded-xl p-4 border-border/50">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Style Presets</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SUBTITLE_PRESETS.map((p) => (
                    <button key={p.id} onClick={() => applyPreset(p)}
                      className={`rounded-xl p-2 border text-left transition-all ${activePreset.id === p.id ? "border-cyan-500 bg-cyan-500/10" : "border-border/50 hover:border-cyan-500/30"}`}>
                      {/* Mini preview */}
                      <div className="rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 p-2 mb-1.5 h-12 flex items-end justify-center overflow-hidden">
                        <span style={{
                          fontFamily: `'${p.fontFamily}', sans-serif`,
                          fontSize: "11px",
                          fontWeight: p.fontWeight,
                          fontStyle: p.italic ? "italic" : "normal",
                          color: p.color,
                          textTransform: p.uppercase ? "uppercase" : "none",
                          textShadow: p.curveStyle === "shadow" ? "0 1px 4px rgba(0,0,0,0.8)" : "none",
                          WebkitTextStroke: p.stroke ? "1px black" : undefined,
                          backgroundColor: p.bgColor !== "transparent" ? p.bgColor : undefined,
                          padding: p.bgColor !== "transparent" ? "1px 4px" : undefined,
                          borderRadius: "3px",
                        } as React.CSSProperties}>{p.label}</span>
                      </div>
                      <div className="text-[9px] font-medium">{p.label}</div>
                      <div className="text-[8px] text-muted-foreground">{p.description}</div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Fine-tune controls */}
              <Card className="glass rounded-xl p-4 border-border/50">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" /> Fine-Tune
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase mb-1 block">Font</label>
                    <select value={captionFont} onChange={(e) => setCaptionFont(e.target.value)} className="w-full rounded-lg bg-muted border border-border/50 px-2 py-1.5 text-xs">
                      {ALL_FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase mb-1 block">Size: {captionSize}px</label>
                    <input type="range" min="24" max="80" value={captionSize} onChange={(e) => setCaptionSize(Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase mb-1 block">Weight: {captionWeight}</label>
                    <input type="range" min="300" max="900" step="100" value={captionWeight} onChange={(e) => setCaptionWeight(Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase mb-1 block">Text Color</label>
                    <input type="color" value={captionColor} onChange={(e) => setCaptionColor(e.target.value)} className="w-full h-8 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase mb-1 block">Highlight</label>
                    <input type="color" value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} className="w-full h-8 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase mb-1 block">Position</label>
                    <div className="flex gap-1">
                      {(["top", "center", "bottom"] as const).map((p) => (
                        <button key={p} onClick={() => setSubtitlePos(p)} className={`flex-1 rounded-md px-1 py-1.5 text-[9px] border capitalize ${subtitlePos === p ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-border/50 text-muted-foreground"}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Toggle options */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { label: "Italic", val: captionItalic, set: setCaptionItalic },
                    { label: "UPPERCASE", val: captionUppercase, set: setCaptionUppercase },
                    { label: "Big/Small Mix", val: mixSizes, set: setMixSizes },
                    { label: "Text Outline", val: !!captionStroke, set: (v: boolean) => setCaptionStroke(v ? "2px black" : "") },
                  ].map((opt) => (
                    <button key={opt.label} onClick={() => opt.set(!opt.val)}
                      className={`text-[10px] px-3 py-1 rounded-full border transition-colors ${opt.val ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-border/50 text-muted-foreground hover:border-cyan-500/30"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Quick color swatches */}
                <div className="flex gap-1.5 mt-3">
                  {["#FFFFFF", "#FFD700", "#22D3EE", "#8B5CF6", "#EF4444", "#10B981", "#EC4899", "#FF6B6B", "#00FF88"].map((c) => (
                    <button key={c} onClick={() => setHighlightColor(c)} className={`w-5 h-5 rounded-md border-2 ${highlightColor === c ? "border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* ══ RIGHT: Persistent Preview ══ */}
        <div className="w-72 lg:w-80 shrink-0 hidden md:block">
          <div className="sticky top-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Final Preview · {totalDur.toFixed(1)}s</h3>
              <button onClick={() => setPreviewMuted(!previewMuted)} className="text-muted-foreground hover:text-foreground">
                {previewMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Sync play button */}
            <button
              onClick={() => {
                setSyncKey((k) => k + 1);
                setSubAnimFrame(0);
              }}
              className="w-full rounded-lg bg-muted/50 border border-border/50 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <Play className="w-3 h-3" /> Sync &amp; Replay All
            </button>

            <div className="rounded-2xl overflow-hidden border border-border/50 bg-black" style={{ aspectRatio: "9/16" }}>
              {state.template === "full-video-overlay" ? (
                <div className="relative w-full h-full">
                  <StitchedVideoPlayer
                    clips={clipSources}
                    muted={previewMuted}
                    syncKey={syncKey}
                    className="w-full h-full object-cover"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {motionGraphic.videoUrl && (
                    <video
                      key={`mg-${syncKey}`}
                      src={motionGraphic.videoUrl}
                      className="absolute inset-0 w-full h-full mix-blend-screen"
                      style={{ objectFit: "cover" }}
                      muted loop autoPlay playsInline
                    />
                  )}
                  {transcribedText && captionFont && (
                    <div className={`absolute left-3 right-3 flex flex-wrap justify-center gap-1 ${subtitlePos === "top" ? "top-4" : subtitlePos === "center" ? "top-1/2 -translate-y-1/2" : "bottom-4"}`}>
                      {renderSubtitleWords(transcribedText)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col">
                  {state.template === "top-graphic" ? (
                    <>
                      <div className="flex-1 bg-gradient-to-b from-[#0F0F23] to-[#1a1a3e] overflow-hidden">
                        {motionGraphic.videoUrl ? (
                          <video
                            key={`mg-${syncKey}`}
                            src={motionGraphic.videoUrl}
                            className="w-full h-full"
                            style={{ objectFit: "cover" }}
                            muted loop autoPlay playsInline
                          />
                        ) : <div className="w-full h-full flex items-center justify-center"><span className="text-[10px] text-purple-400/40">Motion Graphic</span></div>}
                      </div>
                      <div className="flex-1 bg-black overflow-hidden relative">
                        <StitchedVideoPlayer clips={clipSources} muted={previewMuted} syncKey={syncKey} className="w-full h-full object-cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {transcribedText && <div className="absolute bottom-2 left-2 right-2 flex flex-wrap justify-center gap-0.5">{renderSubtitleWords(transcribedText, 4)}</div>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 bg-black overflow-hidden relative">
                        <StitchedVideoPlayer clips={clipSources} muted={previewMuted} syncKey={syncKey} className="w-full h-full object-cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div className="flex-1 bg-gradient-to-b from-[#0F0F23] to-[#1a1a3e] overflow-hidden relative">
                        {motionGraphic.videoUrl ? (
                          <video
                            key={`mg-${syncKey}`}
                            src={motionGraphic.videoUrl}
                            className="w-full h-full"
                            style={{ objectFit: "cover" }}
                            muted loop autoPlay playsInline
                          />
                        ) : <div className="w-full h-full flex items-center justify-center"><span className="text-[10px] text-purple-400/40">Motion Graphic</span></div>}
                        {transcribedText && <div className="absolute bottom-2 left-2 right-2 flex flex-wrap justify-center gap-0.5">{renderSubtitleWords(transcribedText, 4)}</div>}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px]">
                <div className={`w-2 h-2 rounded-full ${timeline.length > 0 ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                <span className="text-muted-foreground">Video: {timeline.length > 0 ? `${timeline.length} clips` : "None"}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className={`w-2 h-2 rounded-full ${motionGraphic.videoUrl ? "bg-purple-500" : motionGraphic.isGenerating ? "bg-purple-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                <span className="text-muted-foreground">MG: {motionGraphic.videoUrl ? "Ready" : motionGraphic.isGenerating ? "Generating..." : "None"}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className={`w-2 h-2 rounded-full ${transcribedText ? "bg-cyan-500" : "bg-muted-foreground/30"}`} />
                <span className="text-muted-foreground">Subtitles: {transcribedText ? activePreset.label : "None"}</span>
              </div>
            </div>

            {motionGraphic.videoUrl && (
              <a href={motionGraphic.videoUrl} download="motion-graphic.mp4" className="flex items-center justify-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 py-1"><Download className="w-3 h-3" /> Download MG MP4</a>
            )}

            {/* Export full reel */}
            <div className="pt-1 border-t border-border/30">
              {renderVideo.isRendering ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{renderVideo.progressLabel || "Rendering..."}</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-border/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${renderVideo.progress}%` }}
                    />
                  </div>
                </div>
              ) : renderVideo.videoUrl ? (
                <button
                  onClick={renderVideo.downloadVideo}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 py-1"
                >
                  <Download className="w-3 h-3" /> Download Reel MP4
                </button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 rounded-lg border-primary/40 text-primary hover:bg-primary/10 text-xs"
                  disabled={timeline.length === 0}
                  onClick={handleExportReel}
                >
                  <Clapperboard className="w-3 h-3" />
                  Export Full Reel
                </Button>
              )}
              {renderVideo.error && (
                <p className="text-[10px] text-destructive mt-1 leading-tight">{renderVideo.error}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video popup player */}
      <VideoPopup
        src={popupVideo ?? ""}
        open={!!popupVideo}
        onClose={() => setPopupVideo(null)}
      />
    </StageWrapper>
  );
}
