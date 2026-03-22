import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getJobState, deleteJobState } from "@/lib/mg-job-store";
import { readFile, rm } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const job = getJobState(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "done" || !job.videoPath) {
    return NextResponse.json({ error: "Video not ready" }, { status: 404 });
  }

  try {
    const videoBuffer = await readFile(job.videoPath);
    // Clean up after serving
    const jobDir = path.join("/tmp", `mg-${jobId}`);
    deleteJobState(jobId);
    rm(jobDir, { recursive: true, force: true }).catch(() => {});

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": videoBuffer.length.toString(),
        "Content-Disposition": "attachment; filename=motion-graphic.mp4",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to read video" }, { status: 500 });
  }
}
