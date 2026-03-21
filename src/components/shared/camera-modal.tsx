"use client";

import { useRef, useState, useEffect } from "react";
import {
  X, Circle, Square, ChevronUp, ChevronDown,
  FlipHorizontal2, Mic, MicOff,
  PanelLeft, PanelRight, PanelTop, PanelBottom, Layers,
} from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useTranscription } from "@/hooks/use-transcription";
import { Button } from "@/components/ui/button";
import type { ShotItem, ScriptSegment, ClipTranscription } from "@/lib/types";

type PrompterPosition = "left" | "right" | "top" | "bottom" | "overlay";

interface PrompterData {
  shot: ShotItem;
  shotIndex: number;
  totalShots: number;
  scriptHook: string;
  scriptBody: string;
  scriptCta: string;
  segment?: ScriptSegment;
}

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onRecorded: (blob: Blob, durationMs: number, transcription?: ClipTranscription) => void;
  prompter?: PrompterData;
}

export type { PrompterData };

const POSITION_OPTIONS: { id: PrompterPosition; icon: typeof PanelLeft; label: string }[] = [
  { id: "left", icon: PanelLeft, label: "Left" },
  { id: "right", icon: PanelRight, label: "Right" },
  { id: "top", icon: PanelTop, label: "Top" },
  { id: "bottom", icon: PanelBottom, label: "Bottom" },
  { id: "overlay", icon: Layers, label: "Overlay" },
];

