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
  apiKey: string;
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

export function MotionGraphicProvider({ children }: { children: ReactNode }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const optionsRef = useRef<GenerateOptions | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const callApi = useCallback(async (
    options: GenerateOptions,
    history: ChatMessage[],
    userPrompt?: string
  ) => {
    setIsGenerating(true);
    setError(null);
    setProgress("AI is writing Remotion code...");

    // Abort any previous in-flight request
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
          apiKey: options.apiKey,
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

      setProgress("Rendering complete!");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Revoke previous
      setVideoUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      setVideoBlob(blob);
      setProgress("");
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // intentional abort
      setError((err as Error).message);
      setProgress("");
    } finally {
      setIsGenerating(false);
    }
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
