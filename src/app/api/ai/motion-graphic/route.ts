import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callOpenRouter } from "@/lib/openrouter";
import { motionGraphicSchema } from "@/lib/api-schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildMotionGraphicPrompt } from "@/lib/prompts/remotion-skills";
import { readFile, writeFile, mkdir, rm, symlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { existsSync } from "fs";
import { inngest } from "@/inngest/client";
import { setJobState } from "@/lib/mg-job-store";

const execAsync = promisify(exec);

const SANDBOX_DIR = path.resolve(process.cwd(), "remotion-sandbox");
const SKILLS_PATH = path.join(SANDBOX_DIR, "skills", "ALL_RULES.md");

const USE_INNGEST = !!(
  process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY
);

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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
    const { REMOTION_SKILLS_PROMPT } = await import("@/lib/prompts/remotion-skills");
    return REMOTION_SKILLS_PROMPT;
  }
}

function extractImageRequests(code: string): Array<{ prompt: string; filename: string; width?: number; height?: number }> {
  const requests: Array<{ prompt: string; filename: string; width?: number; height?: number }> = [];
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
  const staticPattern = /staticFile\(\s*["']generated\/([^"']+)["']\s*\)/g;
  while ((match = staticPattern.exec(code)) !== null) {
    const fn = match[1];
    if (!requests.find((r) => r.filename === fn)) {
      requests.push({ prompt: fn.replace(/\.\w+$/, "").replace(/[-_]/g, " "), filename: fn });
    }
  }
  return requests;
}

function stripBadImports(code: string): string {
  const badPackages = [
    "@remotion/google-fonts", "@remotion/transitions", "@remotion/light-leaks",
    "@remotion/three", "@remotion/paths", "@remotion/captions", "@remotion/fonts",
    "three", "@react-three/fiber", "framer-motion", "d3",
  ];
  let cleaned = code;
  for (const pkg of badPackages) {
    const regex = new RegExp(`import\\s+[^;]*from\\s*["']${pkg.replace("/", "\\/")}[^"']*["'];?\\n?`, "g");
    cleaned = cleaned.replace(regex, "");
  }
  cleaned = cleaned.replace(/const\s*\{[^}]*\}\s*=\s*loadFont\([^)]*\);?\n?/g, "");
  return cleaned;
}

function attemptCodeFix(code: string, errorMsg: string): string {
  let fixed = code;
  if (errorMsg.includes("extrapolate") || errorMsg.includes("range") || errorMsg.includes("inputRange")) {
    fixed = fixed.replace(/interpolate\(([^)]+)\)(?!\s*;?\s*\/\/\s*clamped)/g, (match) => {
      if (match.includes("extrapolate")) return match;
      return match.slice(0, -1) + ", { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })";
    });
  }
  if (errorMsg.includes("React is not defined") && !fixed.includes("import React")) {
    fixed = 'import React from "react";\n' + fixed;
  }
  if (errorMsg.includes("ENOENT") || errorMsg.includes("Could not read") || errorMsg.includes("staticFile")) {
    fixed = fixed.replace(
      /<Img\s+src=\{staticFile\([^)]+\)\}[^/]*\/>/g,
      '<div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1a1a3e, #0F0F23)", borderRadius: 20 }} />'
    );
  }
  return stripBadImports(fixed);
}