export function CameraModal({ open, onClose, onRecorded, prompter }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prompterRef = useRef<HTMLDivElement>(null);
  const { stream, isRecording, startCamera, stopCamera, startRecording, stopRecording } = useCamera();
  const transcription = useTranscription();
  const [timer, setTimer] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [mirrored, setMirrored] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const scrollAnimRef = useRef<number>(0);
  const [prompterPos, setPrompterPos] = useState<PrompterPosition>("left");

  const estimatedSeconds = prompter?.segment?.estimatedSeconds
    ?? (typeof prompter?.shot?.duration === "number" ? prompter.shot.duration : 0);

  useEffect(() => {
    if (open && videoRef.current) startCamera(videoRef.current);
    return () => { stopCamera(); if (intervalRef.current) clearInterval(intervalRef.current); cancelAnimationFrame(scrollAnimRef.current); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isRecording || scrollSpeed === 0 || !prompterRef.current) { cancelAnimationFrame(scrollAnimRef.current); return; }
    const el = prompterRef.current;
    const px = scrollSpeed * 0.5;
    function scroll() { if (el) el.scrollTop += px; scrollAnimRef.current = requestAnimationFrame(scroll); }
    scrollAnimRef.current = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(scrollAnimRef.current);
  }, [isRecording, scrollSpeed]);

  useEffect(() => { setScrollSpeed(isRecording ? 3 : 0); }, [isRecording]);

  function handleRecord() {
    if (isRecording) {
      stopRecording();
      clearInterval(intervalRef.current);
      transcription.stop();
      setTimer(0);
    } else {
      if (prompterRef.current) prompterRef.current.scrollTop = 0;
      if (transcription.isSupported) transcription.start();
      startRecording((blob, durationMs) => {
        const tx = transcription.isActive ? transcription.stop() : { words: [], fullText: "" };
        const clipTx: ClipTranscription | undefined = tx.words.length > 0
          ? { shotId: prompter?.shot?.id ?? "", words: tx.words, fullText: tx.fullText }
          : undefined;
        onRecorded(blob, durationMs, clipTx);
        stopCamera();
        onClose();
      });
      setTimer(0);
      intervalRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
  }

  function formatTime(s: number) { const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, "0")}`; }

  if (!open) return null;

  const lines = buildPrompterLines(prompter);
  const progressPct = estimatedSeconds > 0 ? Math.min((timer / estimatedSeconds) * 100, 100) : 0;
  const progressColor = progressPct < 70 ? "bg-green-500" : progressPct < 90 ? "bg-yellow-500" : "bg-red-500";

  const isHorizontal = prompterPos === "left" || prompterPos === "right";
  const isOverlay = prompterPos === "overlay";

  // ── Prompter content (reused in all positions) ──
  const prompterContent = prompter && (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Teleprompter</span>
        </div>
        <div className="flex items-center gap-2">
          {transcription.isSupported && (transcription.isActive ? <Mic className="w-3 h-3 text-green-400 animate-pulse" /> : <MicOff className="w-3 h-3 text-white/30" />)}
          <span className="text-[10px] text-white/50">Shot {prompter.shotIndex + 1}/{prompter.totalShots}</span>
        </div>
      </div>

      {/* Shot info + pace */}
      <div className="px-4 py-2 bg-primary/10 border-b border-white/10 shrink-0">
        <p className="text-xs font-medium text-primary">{prompter.shot.description}</p>
        <div className="flex gap-3 mt-0.5 text-[10px] text-white/50">
          <span>{typeof prompter.shot.duration === "number" ? `${prompter.shot.duration.toFixed(1)}s` : prompter.shot.duration}</span>
          <span>{prompter.shot.angle}</span>
          {estimatedSeconds > 0 && <span className="text-primary/70">~{estimatedSeconds.toFixed(0)}s pace</span>}
        </div>
      </div>

      {/* Progress bar */}
      {isRecording && estimatedSeconds > 0 && (
        <div className="px-4 py-1.5 border-b border-white/10 shrink-0">
          <div className="flex justify-between text-[9px] text-white/40 mb-0.5">
            <span>Pacing</span>
            <span className="font-mono">{timer}s / {estimatedSeconds.toFixed(0)}s</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${progressColor}`} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Script text */}
      <div ref={prompterRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollBehavior: scrollSpeed > 0 ? "auto" : "smooth" }}>
        <div className={isOverlay ? "h-[10vh]" : "h-[30vh]"} />
        {lines.map((line, i) => (
          <div key={i} className="mb-4">
            {line.label && (
              <div className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-1 ${
                line.type === "hook" ? "text-red-400" : line.type === "cta" ? "text-cyan-400" : line.type === "direction" ? "text-yellow-400/70" : "text-primary/70"
              }`}>{line.label}</div>
            )}
            <p className={`leading-[1.7] ${
              line.type === "direction" ? "text-sm text-yellow-200/60 italic" : isOverlay ? "text-xl font-medium text-white" : "text-2xl font-medium text-white"
            }`}>
              {line.emphasisWords ? renderEmphasis(line.text, line.emphasisWords) : line.text}
            </p>
          </div>
        ))}
        <div className="h-[50vh]" />
      </div>

      {/* Scroll speed */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 px-3 py-2 border-t border-white/10 bg-black/80 shrink-0">
          <span className="text-[9px] uppercase tracking-wider text-white/40 mr-1">Speed</span>
          <button onClick={() => setScrollSpeed(Math.max(0, scrollSpeed - 1))} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><ChevronDown className="w-3 h-3 text-white/70" /></button>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3].map((l) => <button key={l} onClick={() => setScrollSpeed(l)} className={`w-5 h-1 rounded-full ${scrollSpeed >= l ? "bg-primary" : "bg-white/15"}`} />)}
          </div>
          <button onClick={() => setScrollSpeed(Math.min(3, scrollSpeed + 1))} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><ChevronUp className="w-3 h-3 text-white/70" /></button>
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black flex">
      {/* Position picker */}
      {prompter && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10">
          {POSITION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPrompterPos(opt.id)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                prompterPos === opt.id ? "bg-primary text-primary-foreground" : "text-white/50 hover:text-white hover:bg-white/10"
              }`}
              title={opt.label}
            >
              <opt.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      )}

      {/* Layout depends on position */}
      <div className={`flex-1 flex ${
        isOverlay ? "" :
        prompterPos === "top" || prompterPos === "bottom" ? "flex-col" :
        prompterPos === "right" ? "flex-row-reverse" : "flex-row"
      }`}>
        {/* Prompter panel (non-overlay) */}
        {prompter && !isOverlay && (
          <div className={`flex flex-col bg-black/95 border-white/10 ${
            isHorizontal ? "w-72 lg:w-80 border-r" : "h-52 border-b"
          } ${prompterPos === "right" ? "border-l border-r-0" : ""} ${prompterPos === "bottom" ? "border-t border-b-0" : ""}`}>
            {prompterContent}
          </div>
        )}

        {/* Camera area */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Close */}
          <button onClick={() => { if (transcription.isActive) transcription.stop(); stopCamera(); onClose(); }} className="absolute top-10 right-4 z-20 text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>

          {/* Timer */}
          {isRecording && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-600/80 px-3 py-1 rounded-full text-white text-sm font-mono z-20">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {formatTime(timer)}
            </div>
          )}

          {/* Overlay prompter */}
          {prompter && isOverlay && (
            <div className="absolute inset-x-0 top-16 bottom-28 z-10 flex flex-col bg-black/60 backdrop-blur-sm mx-4 rounded-xl border border-white/10 overflow-hidden pointer-events-auto">
              {prompterContent}
            </div>
          )}

          {/* Video */}
          <div className="relative w-full max-w-sm">
            <video
              ref={videoRef}
              autoPlay muted playsInline
              className="w-full h-auto rounded-2xl object-cover"
              style={{ aspectRatio: "9/16", transform: mirrored ? "scaleX(-1)" : "none" }}
            />
            <button onClick={() => setMirrored((m) => !m)} className={`absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center ${mirrored ? "bg-white/20 text-white" : "bg-white/10 text-white/50"} hover:bg-white/30 backdrop-blur-sm`}>
              <FlipHorizontal2 className="w-4 h-4" />
            </button>
          </div>

          {/* Record button */}
          <div className="mt-6">
            <Button onClick={handleRecord} size="lg" className={`w-20 h-20 rounded-full ${isRecording ? "bg-red-600 hover:bg-red-700" : "bg-white hover:bg-white/90"}`}>
              {isRecording ? <Square className="w-8 h-8 text-white" /> : <Circle className="w-8 h-8 text-red-600 fill-red-600" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function renderEmphasis(text: string, emphasisWords: string[]) {
  if (!emphasisWords?.length) return text;
  const lower = emphasisWords.map((w) => w.toLowerCase());
  return text.split(/(\s+)/).map((part, i) => {
    const clean = part.replace(/[.,!?;:'"]/g, "").toLowerCase();
    if (lower.includes(clean)) return <span key={i} className="text-primary font-bold">{part}</span>;
    return part;
  });
}

interface PrompterLine { label?: string; text: string; type: "hook" | "body" | "cta" | "direction"; emphasisWords?: string[]; }

function buildPrompterLines(prompter?: PrompterData): PrompterLine[] {
  if (!prompter) return [];
  const lines: PrompterLine[] = [];

  if (prompter.shot.notes) lines.push({ label: "Direction", text: prompter.shot.notes, type: "direction" });

  if (prompter.segment) {
    const seg = prompter.segment;
    const isHook = prompter.shotIndex === 0;
    const isCta = prompter.shotIndex === prompter.totalShots - 1;
    const label = isHook ? "Hook" : isCta ? "Call to Action" : "Say";
    const type = (isHook ? "hook" : isCta ? "cta" : "body") as "hook" | "body" | "cta";
    const sentences = seg.text.split(/(?<=[.!?])\s+/).filter(Boolean);
    for (const sentence of sentences) {
      lines.push({ label: lines.length === (prompter.shot.notes ? 1 : 0) ? label : undefined, text: sentence, type, emphasisWords: seg.emphasisWords });
    }
    return lines;
  }

  const { shotIndex, totalShots, scriptHook, scriptBody, scriptCta } = prompter;
  if (shotIndex === 0) lines.push({ label: "Hook", text: scriptHook, type: "hook" });
  if (shotIndex === totalShots - 1) lines.push({ label: "Call to Action", text: scriptCta, type: "cta" });
  if (scriptBody) {
    const sentences = scriptBody.split(/(?<=[.!?])\s+/).filter(Boolean);
    const per = Math.max(1, Math.ceil(sentences.length / totalShots));
    const slice = sentences.slice(shotIndex * per, Math.min((shotIndex + 1) * per, sentences.length));
    if (slice.length > 0) lines.push({ label: shotIndex === 0 ? "Then say" : "Say", text: slice.join(" "), type: "body" });
  }
  return lines;
}
