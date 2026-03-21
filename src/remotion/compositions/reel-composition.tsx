import {
  Sequence,
  Video,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { MotionGraphicRenderer } from "./motion-graphic-renderer";
import type { ReelEditSpec, ReelScene, TextPosition, VideoTemplate } from "@/lib/types";

interface ReelCompositionProps {
  editSpec: ReelEditSpec;
  assetUrls: Record<string, string>; // clipId → blob URL
}

export function ReelComposition({ editSpec, assetUrls }: ReelCompositionProps) {
  let frameOffset = 0;
  const template = editSpec.template ?? "full-video-overlay";

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        position: "relative",
        backgroundColor: "#000",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {editSpec.scenes.map((scene, i) => {
        const from = frameOffset;
        frameOffset += scene.durationFrames;

        return (
          <Sequence
            key={`scene-${i}`}
            from={from}
            durationInFrames={scene.durationFrames}
          >
            <SceneBlock
              scene={scene}
              accentColor={editSpec.accentColor}
              assetUrl={assetUrls[scene.clipId]}
              template={template}
              captionSettings={editSpec.captionSettings}
            />
          </Sequence>
        );
      })}
    </div>
  );
}

// ── Individual Scene ──

function SceneBlock({
  scene,
  accentColor,
  assetUrl,
  template,
  captionSettings,
}: {
  scene: ReelScene;
  accentColor: string;
  assetUrl?: string;
  template: VideoTemplate;
  captionSettings?: ReelEditSpec["captionSettings"];
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = scene.durationFrames;

  // ── Transition envelope ──
  const transFrames = 10;
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 80 },
    durationInFrames: transFrames,
  });
  const exitOpacity = interpolate(
    frame,
    [dur - transFrames, dur],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  let enterTransform = "";
  let enterOpacity = enterProgress;

  if (scene.transition === "slide-left") {
    const x = interpolate(enterProgress, [0, 1], [30, 0]);
    enterTransform = `translateX(${x}%)`;
  } else if (scene.transition === "zoom-in") {
    const scale = interpolate(enterProgress, [0, 1], [1.12, 1]);
    enterTransform = `scale(${scale})`;
  } else if (scene.transition === "cut") {
    enterOpacity = 1;
  }

  const combinedOpacity = enterOpacity * exitOpacity;

  // Determine caption style from settings or scene
  const effectiveCaptionStyle = captionSettings?.enabled === false
    ? "none"
    : (scene.captionStyle ?? "karaoke");
  const captionFontFamily = captionSettings?.fontFamily ?? "Inter";
  const captionFontSize = captionSettings?.fontSize ?? 46;
  const highlightColor = captionSettings?.highlightColor ?? accentColor;

  // ── Template Layouts ──
  if (template === "top-graphic" || template === "bottom-graphic") {
    const isTopGraphic = template === "top-graphic";
    const graphicHeight = 960;
    const videoHeight = 960;

    return (
      <div
        style={{
          width: 1080,
          height: 1920,
          position: "relative",
          opacity: combinedOpacity,
          transform: enterTransform,
          willChange: "opacity, transform",
        }}
      >
        {/* Motion Graphic Panel */}
        <div
          style={{
            position: "absolute",
            top: isTopGraphic ? 0 : videoHeight,
            left: 0,
            width: 1080,
            height: graphicHeight,
          }}
        >
          {scene.motionGraphic ? (
            <MotionGraphicRenderer
              spec={scene.motionGraphic}
              width={1080}
              height={graphicHeight}
            />
          ) : (
            <div
              style={{
                width: 1080,
                height: graphicHeight,
                background: "linear-gradient(180deg, #0F0F23 0%, #1a1a3e 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {scene.text && (
                <TextOverlay
                  text={scene.text}
                  position="center"
                  animation={scene.textAnimation ?? "slide-up"}
                  fps={fps}
                />
              )}
            </div>
          )}
        </div>

        {/* Video Panel */}
        <div
          style={{
            position: "absolute",
            top: isTopGraphic ? graphicHeight : 0,
            left: 0,
            width: 1080,
            height: videoHeight,
            overflow: "hidden",
          }}
        >
          {assetUrl && (
            <Video
              src={assetUrl}
              style={{
                width: 1080,
                height: videoHeight,
                objectFit: "cover",
              }}
            />
          )}
          {/* Captions on video panel */}
          {scene.captionText && effectiveCaptionStyle !== "none" && (
            <AnimatedCaptions
              text={scene.captionText}
              style={effectiveCaptionStyle as "karaoke" | "pop" | "typewriter"}
              accentColor={highlightColor}
              sceneDuration={dur}
              fps={fps}
              fontFamily={captionFontFamily}
              fontSize={captionFontSize}
              bottomOffset={60}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Full Video Overlay (default) ──
  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        position: "relative",
        opacity: combinedOpacity,
        transform: enterTransform,
        willChange: "opacity, transform",
      }}
    >
      {/* Full-bleed video */}
      {assetUrl && (
        <Video
          src={assetUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1080,
            height: 1920,
            objectFit: "cover",
          }}
        />
      )}

      {/* Motion graphic overlay (centered) */}
      {scene.motionGraphic && (
        <div
          style={{
            position: "absolute",
            top: 200,
            left: 0,
            width: 1080,
            height: 600,
            pointerEvents: "none",
          }}
        >
          <MotionGraphicRenderer
            spec={scene.motionGraphic}
            width={1080}
            height={600}
          />
        </div>
      )}

      {/* Dark gradient at bottom for text readability */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 800,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Text overlay */}
      {scene.text && !scene.motionGraphic && (
        <TextOverlay
          text={scene.text}
          position={scene.textPosition ?? "center"}
          animation={scene.textAnimation ?? "slide-up"}
          fps={fps}
        />
      )}

      {/* Animated captions */}
      {scene.captionText && effectiveCaptionStyle !== "none" && (
        <AnimatedCaptions
          text={scene.captionText}
          style={effectiveCaptionStyle as "karaoke" | "pop" | "typewriter"}
          accentColor={highlightColor}
          sceneDuration={dur}
          fps={fps}
          fontFamily={captionFontFamily}
          fontSize={captionFontSize}
        />
      )}
    </div>
  );
}

