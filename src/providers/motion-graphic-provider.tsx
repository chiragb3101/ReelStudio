"use client";

import { createContext, useState, useCallback, useRef, type ReactNode } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface GenerateOptions {
  script: string;
  topic: string;
  tone: string;
  durationSeconds?: number;
  template?: string;
}

export interface MotionGraphicState {
  generate: (options: GenerateOptions) => Promise<void>;
  refine: (prompt: string) => Promise<void>;
  videoUrl: string | null;
  videoBlob: Blob | null;
  isGenerating: boolean;
  progress: string;
  error: string | null;
  chatHistory: ChatMessage[];
  hasContext: boolean;
}

export const MotionGraphicContext = createContext<MotionGraphicState | null>(null);

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function MotionGraphicProvider({ children }: { children: ReactNode }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const optionsRef = useRef<GenerateOptions | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  async function pollJobStatus(jobId: string, startedAt: number): Promise<void> {
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      setError("Render timed out after 5 minutes");
      setIsGenerating(false);
      setProgress("");
      return;
    }

    try {
      const res = await fetch(`/api/ai/motion-graphic/status?jobId=${jobId}`);
      if (!res.ok) {
        throw new Error(`Status check failed: ${res.status}`);
      }
      const data = await res.json();

      if (data.status === "done" && data.videoReady) {
        setProgress("Downloading video...");
        const videoRes = await fetch(`/api/ai/motion-graphic/video?jobId=${jobId}`);
        if (!videoRes.ok) throw new Error("Failed to download rendered video");

        const blob = await videoRes.blob();
        const url = URL.createObjectURL(blob);
        setVideoUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
        setVideoBlob(blob);
        setProgress("");
        setIsGenerating(false);
        return;
      }

      if (data.status === "error") {
        throw new Error(data.error || "Render failed");
      }

      // Still pending/rendering — poll again
      const statusLabel = data.status === "rendering" ? "Rendering motion graphic..." : "Waiting in queue...";
      setProgress(statusLabel);

      pollTimerRef.current = setTimeout(
        () => pollJobStatus(jobId, startedAt),
        POLL_INTERVAL_MS
      );
    } catch (err) {
      setError((err as Error).message);
      setProgress("");
      setIsGenerating(false);
    }
  }

  const callApi = useCallback(async (
    options: GenerateOptions,
    history: ChatMessage[],
    userPrompt?: string
  ) => {
    setIsGenerating(true);
    setError(null);
    setProgress("AI is writing Remotion code...");
    stopPolling();

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/motion-graphic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: options.script,
          topic: options.topic,
          tone: options.tone,
          durationSeconds: options.durationSeconds ?? 25,
          template: options.template,
          chatHistory: history,
          userPrompt,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || errData.details || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.async && data.jobId) {
        // Async mode: poll for completion
        setProgress("Queued for rendering...");
        pollTimerRef.current = setTimeout(
          () => pollJobStatus(data.jobId, Date.now()),
          POLL_INTERVAL_MS
        );
      } else {
        // Legacy sync mode (shouldn't happen anymore but handle gracefully)
        setProgress("");
        setIsGenerating(false);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
      setProgress("");
      setIsGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = useCallback(async (options: GenerateOptions) => {
    optionsRef.current = options;
    setChatHistory([]);
    await callApi(options, []);
  }, [callApi]);

  const refine = useCallback(async (prompt: string) => {
    if (!optionsRef.current) return;
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: prompt }];
    setChatHistory(newHistory);
    await callApi(optionsRef.current, newHistory, prompt);
    setChatHistory((prev) => [...prev, { role: "assistant", content: "(updated motion graphic)" }]);
  }, [callApi, chatHistory]);

  return (
    <MotionGraphicContext.Provider
      value={{
        generate,
        refine,
        videoUrl,
        videoBlob,
        isGenerating,
        progress,
        error,
        chatHistory,
        hasContext: optionsRef.current !== null,
      }}
    >
      {children}
    </MotionGraphicContext.Provider>
  );
}
