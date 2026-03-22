import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getJobState } from "@/lib/mg-job-store";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const job = getJobState(jobId);
  if (!job) return NextResponse.json({ status: "not_found" }, { status: 404 });

  return NextResponse.json({
    status: job.status,
    error: job.error,
    videoReady: job.status === "done" && !!job.videoPath,
  });
}