// ── Text Overlay ──

function TextOverlay({
  text,
  position,
  animation,
  fps,
}: {
  text: string;
  position: TextPosition;
  animation: string;
  fps: number;
}) {
  const frame = useCurrentFrame();

  const progress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
    durationInFrames: 15,
  });

  let translateY = 0;
  let scale = 1;
  let opacity = progress;

  if (animation === "slide-up") {
    translateY = interpolate(progress, [0, 1], [60, 0]);
  } else if (animation === "pop") {
    scale = interpolate(progress, [0, 1], [0.6, 1]);
  }

  const posStyle = getPositionStyle(position);
  const fontSize = position === "center" ? 72 : position === "lower-third" ? 42 : 54;

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        display: "flex",
        justifyContent: "center",
        ...posStyle,
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        willChange: "opacity, transform",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 800,
          color: "#FFFFFF",
          textAlign: "center",
          lineHeight: 1.2,
          textShadow: "0 4px 20px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.5)",
          letterSpacing: "-0.02em",
        }}
      >
        {text}
      </span>
    </div>
  );
}

function getPositionStyle(pos: TextPosition): React.CSSProperties {
  switch (pos) {
    case "top":
      return { top: 180 };
    case "center":
      return { top: 700 };
    case "bottom":
      return { bottom: 500 };
    case "lower-third":
      return { bottom: 350 };
    default:
      return { top: 700 };
  }
}

// ── Animated Captions ──

function AnimatedCaptions({
  text,
  style,
  accentColor,
  sceneDuration,
  fps,
  fontFamily = "Inter",
  fontSize = 46,
  bottomOffset = 180,
}: {
  text: string;
  style: "karaoke" | "pop" | "typewriter";
  accentColor: string;
  sceneDuration: number;
  fps: number;
  fontFamily?: string;
  fontSize?: number;
  bottomOffset?: number;
}) {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const startBuf = 8;
  const endBuf = 8;
  const usable = sceneDuration - startBuf - endBuf;
  const perWord = Math.max(4, Math.floor(usable / words.length));

  const linesOfWords: { text: string; startFrame: number; endFrame: number }[][] = [];
  let currentLine: typeof linesOfWords[0] = [];

  words.forEach((w, i) => {
    const sf = startBuf + i * perWord;
    const ef = sf + perWord;
    currentLine.push({ text: w, startFrame: sf, endFrame: ef });
    if (currentLine.length >= 4 || i === words.length - 1) {
      linesOfWords.push(currentLine);
      currentLine = [];
    }
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: bottomOffset,
        left: 60,
        right: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {linesOfWords.map((line, li) => {
        const lineStart = line[0].startFrame;
        const lineActive = frame >= lineStart - 3;

        if (!lineActive && style !== "karaoke") return null;

        const lineEntrance = spring({
          frame: Math.max(0, frame - lineStart + 3),
          fps,
          config: { damping: 14, stiffness: 120 },
        });

        return (
          <div
            key={li}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 6,
              opacity: style === "karaoke" ? 1 : lineEntrance,
              transform:
                style === "karaoke"
                  ? undefined
                  : `translateY(${interpolate(lineEntrance, [0, 1], [15, 0])}px)`,
            }}
          >
            {line.map((word, wi) => {
              const isActive = frame >= word.startFrame && frame < word.endFrame;
              const isPast = frame >= word.endFrame;
              const isVisible = frame >= word.startFrame - 2;

              const wordPop = isActive
                ? spring({
                    frame: frame - word.startFrame,
                    fps,
                    config: { damping: 10, stiffness: 200, mass: 0.4 },
                  })
                : 0;

              let bg = "rgba(0,0,0,0.45)";
              let color = "rgba(255,255,255,0.6)";
              let s = 1;

              if (style === "karaoke") {
                if (isActive) {
                  bg = accentColor;
                  color = "#000";
                  s = interpolate(wordPop, [0, 1], [0.92, 1.06]);
                } else if (isPast) {
                  bg = `${accentColor}BB`;
                  color = "#000";
                }
              } else if (style === "pop") {
                if (!isVisible) return null;
                if (isActive) {
                  bg = accentColor;
                  color = "#000";
                  s = interpolate(wordPop, [0, 1], [0.5, 1.15]);
                } else if (isPast) {
                  bg = "rgba(0,0,0,0.5)";
                  color = "#FFF";
                }
              } else if (style === "typewriter") {
                if (!isVisible) return null;
                bg = "rgba(0,0,0,0.55)";
                color = "#FFF";
              }

              return (
                <span
                  key={`${li}-${wi}`}
                  style={{
                    fontSize,
                    fontWeight: 800,
                    fontFamily: `'${fontFamily}', sans-serif`,
                    color,
                    backgroundColor: bg,
                    padding: "6px 14px",
                    borderRadius: 10,
                    display: "inline-block",
                    transform: `scale(${s})`,
                    letterSpacing: "-0.01em",
                    transition: "background-color 0.1s",
                  }}
                >
                  {word.text}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
