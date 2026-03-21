export interface ThumbnailDesign {
  style: string;
  headline: string;
  subtext?: string;
  gradientFrom: string;
  gradientVia?: string;
  gradientTo: string;
  gradientAngle?: number;
  textColor: string;
  subtextColor?: string;
  emoji?: string;
  accentShape?: "circle" | "none" | "stripe";
}

const WIDTH = 1080;
const HEIGHT = 1920;

/**
 * Renders a thumbnail design to a data URL.
 * If a frameDataUrl is provided, it's used as the background image
 * with a colored overlay for the design's gradient.
 */
export function renderThumbnailToDataUrl(
  design: ThumbnailDesign,
  frameDataUrl?: string
): string {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // If we have a video frame, draw it as background first
  if (frameDataUrl) {
    const img = new Image();
    img.src = frameDataUrl;
    // Draw synchronously since it's a data URL (already loaded)
    ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);

    // Apply a colored overlay for brand feel
    const angle = (design.gradientAngle ?? 180) * (Math.PI / 180);
    const x0 = WIDTH / 2 - (Math.sin(angle) * WIDTH) / 2;
    const y0 = HEIGHT / 2 - (Math.cos(angle) * HEIGHT) / 2;
    const x1 = WIDTH / 2 + (Math.sin(angle) * WIDTH) / 2;
    const y1 = HEIGHT / 2 + (Math.cos(angle) * HEIGHT) / 2;

    const overlay = ctx.createLinearGradient(x0, y0, x1, y1);
    overlay.addColorStop(0, hexToRgba(design.gradientFrom, 0.6));
    overlay.addColorStop(1, hexToRgba(design.gradientTo, 0.75));
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Extra dark overlay at bottom for text readability
    const bottomDark = ctx.createLinearGradient(0, HEIGHT * 0.5, 0, HEIGHT);
    bottomDark.addColorStop(0, "rgba(0,0,0,0)");
    bottomDark.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = bottomDark;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else {
    // Fallback: pure gradient background
    const angle = (design.gradientAngle ?? 180) * (Math.PI / 180);
    const x0 = WIDTH / 2 - (Math.sin(angle) * WIDTH) / 2;
    const y0 = HEIGHT / 2 - (Math.cos(angle) * HEIGHT) / 2;
    const x1 = WIDTH / 2 + (Math.sin(angle) * WIDTH) / 2;
    const y1 = HEIGHT / 2 + (Math.cos(angle) * HEIGHT) / 2;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, design.gradientFrom);
    if (design.gradientVia) grad.addColorStop(0.5, design.gradientVia);
    grad.addColorStop(1, design.gradientTo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Accent shapes
  if (design.accentShape === "circle") {
    ctx.beginPath();
    ctx.arc(WIDTH / 2, HEIGHT * 0.35, 280, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(WIDTH * 0.8, HEIGHT * 0.75, 180, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
  } else if (design.accentShape === "stripe") {
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, HEIGHT * 0.1 + i * 100, WIDTH, 40);
    }
    ctx.restore();
  }

  // Noise/grain overlay for texture
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();

  // Emoji
  if (design.emoji) {
    ctx.font = `${design.style === "Face-Forward" ? "280" : "160"}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const emojiY =
      design.style === "Face-Forward" ? HEIGHT * 0.38 : HEIGHT * 0.28;
    ctx.fillText(design.emoji, WIDTH / 2, emojiY);
  }

  // Headline
  const headlineSize = getHeadlineSize(design.headline, design.style);
  ctx.font = `900 ${headlineSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = design.textColor;

  // Strong text shadow for readability over video frames
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 6;

  const headlineY =
    design.style === "Face-Forward" ? HEIGHT * 0.62 : HEIGHT * 0.52;
  wrapText(
    ctx,
    design.headline.toUpperCase(),
    WIDTH / 2,
    headlineY,
    WIDTH - 120,
    headlineSize * 1.15
  );

  ctx.shadowColor = "transparent";

  // Subtext
  if (design.subtext) {
    ctx.font = `500 ${48}px "Inter", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = design.subtextColor || "rgba(255,255,255,0.8)";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 12;
    const subtextY =
      design.style === "Face-Forward" ? HEIGHT * 0.76 : HEIGHT * 0.68;
    ctx.fillText(design.subtext, WIDTH / 2, subtextY);
    ctx.shadowColor = "transparent";
  }

  // Bottom accent bar
  const barGrad = ctx.createLinearGradient(0, HEIGHT - 10, WIDTH, HEIGHT - 10);
  barGrad.addColorStop(0, design.gradientFrom);
  barGrad.addColorStop(1, design.textColor);
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, HEIGHT - 10, WIDTH, 10);

  return canvas.toDataURL("image/png");
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function getHeadlineSize(text: string, style: string): number {
  const words = text.split(" ").length;
  if (style === "Text-Dominant") {
    if (words <= 2) return 140;
    if (words <= 4) return 110;
    return 88;
  }
  if (words <= 3) return 100;
  if (words <= 5) return 80;
  return 68;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}
