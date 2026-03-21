import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const CLIPS_TMP = path.join("/tmp", "render-clips");
const MAX_CLIP_SIZE = 200 * 1024 * 1024; // 200 MB

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_CLIP_SIZE) {
    return NextResponse.json({ error: "Clip too large (max 200 MB)" }, { status: 413 });
  }

  const clipId = req.nextUrl.searchParams.get("clipId") ?? crypto.randomUUID();

  const userDir = path.join(CLIPS_TMP, userId);
  await mkdir(userDir, { recursive: true });

  const ext = req.headers.get("content-type")?.includes("webm") ? ".webm" : ".mp4";
  const filename = `${clipId}${ext}`;
  const filePath = path.join(userDir, filename);

  const arrayBuffer = await req.arrayBuffer();
  await writeFile(filePath, Buffer.from(arrayBuffer));

  // Return a server-side path token (not a public URL — only used server-to-server)
  const token = Buffer.from(JSON.stringify({ userId, filename })).toString("base64url");

  return NextResponse.json({ clipId, token, size: arrayBuffer.byteLength });
}
