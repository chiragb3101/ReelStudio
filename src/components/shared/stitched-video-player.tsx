"use client";

import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";

interface ClipSource {
  blobUrl: string;
  startTime: number;
  endTime: number;
}

export interface StitchedVideoPlayerHandle {
  restart: () => void;
}

interface StitchedVideoPlayerProps {
  clips: ClipSource[];
  muted?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Increment this to force restart from clip 0 frame 0 */
  syncKey?: number;
}

export const StitchedVideoPlayer = forwardRef<StitchedVideoPlayerHandle, StitchedVideoPlayerProps>(
  function StitchedVideoPlayer({ clips, muted = false, className, style, syncKey }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const clip = clips[currentIdx];

    // Expose restart method
    useImperativeHandle(ref, () => ({
      restart() {
        setCurrentIdx(0);
        if (videoRef.current && clips[0]) {
          videoRef.current.src = clips[0].blobUrl;
          videoRef.current.currentTime = clips[0].startTime;
          videoRef.current.play().catch(() => {});
        }
      },
    }), [clips]);

    // Restart when syncKey changes (e.g. motion graphic finishes)
    useEffect(() => {
      if (syncKey === undefined) return;
      setCurrentIdx(0);
      if (videoRef.current && clips[0]) {
        videoRef.current.src = clips[0].blobUrl;
        videoRef.current.currentTime = clips[0].startTime;
        videoRef.current.play().catch(() => {});
      }
    }, [syncKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // When clip index changes, load and play
    useEffect(() => {
      const vid = videoRef.current;
      if (!vid || !clip) return;
      vid.src = clip.blobUrl;
      vid.currentTime = clip.startTime;
      vid.play().catch(() => {});
    }, [currentIdx, clip?.blobUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleTimeUpdate = useCallback(() => {
      const vid = videoRef.current;
      if (!vid || !clip) return;
      if (vid.currentTime >= clip.endTime) {
        vid.pause();
        setCurrentIdx((prev) => (prev + 1) % clips.length);
      }
    }, [clip, clips.length]);

    const handleEnded = useCallback(() => {
      setCurrentIdx((prev) => (prev + 1) % clips.length);
    }, [clips.length]);

    if (clips.length === 0) {
      return (
        <div className={className} style={{ ...style, background: "linear-gradient(to bottom, #18181b, #09090b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#666", fontSize: 12 }}>No video</span>
        </div>
      );
    }

    return (
      <video
        ref={videoRef}
        className={className}
        style={style}
        muted={muted}
        playsInline
        autoPlay
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
    );
  }
);
