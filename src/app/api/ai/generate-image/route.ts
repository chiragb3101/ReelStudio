import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateImageSchema } from "@/lib/api-schemas";

const SANDBOX_DIR = path.resolve(process.cwd(), "remotion-sandbox");
const PUBLIC_DIR = path.join(SANDBOX_DIR, "public", "generated");

/**
 * Generates an image or creates an SVG placeholder.
 * Never fails — always returns a usable path.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = generateImageSchema.safeParse(await req.json());
  if (!body.success) return new Response(body.error.message, { status: 400 });
  const { prompt, filename, width, height } = body.data;

  const apiKey = process.env.OPENROUTER_API_KEY;
  const w = width ?? 512;
  const h = height ?? 512;
  const safeName = (filename ?? `img-${Date.now()}.png`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const svgName = safeName.replace(/\.\w+$/, ".svg");

  await mkdir(PUBLIC_DIR, { recursive: true });

  // Try real image generation if API key and prompt available
  if (apiKey && prompt) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://reelstudio.app",
          "X-Title": "ReelStudio",
        },
        body: JSON.stringify({
          model: "stabilityai/stable-diffusion-xl-base-1.0",
          prompt,
          n: 1,
          size: `${w}x${h}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const imageUrl = data?.data?.[0]?.url ?? data?.data?.[0]?.b64_json;

        if (imageUrl) {
          if (imageUrl.startsWith("http")) {
            const imgRes = await fetch(imageUrl);
            if (imgRes.ok) {
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              await writeFile(path.join(PUBLIC_DIR, safeName), buffer);
              return NextResponse.json({ path: `generated/${safeName}` });
            }
          } else {
            const buffer = Buffer.from(imageUrl, "base64");
            await writeFile(path.join(PUBLIC_DIR, safeName), buffer);
            return NextResponse.json({ path: `generated/${safeName}` });
          }
        }
      }
    } catch {
      // Fall through to SVG placeholder
    }
  }

  // Fallback: create a rich SVG placeholder
  const colors = generateGradientFromPrompt(prompt ?? "image");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]}"/>
      <stop offset="100%" style="stop-color:${colors[1]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${colors[2]};stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:${colors[2]};stop-opacity:0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.3}" fill="url(#glow)"/>
  <circle cx="${w * 0.3}" cy="${h * 0.7}" r="${Math.min(w, h) * 0.15}" fill="${colors[2]}" opacity="0.1"/>
  <circle cx="${w * 0.8}" cy="${h * 0.2}" r="${Math.min(w, h) * 0.1}" fill="${colors[0]}" opacity="0.15"/>
</svg>`;

  await writeFile(path.join(PUBLIC_DIR, svgName), svg);
  return NextResponse.json({ path: `generated/${svgName}` });
}

function generateGradientFromPrompt(prompt: string): [string, string, string] {
  let hash = 0;
  for (const c of prompt) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 60) % 360;
  const hue3 = (hue1 + 180) % 360;
  return [
    `hsl(${hue1}, 70%, 25%)`,
    `hsl(${hue2}, 60%, 15%)`,
    `hsl(${hue3}, 80%, 50%)`,
  ];
}
