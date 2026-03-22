import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { setJobState } from "@/lib/mg-job-store";
import { writeFile, mkdir, rm, symlink, readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { existsSync } from "fs";
import crypto from "crypto";
import { z } from "zod";

const execAsync = promisify(exec);
const SANDBOX_DIR = path.resolve(process.cwd(), "remotion-sandbox");
const CLIPS_TMP = path.join("/tmp", "render-clips");

const renderSchema = z.object({
  editSpec: z.record(z.string(), z.unknown()),
  // Map of clipId → base64url token returned from /api/render/upload
  clipTokens: z.record(z.string(), z.string()),
  fps: z.number().min(1).max(60).default(30),
  width: z.number().min(100).max(4096).default(1080),
  height: z.number().min(100).max(4096).default(1920),
});

function generateCompositionCode(
  editSpec: Record<string, unknown>,
  clipPaths: Record<string, string>,
  fps: number,
  width: number,
  height: number
): { tsx: string; root: string; totalFrames: number } {
  const scenes = (editSpec.scenes as Array<{
    clipId: string;
    durationFrames: number;
    transition?: string;
    text?: string;
    textPosition?: string;
    captionText?: string;
  }>) ?? [];

  const totalFrames = scenes.reduce((sum, s) => sum + (s.durationFrames ?? 90), 0) || 270;
  const accentColor = (editSpec.accentColor as string) ?? "#7C3AED";
  const template = (editSpec.template as string) ?? "full-video-overlay";

  const sceneBlocks = scenes.map((scene, i) => {
    const clipPath = clipPaths[scene.clipId];
    const videoSrc = clipPath ? `staticFile("clips/${path.basename(clipPath)}")` : "null";
    const text = scene.text ?? "";
    const captionText = scene.captionText ?? "";

    return `
    /* Scene ${i + 1} */
    {
      clipPath: ${JSON.stringify(clipPath ? path.basename(clipPath) : "")},
      videoSrc: ${videoSrc},
      durationFrames: ${scene.durationFrames ?? 90},
      transition: ${JSON.stringify(scene.transition ?? "cut")},
      text: ${JSON.stringify(text)},
      captionText: ${JSON.stringify(captionText)},
    }`;
  }).join(",\n");

  const tsx = `import React from "react";
import { AbsoluteFill, Sequence, Video, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile } from "remotion";

const ACCENT = ${JSON.stringify(accentColor)};
const TEMPLATE = ${JSON.stringify(template)};

interface SceneData {
  clipPath: string;
  videoSrc: string | null;
  durationFrames: number;
  transition: string;
  text: string;
  captionText: string;
}

const SCENES: SceneData[] = [${sceneBlocks}
];

function SceneBlock({ scene, index }: { scene: SceneData; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = scene.durationFrames;

  const enterProgress = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, durationInFrames: 10 });
  const exitOpacity = interpolate(frame, [dur - 10, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  let enterTransform = "";
  let enterOpacity = enterProgress;

  if (scene.transition === "slide-left") {
    enterTransform = \`translateX(\${interpolate(enterProgress, [0, 1], [30, 0])}%)\`;
  } else if (scene.transition === "zoom-in") {
    enterTransform = \`scale(\${interpolate(enterProgress, [0, 1], [1.12, 1])})\`;
  } else if (scene.transition === "cut") {
    enterOpacity = 1;
  }

  return (
    <AbsoluteFill
      style={{
        opacity: enterOpacity * exitOpacity,
        transform: enterTransform,
        backgroundColor: "#000",
        willChange: "opacity, transform",
      }}
    >
      {scene.clipPath ? (
        <Video
          src={staticFile(\`clips/\${scene.clipPath}\`)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: \`linear-gradient(135deg, #1a1a2e, \${ACCENT}44)\` }} />
      )}

      {scene.text ? (
        <div style={{
          position: "absolute",
          bottom: "15%",
          left: "5%",
          right: "5%",
          textAlign: "center",
          color: "#fff",
          fontSize: 52,
          fontWeight: 800,
          fontFamily: "Inter, sans-serif",
          textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          letterSpacing: -1,
        }}>
          {scene.text}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

export const ReelVideo: React.FC = () => {
  let frameOffset = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {SCENES.map((scene, i) => {
        const from = frameOffset;
        frameOffset += scene.durationFrames;
        return (
          <Sequence key={i} from={from} durationInFrames={scene.durationFrames}>
            <SceneBlock scene={scene} index={i} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
`;

  const root = `import React from "react";
import { Composition } from "remotion";
import { ReelVideo } from "./ReelComposition";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ReelVideo"
    component={ReelVideo}
    durationInFrames={${totalFrames}}
    fps={${fps}}
    width={${width}}
    height={${height}}
  />
);
`;

  return { tsx, root, totalFrames };
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { success: rateLimitOk } = await checkRateLimit(userId);
  if (!rateLimitOk) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = renderSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.message }, { status: 400 });

  const { editSpec, clipTokens, fps, width, height } = body.data;

  // Resolve clip tokens → file paths
  const clipPaths: Record<string, string> = {};
  for (const [clipId, token] of Object.entries(clipTokens)) {
    try {
      const { userId: tokenUserId, filename } = JSON.parse(Buffer.from(token, "base64url").toString());
      if (tokenUserId !== userId) continue; // security: only own clips
      const filePath = path.join(CLIPS_TMP, userId, filename);
      if (existsSync(filePath)) clipPaths[clipId] = filePath;
    } catch { /* skip invalid tokens */ }
  }

  const { tsx, root, totalFrames } = generateCompositionCode(
    editSpec as Record<string, unknown>, clipPaths, fps, width, height
  );

  const jobId = crypto.randomUUID();
  const jobDir = path.join("/tmp", `reel-${jobId}`);
  const jobSrcDir = path.join(jobDir, "src");
  const jobPublicDir = path.join(jobDir, "public");
  const jobOutDir = path.join(jobDir, "out");

  setJobState(jobId, { status: "pending", createdAt: Date.now() });

  // Fire-and-forget render
  (async () => {
    try {
      setJobState(jobId, { status: "rendering", createdAt: Date.now() });

      await mkdir(jobSrcDir, { recursive: true });
      await mkdir(path.join(jobPublicDir, "clips"), { recursive: true });
      await mkdir(jobOutDir, { recursive: true });

      // Copy sandbox config files
      for (const f of ["package.json", "remotion.config.ts", "tsconfig.json"]) {
        const src = path.join(SANDBOX_DIR, f);
        if (existsSync(src)) await writeFile(path.join(jobDir, f), await readFile(src));
      }

      // Copy index.ts
      const indexSrc = path.join(SANDBOX_DIR, "src", "index.ts");
      if (existsSync(indexSrc)) await writeFile(path.join(jobSrcDir, "index.ts"), await readFile(indexSrc));

      // Symlink node_modules
      const nmTarget = path.join(SANDBOX_DIR, "node_modules");
      const nmLink = path.join(jobDir, "node_modules");
      if (existsSync(nmTarget) && !existsSync(nmLink)) await symlink(nmTarget, nmLink);

      // Write composition
      await writeFile(path.join(jobSrcDir, "ReelComposition.tsx"), tsx, "utf-8");
      await writeFile(path.join(jobSrcDir, "Root.tsx"), root, "utf-8");

      // Symlink clip files into public/clips
      for (const [, clipPath] of Object.entries(clipPaths)) {
        const dest = path.join(jobPublicDir, "clips", path.basename(clipPath));
        if (!existsSync(dest)) await symlink(clipPath, dest);
      }

      // Update Root.tsx to reference ReelVideo instead of MotionGraphic
      const rootContent = await readFile(path.join(jobSrcDir, "index.ts"), "utf-8");
      if (!rootContent.includes("ReelComposition")) {
        // index.ts might reference MotionGraphic — write a new one
        await writeFile(path.join(jobSrcDir, "index.ts"), `
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);
`, "utf-8");
      }

      const outputPath = path.join(jobOutDir, "reel.mp4");
      const renderCmd = `cd "${jobDir}" && npx remotion render src/index.ts ReelVideo out/reel.mp4 --timeout=120000 2>&1`;

      await execAsync(renderCmd, {
        timeout: 180000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, NODE_ENV: "production" },
      });

      setJobState(jobId, { status: "done", videoPath: outputPath, createdAt: Date.now() });
    } catch (err) {
      setJobState(jobId, {
        status: "error",
        error: (err as Error).message.slice(0, 1000),
        createdAt: Date.now(),
      });
      try { await rm(jobDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  })();

  return NextResponse.json({ jobId });
}
