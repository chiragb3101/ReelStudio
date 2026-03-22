import { inngest, type RenderMotionGraphicEvent } from "../client";
import { writeFile, mkdir, rm, cp, symlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { existsSync } from "fs";
import { setJobState } from "@/lib/mg-job-store";

const execAsync = promisify(exec);

const SANDBOX_DIR = path.resolve(process.cwd(), "remotion-sandbox");

export const renderMotionGraphic = inngest.createFunction(
  { id: "render-motion-graphic", retries: 0, triggers: [{ event: "motion-graphic/render" }] },
  async ({ event }: { event: RenderMotionGraphicEvent }) => {
    const { jobId, tsxCode, rootCode, totalFrames, mgWidth, mgHeight, imageRequests } = event.data;

    const jobDir = path.join("/tmp", `mg-${jobId}`);
    const jobSrcDir = path.join(jobDir, "src");
    const jobPublicDir = path.join(jobDir, "public");
    const jobOutDir = path.join(jobDir, "out");

    try {
      setJobState(jobId, { status: "rendering", createdAt: Date.now() });

      // Set up isolated job directory
      await mkdir(jobSrcDir, { recursive: true });
      await mkdir(jobPublicDir, { recursive: true });
      await mkdir(jobOutDir, { recursive: true });

      // Copy config files
      await writeFile(path.join(jobDir, "package.json"), JSON.stringify({
        name: "remotion-sandbox",
        version: "1.0.0",
        private: true,
        dependencies: {
          remotion: "4.0.438",
          "@remotion/cli": "4.0.438",
          react: "19.2.4",
          "react-dom": "19.2.4",
          typescript: "5.8.3",
          "@types/react": "19.1.8",
          "@types/react-dom": "19.1.6",
        },
      }, null, 2));

      // Copy remotion config
      const configSrc = path.join(SANDBOX_DIR, "remotion.config.ts");
      if (existsSync(configSrc)) {
        await cp(configSrc, path.join(jobDir, "remotion.config.ts"));
      }

      const tsconfigSrc = path.join(SANDBOX_DIR, "tsconfig.json");
      if (existsSync(tsconfigSrc)) {
        await cp(tsconfigSrc, path.join(jobDir, "tsconfig.json"));
      }

      // Copy index.ts
      const indexSrc = path.join(SANDBOX_DIR, "src", "index.ts");
      if (existsSync(indexSrc)) {
        await cp(indexSrc, path.join(jobSrcDir, "index.ts"));
      }

      // Symlink node_modules to avoid reinstalling
      const nmTarget = path.join(SANDBOX_DIR, "node_modules");
      const nmLink = path.join(jobDir, "node_modules");
      if (existsSync(nmTarget) && !existsSync(nmLink)) {
        await symlink(nmTarget, nmLink);
      }

      // Write generated code
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
                  await writeFile(path.join(generatedDir, req.filename), Buffer.from(await dl.arrayBuffer()));
                  saved = true;
                }
              } else if (b64) {
                await writeFile(path.join(generatedDir, req.filename), Buffer.from(b64, "base64"));
                saved = true;
              }
            }
          } catch { /* fall through to SVG */ }

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
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
</svg>`;
            await writeFile(path.join(generatedDir, svgName), svg);
          }
        }));
      }

      // Render
      const renderCmd = `cd "${jobDir}" && npx remotion render src/index.ts MotionGraphic out/video.mp4 --timeout=120000 2>&1`;
      const outputPath = path.join(jobOutDir, "video.mp4");

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
        throw new Error(`Render failed: ${errMsg.slice(0, 1000)}`);
      }

      setJobState(jobId, {
        status: "done",
        videoPath: outputPath,
        createdAt: Date.now(),
      });

      return { jobId, success: true };
    } catch (err) {
      setJobState(jobId, {
        status: "error",
        error: (err as Error).message,
        createdAt: Date.now(),
      });
      // Clean up on error
      try { await rm(jobDir, { recursive: true, force: true }); } catch { /* ignore */ }
      throw err;
    }
  }
);
