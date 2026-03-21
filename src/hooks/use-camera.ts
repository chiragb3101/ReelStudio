"use client";

import { useState, useRef, useCallback } from "react";

export function useCamera() {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startTimeRef = useRef<number>(0);

  const startCamera = useCallback(async (videoElement?: HTMLVideoElement) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: true,
      });
      setStream(mediaStream);
      if (videoElement) {
        videoElement.srcObject = mediaStream;
        videoRef.current = videoElement;
      }
      return mediaStream;
    } catch (err) {
      console.error("Camera access denied:", err);
      throw err;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startRecording = useCallback(
    (onData?: (blob: Blob, durationMs: number) => void) => {
      if (!stream) return;

      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2_500_000, // 2.5 Mbps for quality
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const durationMs = Date.now() - startTimeRef.current;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onData?.(blob, durationMs);
        chunksRef.current = [];
      };

      // Use larger timeslice to avoid choppy chunks, or no timeslice for best quality
      recorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
    },
    [stream]
  );

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      // Request final data before stopping to avoid cutting
      recorder.requestData();
      // Small delay to ensure final data is flushed
      setTimeout(() => {
        recorder.stop();
        setIsRecording(false);
      }, 100);
    } else {
      setIsRecording(false);
    }
  }, []);

  return {
    stream,
    isRecording,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
  };
}
