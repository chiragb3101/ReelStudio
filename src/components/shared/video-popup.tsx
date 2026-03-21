"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface VideoPopupProps {
  src: string;
  open: boolean;
  onClose: () => void;
}

export function VideoPopup({ src, open, onClose }: VideoPopupProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [open, src]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white z-10">
          <X className="w-6 h-6" />
        </button>
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
          <video
            ref={videoRef}
            src={src}
            controls
            autoPlay
            playsInline
            className="w-full"
            style={{ aspectRatio: "9/16", maxHeight: "80vh" }}
          />
        </div>
      </div>
    </div>
  );
}