async function renderInIsolation(
  jobId: string,
  tsxCode: string,
  rootCode: string,
  totalFrames: number,
  mgWidth: number,
  mgHeight: number,
  imageRequests: Array<{ prompt: string; filename: string; width?: number; height?: number }>
): Promise<string> {
  const jobDir = path.join("/tmp", `mg-${jobId}`);
  const jobSrcDir = path.join(jobDir, "src");
  const jobPublicDir = path.join(jobDir, "public");
  const jobOutDir = path.join(jobDir, "out");

  await mkdir(jobSrcDir, { recursive: true });
  await mkdir(jobPublicDir, { recursive: true });
  await mkdir(jobOutDir, { recursive: true });

  // Copy config files from sandbox
  const filesToCopy = ["package.json", "remotion.config.ts", "tsconfig.json"];
  for (const f of filesToCopy) {
    const src = path.join(SANDBOX_DIR, f);
    if (existsSync(src)) {
      await writeFile(path.join(jobDir, f), await readFile(src));
    }
  }

  // Copy index.ts
  const indexSrc = path.join(SANDBOX_DIR, "src", "index.ts");
  if (existsSync(indexSrc)) {
    await writeFile(path.join(jobSrcDir, "index.ts"), await readFile(indexSrc));
  }

  // Symlink node_modules
  const nmTarget = path.join(SANDBOX_DIR, "node_modules");
  const nmLink = path.join(jobDir, "node_modules");
  if (existsSync(nmTarget) && !existsSync(nmLink)) {
    await symlink(nmTarget, nmLink);
  }

  // Write generated files
  await writeFile(path.join(jobSrcDir, "MotionGraphic.tsx"), tsxCode, "utf-8");
  await writeFile(path.join(jobSrcDir, "Root.tsx"), rootCode, "utf-8");

  // Generate images
  if (imageRequests.length > 0) {
    const generatedDir = path.join(jobPublicDir, "generated");
    await mkdir(generatedDir, { recursive: true });

    await Promise.all(imageRequests.map(async (req) => {
      const w = req.width ?? 512;
      const h = req.height ?? 512;
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
            prompt: req.prompt, n: 1, size: `${w}x${h}`,
          }),
        });
        if (imgRes.ok) {
          const data = await imgRes.json();
          const url = data?.data?.[0]?.url;
          const b64 = data?.data?.[0]?.b64_json;
          if (url) {
            const dl = await fetch(url);
            if (dl.ok) { await writeFile(path.join(generatedDir, req.filename), Buffer.from(await dl.arrayBuffer())); saved = true; }
          } else if (b64) {
            await writeFile(path.join(generatedDir, req.filename), Buffer.from(b64, "base64")); saved = true;
          }
        }
      } catch { /* fall through */ }

      if (!saved) {
        let hash = 0;
        for (const c of req.prompt) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
        const hue1 = Math.abs(hash) % 360;
        const hue2 = (hue1 + 60) % 360;
        const hue3 = (hue1 + 120) % 360;
        const svgName = req.filename.replace(/\.\w+$/, ".svg");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:hsl(${hue1},70%,20%)"/>
    <stop offset="50%" style="stop-color:hsl(${hue2},60%,15%)"/>
    <stop offset="100%" style="stop-color:hsl(${hue3},50%,10%)"/>
  </linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
</svg>`;
        await writeFile(path.join(generatedDir, svgName), svg);
      }
    }));
  }

  // Render
  const outputPath = path.join(jobOutDir, "video.mp4");
  const renderCmd = `cd "${jobDir}" && npx remotion render src/index.ts MotionGraphic out/video.mp4 --timeout=120000 2>&1`;

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
    const fixedCode = attemptCodeFix(tsxCode, errMsg);
    if (fixedCode !== tsxCode) {
      await writeFile(path.join(jobSrcDir, "MotionGraphic.tsx"), fixedCode, "utf-8");
      try {
        await execAsync(renderCmd, {
          timeout: 180000,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, NODE_ENV: "production" },
        });
      } catch (retryErr) {
        await rm(jobDir, { recursive: true, force: true });
        throw new Error(((retryErr as { stderr?: string }).stderr ?? (retryErr as Error).message).slice(0, 1500));
      }
    } else {
      await rm(jobDir, { recursive: true, force: true });
      throw new Error(errMsg.slice(0, 1500));
    }
  }

  return outputPath;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { success: rateLimitOk } = await checkRateLimit(userId);
  if (!rateLimitOk) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = motionGraphicSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { script, topic, tone, durationSeconds, chatHistory, userPrompt, template } = parsed.data;

  const duration = durationSeconds ?? 25;
  const totalFrames = duration * 30;
  const isSplit = template === "top-graphic" || template === "bottom-graphic";
  const mgWidth = 1080;
  const mgHeight = isSplit ? 960 : 1920;

  // ── Step 1: Generate TSX via AI (always synchronous) ──
  const skillsPrompt = await loadSkillsPrompt();
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
    // Try to read previous code from the sandbox (best-effort)
    try {
      const prevCode = await readFile(path.join(SANDBOX_DIR, "src", "MotionGraphic.tsx"), "utf-8");
      messages.push({ role: "assistant", content: prevCode });
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

  let tsxCode = await callOpenRouter({ messages, temperature: 0.8, maxTokens: 16000, model: "anthropic/claude-sonnet-4" });
  let cleanCode = tsxCode.trim();
  if (cleanCode.startsWith("```")) {
    cleanCode = cleanCode.replace(/^```(?:tsx?|typescript|react)?\n?/, "").replace(/\n?```$/, "");
  }
  cleanCode = stripBadImports(cleanCode);

  if (!cleanCode.includes("MotionGraphicVideo")) {
    return NextResponse.json({
      error: "AI generated invalid code — missing MotionGraphicVideo export",
      code: cleanCode.slice(0, 500),
    }, { status: 422 });
  }

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

  const imageRequests = extractImageRequests(cleanCode);
  const jobId = crypto.randomUUID();

  // ── Step 2: Render (async via Inngest or sync in-process) ──
  if (USE_INNGEST) {
    setJobState(jobId, { status: "pending", createdAt: Date.now() });
    await inngest.send({
      name: "motion-graphic/render",
      data: { jobId, userId, tsxCode: cleanCode, rootCode, totalFrames, mgWidth, mgHeight, imageRequests },
    });
    return NextResponse.json({ jobId, async: true });
  }

  // Fallback: run render in background (in-process), return jobId immediately
  setJobState(jobId, { status: "pending", createdAt: Date.now() });

  // Fire-and-forget background render
  (async () => {
    try {
      setJobState(jobId, { status: "rendering", createdAt: Date.now() });
      const videoPath = await renderInIsolation(
        jobId, cleanCode, rootCode, totalFrames, mgWidth, mgHeight, imageRequests
      );
      setJobState(jobId, { status: "done", videoPath, createdAt: Date.now() });
    } catch (err) {
      setJobState(jobId, { status: "error", error: (err as Error).message, createdAt: Date.now() });
    }
  })();

  return NextResponse.json({ jobId, async: true });
}
