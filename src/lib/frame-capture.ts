/**
 * Capture a frame from a video blob at a given time offset.
 * Returns a base64 data URL of the captured frame.
 */
export function captureFrameFromBlob(
  blob: Blob,
  timeSeconds: number = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(blob);
    video.src = url;

    video.onloadedmetadata = () => {
      // Clamp time to video duration
      const seekTime = Math.min(timeSeconds, video.duration * 0.8);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      // Use a smaller resolution for the AI — 540x960 is enough
      canvas.width = 540;
      canvas.height = 960;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video for frame capture"));
    };
  });
}

/**
 * Capture multiple frames from multiple clips.
 * Returns array of base64 data URLs.
 */
export async function captureFramesFromClips(
  clips: { blob: Blob; duration?: number }[],
  framesPerClip: number = 1
): Promise<string[]> {
  const frames: string[] = [];

  for (const clip of clips) {
    const duration = clip.duration ?? 5;
    for (let i = 0; i < framesPerClip; i++) {
      // Spread captures across clip duration
      const time =
        framesPerClip === 1
          ? duration * 0.3 // Single frame: capture at 30%
          : (duration / (framesPerClip + 1)) * (i + 1);

      try {
        const frame = await captureFrameFromBlob(clip.blob, time);
        frames.push(frame);
      } catch {
        // Skip failed captures
      }
    }
  }

  return frames;
}
