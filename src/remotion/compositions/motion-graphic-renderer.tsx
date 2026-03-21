import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
} from "remotion";
import type { MotionGraphicSpec, MotionGraphicElement } from "@/lib/types";

interface MotionGraphicRendererProps {
  spec: MotionGraphicSpec;
  width: number;
  height: number;
}

export function MotionGraphicRenderer({ spec, width, height }: MotionGraphicRendererProps) {
  const { fps } = useVideoConfig();

  // Background
  const bg = spec.background;
  const bgStyle: React.CSSProperties =
    bg.type === "gradient"
      ? {
          background: `linear-gradient(180deg, ${bg.from} 0%, ${bg.to ?? bg.from} 100%)`,
        }
      : { backgroundColor: bg.from };

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        ...bgStyle,
      }}
    >
      {spec.elements.map((element, i) => {
        const enterFrame = Math.round((element.enterAtMs / 1000) * fps);
        const exitFrame = element.exitAtMs
          ? Math.round((element.exitAtMs / 1000) * fps)
          : undefined;
        const duration = exitFrame ? exitFrame - enterFrame : undefined;

        return (
          <Sequence
            key={i}
            from={enterFrame}
            durationInFrames={duration}
          >
            <ElementRenderer element={element} width={width} />
          </Sequence>
        );
      })}
    </div>
  );
}

function ElementRenderer({ element, width }: { element: MotionGraphicElement; width: number }) {
  switch (element.type) {
    case "text":
      return <AnimatedText element={element} width={width} />;
    case "counter":
      return <AnimatedCounter element={element} />;
    case "highlightedText":
      return <HighlightedText element={element} width={width} />;
    case "bulletList":
      return <BulletList element={element} width={width} />;
    default:
      return null;
  }
}

// ── Animated Text ──

function AnimatedText({ element, width }: { element: MotionGraphicElement; width: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fontSize = element.fontSize ?? 54;
  const fontWeight = element.fontWeight ?? 700;
  const color = element.color ?? "#FFFFFF";

  const anim = useAnimation(frame, fps, element.animation);

  if (element.animation === "typewriter" && element.content) {
    const totalChars = element.content.length;
    const charsPerFrame = totalChars / (fps * 1.5); // reveal over 1.5s
    const visibleChars = Math.min(Math.floor(frame * charsPerFrame), totalChars);
    const visibleText = element.content.slice(0, visibleChars);

    return (
      <div style={{ ...getPositionStyle(element.position), width: width - 80, padding: "0 40px" }}>
        <span
          style={{
            fontSize,
            fontWeight,
            color,
            lineHeight: 1.3,
            textAlign: "center",
            display: "block",
            whiteSpace: "pre-wrap",
          }}
        >
          {visibleText}
          <span style={{ opacity: frame % 30 > 15 ? 1 : 0 }}>|</span>
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...getPositionStyle(element.position),
        width: width - 80,
        padding: "0 40px",
        opacity: anim.opacity,
        transform: anim.transform,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight,
          color,
          lineHeight: 1.3,
          textAlign: "center",
          display: "block",
          whiteSpace: "pre-wrap",
          textShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      >
        {element.content}
      </span>
    </div>
  );
}

// ── Counter ──

function AnimatedCounter({ element }: { element: MotionGraphicElement }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const from = element.from ?? 0;
  const to = element.to ?? 100;
  const suffix = element.suffix ?? "";
  const color = element.color ?? "#22D3EE";
  const fontSize = element.fontSize ?? 96;

  // Animate counter over 1.5 seconds
  const countProgress = spring({
    frame,
    fps,
    config: { damping: 30, stiffness: 60 },
    durationInFrames: Math.round(fps * 1.5),
  });

  const currentValue = Math.round(interpolate(countProgress, [0, 1], [from, to]));

  const scaleIn = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: 10,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${interpolate(scaleIn, [0, 1], [0.8, 1])})`,
        opacity: scaleIn,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 900,
          color,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
        }}
      >
        {currentValue}
        {suffix}
      </span>
    </div>
  );
}

// ── Highlighted Text ──

function HighlightedText({ element, width }: { element: MotionGraphicElement; width: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const content = element.content ?? "";
  const highlightWords = element.highlightWords ?? [];
  const highlightColor = element.highlightColor ?? "#8B5CF6";
  const color = element.color ?? "#FFFFFF";
  const fontSize = element.fontSize ?? 54;

  const anim = useAnimation(frame, fps, element.animation);

  const words = content.split(/\s+/);
  const lowerHighlight = highlightWords.map((w) => w.toLowerCase());

  // Highlight appears after text is in
  const highlightProgress = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 14, stiffness: 120 },
    durationInFrames: 15,
  });

  return (
    <div
      style={{
        ...getPositionStyle(element.position),
        width: width - 80,
        padding: "0 40px",
        opacity: anim.opacity,
        transform: anim.transform,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {words.map((word, i) => {
        const isHighlighted = lowerHighlight.includes(word.replace(/[.,!?;:'"]/g, "").toLowerCase());
        return (
          <span
            key={i}
            style={{
              fontSize,
              fontWeight: isHighlighted ? 900 : 600,
              color: isHighlighted ? "#000" : color,
              backgroundColor: isHighlighted
                ? interpolate(highlightProgress, [0, 1], [0, 1]) > 0.5
                  ? highlightColor
                  : "transparent"
                : "transparent",
              padding: isHighlighted ? "4px 12px" : "4px 0",
              borderRadius: isHighlighted ? 8 : 0,
              lineHeight: 1.5,
              display: "inline-block",
              transition: "background-color 0.2s",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

// ── Bullet List ──

function BulletList({ element, width }: { element: MotionGraphicElement; width: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = element.items ?? [];
  const staggerMs = element.staggerMs ?? 400;
  const staggerFrames = Math.round((staggerMs / 1000) * fps);
  const color = element.color ?? "#FFFFFF";
  const fontSize = element.fontSize ?? 42;

  return (
    <div
      style={{
        ...getPositionStyle(element.position),
        width: width - 120,
        padding: "0 60px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {items.map((item, i) => {
        const itemFrame = frame - i * staggerFrames;
        if (itemFrame < 0) return null;

        const entrance = spring({
          frame: itemFrame,
          fps,
          config: { damping: 14, stiffness: 100 },
          durationInFrames: 12,
        });

        const translateX = interpolate(entrance, [0, 1], [40, 0]);

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              opacity: entrance,
              transform: `translateX(${translateX}px)`,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: element.highlightColor ?? "#22D3EE",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize,
                fontWeight: 600,
                color,
                lineHeight: 1.4,
              }}
            >
              {item}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared Helpers ──

function useAnimation(frame: number, fps: number, animation: string = "fadeIn") {
  const progress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
    durationInFrames: 15,
  });

  let opacity = progress;
  let translateY = 0;
  let scale = 1;

  switch (animation) {
    case "slideUp":
      translateY = interpolate(progress, [0, 1], [60, 0]);
      break;
    case "pop":
      scale = interpolate(progress, [0, 1], [0.5, 1]);
      break;
    case "fadeIn":
    default:
      break;
  }

  return {
    opacity,
    transform: `translateY(${translateY}px) scale(${scale})`,
  };
}

function getPositionStyle(position?: string): React.CSSProperties {
  switch (position) {
    case "top":
      return { marginTop: 40 };
    case "bottom":
      return { marginBottom: 40 };
    case "center":
    default:
      return {};
  }
}
