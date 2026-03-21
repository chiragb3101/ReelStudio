"use client";

import { useState, useRef, useCallback } from "react";
import type { TranscribedWord } from "@/lib/types";

interface TranscriptionResult {
  words: TranscribedWord[];
  fullText: string;
}

interface UseTranscriptionReturn {
  start: () => void;
  stop: () => TranscriptionResult;
  isSupported: boolean;
  isActive: boolean;
  transcription: TranscriptionResult;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

export function useTranscription(): UseTranscriptionReturn {
  const [isActive, setIsActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const wordsRef = useRef<TranscribedWord[]>([]);
  const startTimeRef = useRef<number>(0);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!isSupported) return;

    wordsRef.current = [];
    startTimeRef.current = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const elapsed = Date.now() - startTimeRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;

        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;
        const resultWords = transcript.split(/\s+/).filter(Boolean);

        // Distribute words with ~300ms spacing from current timestamp
        const wordDurationMs = 300;
        let wordStartMs = elapsed - resultWords.length * wordDurationMs;
        if (wordStartMs < 0) wordStartMs = 0;

        // Don't overlap with last word's endMs
        const lastWord = wordsRef.current[wordsRef.current.length - 1];
        if (lastWord && wordStartMs < lastWord.endMs) {
          wordStartMs = lastWord.endMs + 50;
        }

        for (const word of resultWords) {
          wordsRef.current.push({
            text: word,
            startMs: wordStartMs,
            endMs: wordStartMs + wordDurationMs,
            confidence,
          });
          wordStartMs += wordDurationMs;
        }
      }
    };

    recognition.onerror = () => {
      // Silently handle — transcription is best-effort
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsActive(true);
  }, [isSupported]);

  const stop = useCallback((): TranscriptionResult => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsActive(false);

    const words = [...wordsRef.current];
    const fullText = words.map((w) => w.text).join(" ");
    return { words, fullText };
  }, []);

  return {
    start,
    stop,
    isSupported,
    isActive,
    transcription: {
      words: wordsRef.current,
      fullText: wordsRef.current.map((w) => w.text).join(" "),
    },
  };
}
