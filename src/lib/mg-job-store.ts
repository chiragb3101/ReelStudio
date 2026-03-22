/**
 * In-process job state store for motion graphic renders.
 * Works for single-server deployments. When using Inngest with multiple instances,
 * replace this with Upstash Redis or similar shared store.
 */

export interface JobState {
  status: "pending" | "rendering" | "done" | "error";
  videoPath?: string;
  error?: string;
  createdAt: number;
}

const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getStore(): Map<string, JobState> {
  // Use globalThis so the map survives Next.js hot reloads in dev
  const g = globalThis as typeof globalThis & { _mgJobStore?: Map<string, JobState> };
  if (!g._mgJobStore) g._mgJobStore = new Map();
  return g._mgJobStore;
}

export function setJobState(jobId: string, state: JobState): void {
  getStore().set(jobId, state);
}

export function getJobState(jobId: string): JobState | undefined {
  const store = getStore();
  const job = store.get(jobId);
  if (!job) return undefined;
  // Evict expired jobs
  if (Date.now() - job.createdAt > JOB_TTL_MS) {
    store.delete(jobId);
    return undefined;
  }
  return job;
}

export function deleteJobState(jobId: string): void {
  getStore().delete(jobId);
}
