import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callOpenRouter } from "@/lib/openrouter";
import { motionGraphicSchema } from "@/lib/api-schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildMotionGraphicPrompt } from "@/lib/prompts/remotion-skills";
import { writeFile, readFile, mkdir } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

const SANDBOX_DIR = path.resolve(process.cwd(), "remotion-sandbox");
const COMPOSITION_PATH = path.join(SANDBOX_DIR, "src", "MotionGraphic.tsx");
const OUTPUT_DIR = path.join(SANDBOX_DIR, "out");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "video.mp4");
const SKILLS_PATH = path.join(SANDBOX_DIR, "skills", "ALL_RULES.md");

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Load the full Remotion skills from the concatenated rules file.
 */
async function loadSkillsPrompt(): Promise<string> {
  try {
    const raw = await readFile(SKILLS_PATH, "utf-8");
    return `You are an expert Remotion developer creating stunning motion graphics for Instagram Reels.

CRITICAL RULES:
- ALL animations MUST use useCurrentFrame() + interpolate() + spring() from "remotion"
- CSS animations/transitions/keyframes are FORBIDDEN
- ALWAYS include extrapolateLeft: "clamp" and extrapolateRight: "clamp" on EVERY interpolate call
- Canvas is 1080x1920 (9:16 vertical)
- Export component as: export const MotionGraphicVideo: React.FC = () => { ... };
- Only import from "remotion" — no other packages

AVAILABLE IMPORTS:
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, Img, staticFile, Series } from "remotion";

IMAGE GENERATION:
You can request AI-generated images. Add comments at the TOP of your file:
// IMAGE_REQUEST: "description of image" -> "filename.png" 512x512
Then use: <Img src={staticFile("generated/filename.png")} />
Images will be generated before rendering. Use for backgrounds, illustrations, etc.

FOCUS ON VISUALS: Use LESS text, MORE shapes, particles, SVGs, gradients, images, chart animations.

Below are the complete Remotion skill rules and code examples. Follow them exactly:

${raw}`;
  } catch {
    // Fallback to the inline prompt if file not found
    const { REMOTION_SKILLS_PROMPT } = await import("@/lib/prompts/remotion-skills");
    return REMOTION_SKILLS_PROMPT;
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { success: rateLimitOk } = await checkRateLimit(userId);
  if (!rateLimitOk) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = motionGraphicSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { script, topic, tone, durationSeconds, chatHistory, userPrompt, template } = parsed.data;

  try {
    const duration = durationSeconds ?? 25;
    const totalFrames = duration * 30;
    const isSplit = template === "top-graphic" || template === "bottom-graphic";
    const mgWidth = 1080;
    const mgHeight = isSplit ? 960 : 1920; // half height for split templates
    const skillsPrompt = await loadSkillsPrompt();

    // Build messages
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: skillsPrompt },
    ];

    const history = (chatHistory ?? []) as ChatMessage[];
    const isRefinement = history.length > 0 && userPrompt;

    if (isRefinement) {
      messages.push({
        role: "user",
        content: buildMotionGraphicPrompt(script, topic ?? "Instagram Reel", tone ?? "professional", duration, mgWidth, mgHeight),
      });
      try {
        const currentCode = await readFile(COMPOSITION_PATH, "utf-8");
        messages.push({ role: "assistant", content: currentCode });
      } catch { /* no previous code */ }
      for (const msg of history) {
        if (msg.role === "user") messages.push({ role: "user", content: msg.content });
      }
      messages.push({
        role: "user",
        content: `Update the MotionGraphic based on this feedback:\n\n"${userPrompt}"\n\nReturn the COMPLETE updated component. No partial code. No markdown fences. Only TSX.`,
      });
    } else {
      messages.push({
        role: "user",
        content: buildMotionGraphicPrompt(script, topic ?? "Instagram Reel", tone ?? "professional", duration, mgWidth, mgHeight),
      });
    }

    // Step 1: Generate TSX
    const tsxCode = await callOpenRouter({
      messages,
      temperature: 0.8,
      maxTokens: 16000,
      model: "anthropic/claude-sonnet-4",
    });

    let cleanCode = tsxCode.trim();
    if (cleanCode.startsWith("```")) {
      cleanCode = cleanCode.replace(/^```(?:tsx?|typescript|react)?\n?/, "").replace(/\n?```$/, "");
    }

    if (!cleanCode.includes("MotionGraphicVideo")) {
      return NextResponse.json({
        error: "AI generated invalid code — missing MotionGraphicVideo export",
        code: cleanCode.slice(0, 500),
      }, { status: 422 });
    }

    // Step 2: Generate images from IMAGE_REQUEST comments
    const imageRequests = extractImageRequests(cleanCode);
    if (imageRequests.length > 0) {
      const publicDir = path.join(SANDBOX_DIR, "public", "generated");
      await mkdir(publicDir, { recursive: true });

      await Promise.all(imageRequests.map(async (req) => {
        const w = req.width ?? 512;
        const h = req.height ?? 512;

        // Try real image generation
        let saved = false;
        try {
          const imgRes = await fetch("https://openrouter.ai/api/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://reelstudio.app",
              "X-Title": "ReelStudio",
            },
            body: JSON.stringify({
              model: "stabilityai/stable-diffusion-xl-base-1.0",
              prompt: req.prompt,
              n: 1,
              size: `${w}x${h}`,
            }),
          });
          if (imgRes.ok) {
            const data = await imgRes.json();
            const url = data?.data?.[0]?.url;
            const b64 = data?.data?.[0]?.b64_json;
            if (url) {
              const dl = await fetch(url);
              if (dl.ok) {
                await writeFile(path.join(publicDir, req.filename), Buffer.from(await dl.arrayBuffer()));
                saved = true;
              }
            } else if (b64) {
              await writeFile(path.join(publicDir, req.filename), Buffer.from(b64, "base64"));
              saved = true;
            }
          }
        } catch { /* fall through to SVG */ }

        // Fallback: rich SVG placeholder
        if (!saved) {
          let hash = 0;
          for (const c of req.prompt) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
          const hue1 = Math.abs(hash) % 360;
          const hue2 = (hue1 + 60) % 360;
          const hue3 = (hue1 + 120) % 360;
          const svgName = req.filename.replace(/\.\w+$/, ".svg");
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue1},70%,20%)"/>
      <stop offset="50%" style="stop-color:hsl(${hue2},60%,15%)"/>
      <stop offset="100%" style="stop-color:hsl(${hue3},50%,10%)"/>
    </linearGradient>
    <radialGradient id="g1" cx="30%" cy="40%" r="50%">
      <stop offset="0%" style="stop-color:hsl(${hue1},80%,50%);stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:hsl(${hue1},80%,50%);stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="g2" cx="70%" cy="60%" r="40%">
      <stop offset="0%" style="stop-color:hsl(${hue2},80%,60%);stop-opacity:0.2"/>
      <stop offset="100%" style="stop-color:hsl(${hue2},80%,60%);stop-opacity:0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#g1)"/>
  <rect width="100%" height="100%" fill="url(#g2)"/>
  <circle cx="${w * 0.2}" cy="${h * 0.8}" r="${Math.min(w, h) * 0.08}" fill="hsl(${hue1},90%,70%)" opacity="0.15"/>
  <circle cx="${w * 0.85}" cy="${h * 0.15}" r="${Math.min(w, h) * 0.06}" fill="hsl(${hue3},90%,60%)" opacity="0.1"/>
</svg>`;
          await writeFile(path.join(publicDir, svgName), svg);
          // Rewrite code to use .svg
          const pngRef = `"generated/${req.filename}"`;
          const svgRef = `"generated/${svgName}"`;
          cleanCode = cleanCode.split(pngRef).join(svgRef);
        }
      }));
    }

    // Step 3: Write Root.tsx and composition
    const rootCode = `import React from "react";
import { Composition } from "remotion";
import { MotionGraphicVideo } from "./MotionGraphic";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MotionGraphic"
        component={MotionGraphicVideo}
        durationInFrames={${totalFrames}}
        fps={30}
        width={${mgWidth}}
        height={${mgHeight}}
      />
    </>
  );
};
`;

    // Strip any imports Claude might add for packages not in sandbox
    cleanCode = stripBadImports(cleanCode);

    await writeFile(COMPOSITION_PATH, cleanCode, "utf-8");
    await writeFile(path.join(SANDBOX_DIR, "src", "Root.tsx"), rootCode, "utf-8");
    await mkdir(OUTPUT_DIR, { recursive: true });

    // Step 4: Render
    const renderCmd = `cd "${SANDBOX_DIR}" && npx remotion render src/index.ts MotionGraphic out/video.mp4 --timeout=120000 2>&1`;

    try {
      await execAsync(renderCmd, {
        timeout: 180000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, NODE_ENV: "production" },
      });
    } catch (renderErr) {
      const errMsg = (renderErr as { stderr?: string; stdout?: string }).stderr
        ?? (renderErr as { stdout?: string }).stdout
        ?? (renderErr as Error).message;

      // Auto-fix and retry
      const fixedCode = attemptCodeFix(cleanCode, errMsg);
      if (fixedCode !== cleanCode) {
        await writeFile(COMPOSITION_PATH, fixedCode, "utf-8");
        try {
          await execAsync(renderCmd, {
            timeout: 180000,
            maxBuffer: 10 * 1024 * 1024,
            env: { ...process.env, NODE_ENV: "production" },
          });
        } catch (retryErr) {
          return NextResponse.json({
            error: "Render failed after auto-fix",
            details: ((retryErr as { stderr?: string }).stderr ?? (retryErr as Error).message).slice(0, 1500),
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({
          error: "Render failed",
          details: errMsg.slice(0, 1500),
        }, { status: 500 });
      }
    }

    // Step 5: Return video
    const videoBuffer = await readFile(OUTPUT_PATH);

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": videoBuffer.length.toString(),
        "Content-Disposition": "attachment; filename=motion-graphic.mp4",
      },
    });
  } catch (err) {
    return NextResponse.json({
      error: "Motion graphic generation failed",
      details: (err as Error).message,
    }, { status: 500 });
  }
}

// ── Helpers ──

function stripBadImports(code: string): string {
  // Remove imports for packages not installed in sandbox
  const badPackages = [
    "@remotion/google-fonts",
    "@remotion/transitions",
    "@remotion/light-leaks",
    "@remotion/three",
    "@remotion/paths",
    "@remotion/captions",
    "@remotion/fonts",
    "three",
    "@react-three/fiber",
    "framer-motion",
    "d3",
  ];
  let cleaned = code;
  for (const pkg of badPackages) {
    // Remove import lines for this package
    const regex = new RegExp(`import\\s+[^;]*from\\s*["']${pkg.replace("/", "\\/")}[^"']*["'];?\\n?`, "g");
    cleaned = cleaned.replace(regex, "");
  }
  // Remove any loadFont() calls
  cleaned = cleaned.replace(/const\s*\{[^}]*\}\s*=\s*loadFont\([^)]*\);?\n?/g, "");
  return cleaned;
}

function attemptCodeFix(code: string, errorMsg: string): string {
  let fixed = code;

  // Fix missing extrapolate clamp
  if (errorMsg.includes("extrapolate") || errorMsg.includes("range") || errorMsg.includes("inputRange")) {
    fixed = fixed.replace(
      /interpolate\(([^)]+)\)(?!\s*;?\s*\/\/\s*clamped)/g,
      (match) => {
        if (match.includes("extrapolate")) return match;
        return match.slice(0, -1) + ", { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })";
      }
    );
  }

  // Fix missing React import
  if (errorMsg.includes("React is not defined") && !fixed.includes("import React")) {
    fixed = 'import React from "react";\n' + fixed;
  }

  // Fix staticFile references to non-existent files
  if (errorMsg.includes("ENOENT") || errorMsg.includes("Could not read") || errorMsg.includes("staticFile")) {
    fixed = fixed.replace(
      /<Img\s+src=\{staticFile\([^)]+\)\}[^/]*\/>/g,
      '<div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1a1a3e, #0F0F23)", borderRadius: 20 }} />'
    );
  }

  // Strip bad imports that slipped through
  fixed = stripBadImports(fixed);

  return fixed;
}

interface ImageRequest {
  prompt: string;
  filename: string;
  width?: number;
  height?: number;
}

function extractImageRequests(code: string): ImageRequest[] {
  const requests: ImageRequest[] = [];
  const pattern = /\/\/\s*IMAGE_REQUEST:\s*"([^"]+)"\s*->\s*"([^"]+)"(?:\s+(\d+)x(\d+))?/g;
  let match;
  while ((match = pattern.exec(code)) !== null) {
    requests.push({
      prompt: match[1],
      filename: match[2],
      width: match[3] ? parseInt(match[3]) : 512,
      height: match[4] ? parseInt(match[4]) : 512,
    });
  }
  // Also detect staticFile("generated/...") without matching IMAGE_REQUEST
  const staticPattern = /staticFile\(\s*["']generated\/([^"']+)["']\s*\)/g;
  while ((match = staticPattern.exec(code)) !== null) {
    const fn = match[1];
    if (!requests.find((r) => r.filename === fn)) {
      requests.push({ prompt: fn.replace(/\.\w+$/, "").replace(/[-_]/g, " "), filename: fn });
    }
  }
  return requests;
}
