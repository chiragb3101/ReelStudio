import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export function useAnimatedOpacity(
  startFrame: number,
  durationInFrames: number,
  fadeInDuration = 10,
  fadeOutDuration = 10
) {
  const frame = useCurrentFrame();

  return interpolate(
    frame,
    [
      startFrame,
      startFrame + fadeInDuration,
      startFrame + durationInFrames - fadeOutDuration,
      startFrame + durationInFrames,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
}

export function useSlideUp(startFrame: number, distance = 40) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  return {
    translateY: interpolate(progress, [0, 1], [distance, 0]),
    opacity: progress,
  };
}

export function useFadeIn(startFrame: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 20, stiffness: 80 },
  });
}

export function useTypewriter(text: string, startFrame: number, speed = 2) {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(Math.floor(elapsed / speed), text.length);
  return text.slice(0, charCount);
}

export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}
