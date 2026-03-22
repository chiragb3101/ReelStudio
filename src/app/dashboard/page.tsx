"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Plus,
  Film,
  Upload,
  Trash2,
  ChevronRight,
  Sparkles,
  Loader2,
  Check,
  Pencil,
  X,
  Folder,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getProjects,
  createProject,
  deleteProject,
  updateProjectTitle,
  type ProjectRow,
} from "@/lib/supabase";
import { deleteProjectMedia } from "@/lib/media-db";

const STAGES = [
  "idea", "research", "script", "shot-list",
  "shoot", "edit", "thumbnail", "caption", "schedule",
] as const;

const STAGE_LABELS: Record<string, string> = {
  idea: "Idea",
  research: "Research",
  script: "Script",
  "shot-list": "Shot List",
  shoot: "Filming",
  edit: "Editing",
  thumbnail: "Thumbnail",
  caption: "Caption",
  schedule: "Schedule",
};

const STAGE_COLORS: Record<string, string> = {
  idea: "text-violet-400",
  research: "text-blue-400",
  script: "text-indigo-400",
  "shot-list": "text-cyan-400",
  shoot: "text-teal-400",
  edit: "text-emerald-400",
  thumbnail: "text-amber-400",
  caption: "text-orange-400",
  schedule: "text-green-400",
};

function stageIndex(stage: string) {
  return STAGES.indexOf(stage as (typeof STAGES)[number]);
}

function isCompleted(stage: string) {
  return stage === "schedule";
}

function EditableTitle({
  projectId,
  userId,
  initialTitle,
  onSave,
}: {
  projectId: string;
  userId: string;
  initialTitle: string;
  onSave: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function save() {
    const trimmed = value.trim() || "Untitled Reel";
    setValue(trimmed);
    setEditing(false);
    onSave(trimmed);
    try {
      await updateProjectTitle(userId, projectId, trimmed);
    } catch {
      // optimistic — ignore errors
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") { setValue(initialTitle); setEditing(false); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={save}
          className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm font-semibold outline-none"
        />
        <button onClick={save} className="text-primary shrink-0"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => { setValue(initialTitle); setEditing(false); }} className="text-muted-foreground shrink-0"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0 group/title">
      <h3 className="font-semibold text-sm truncate">{value}</h3>
      <button onClick={startEdit} className="opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0">
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

function StageProgress({ stage }: { stage: string }) {
  const idx = stageIndex(stage);
  return (
    <div className="flex items-center gap-[3px] mt-2">
      {STAGES.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
            i < idx
              ? "bg-gradient-to-r from-primary to-accent"
              : i === idx
              ? "bg-primary/60"
              : "bg-border/30"
          }`}
        />
      ))}
    </div>
  );
}

function ProjectCard({
  project,
  userId,
  onDelete,
  onResume,
  onTitleChange,
}: {
  project: ProjectRow;
  userId: string;
  onDelete: () => void;
  onResume: () => void;
  onTitleChange: (title: string) => void;
}) {
  const completed = isCompleted(project.stage);
  const idx = stageIndex(project.stage);
  const stageColor = STAGE_COLORS[project.stage] || "text-primary";

  return (
    <Card className="glass rounded-2xl border-border/30 hover:border-primary/20 transition-all card-hover group overflow-hidden">
      {/* Top gradient accent line */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${completed ? "from-green-500 to-emerald-400" : "from-primary via-accent to-primary"}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${completed ? "bg-green-500/10 border border-green-500/20" : "bg-primary/10 border border-primary/15"}`}>
              <Film className={`w-5 h-5 ${completed ? "text-green-400" : "text-primary"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <EditableTitle
                projectId={project.id}
                userId={userId}
                initialTitle={project.title}
                onSave={onTitleChange}
              />
              <span className="text-[11px] text-muted-foreground/70 block mt-0.5">
                {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 transition-all text-muted-foreground/60 hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <StageProgress stage={project.stage} />

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {completed ? (
              <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400 bg-green-500/5">
                <Check className="w-2.5 h-2.5 mr-1" /> Completed
              </Badge>
            ) : (
              <Badge variant="outline" className={`text-[10px] border-primary/20 ${stageColor} bg-primary/5`}>
                {STAGE_LABELS[project.stage] ?? project.stage} · {idx + 1}/9
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant={completed ? "outline" : "default"}
            onClick={onResume}
            className={`gap-1 rounded-xl h-7 text-xs transition-all ${!completed ? "shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25" : ""}`}
          >
            {completed ? "View" : "Continue"}
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadProjects() {
    if (!user?.id) return;
    try {
      const rows = await getProjects(user.id);
      setProjects(rows);
    } catch {
      // fallback: try localStorage cache
      try {
        const cached = localStorage.getItem("reelstudio-projects-v2");
        if (cached) setProjects(JSON.parse(cached));
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }

  function cacheProjects(rows: ProjectRow[]) {
    try {
      localStorage.setItem("reelstudio-projects-v2", JSON.stringify(rows));
    } catch { /* ignore */ }
  }

  async function handleNewFromIdea() {
    if (!user?.id || creating) return;
    setCreating(true);
    try {
      const project = await createProject(user.id, "Untitled Reel");
      const updated = [project, ...projects];
      setProjects(updated);
      cacheProjects(updated);
      router.push(`/pipeline/${project.id}/idea`);
    } catch {
      // localStorage fallback
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const fallback: ProjectRow = { id, user_id: user.id, title: "Untitled Reel", stage: "idea", created_at: now, updated_at: now };
      const updated = [fallback, ...projects];
      setProjects(updated);
      cacheProjects(updated);
      router.push(`/pipeline/${id}/idea`);
    } finally {
      setCreating(false);
    }
  }

  async function handleNewFromUpload() {
    if (!user?.id || creating) return;
    setCreating(true);
    try {
      const project = await createProject(user.id, "Uploaded Video");
      const updated = [project, ...projects];
      setProjects(updated);
      cacheProjects(updated);
      router.push(`/pipeline/${project.id}/shoot`);
    } catch {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const fallback: ProjectRow = { id, user_id: user.id, title: "Uploaded Video", stage: "shoot", created_at: now, updated_at: now };
      const updated = [fallback, ...projects];
      setProjects(updated);
      cacheProjects(updated);
      router.push(`/pipeline/${id}/shoot`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(project: ProjectRow) {
    if (!user?.id) return;
    const updated = projects.filter((p) => p.id !== project.id);
    setProjects(updated);
    cacheProjects(updated);
    try {
      await deleteProject(user.id, project.id);
      await deleteProjectMedia(project.id);
      // Clean up localStorage draft
      localStorage.removeItem(`reelstudio-draft-${project.id}`);
    } catch { /* ignore — already removed from UI */ }
  }

  function handleResume(project: ProjectRow) {
    router.push(`/pipeline/${project.id}/${project.stage}`);
  }

  function handleTitleChange(projectId: string, title: string) {
    setProjects((prev) => {
      const updated = prev.map((p) => p.id === projectId ? { ...p, title } : p);
      cacheProjects(updated);
      return updated;
    });
  }

  const drafts = projects.filter((p) => !isCompleted(p.stage));
  const completed = projects.filter((p) => isCompleted(p.stage));

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-[20%] w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
        <div className="absolute bottom-[20%] left-[10%] w-72 h-72 rounded-full bg-accent/3 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/30 bg-background/70 backdrop-blur-2xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-primary/20">
              <Film className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Reel<span className="gradient-text">Studio</span>
              </h1>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.firstName || user.primaryEmailAddress?.emailAddress}
              </span>
              {user.imageUrl && (
                <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full ring-2 ring-border/50" />
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12 relative z-[1]">
        {/* New Reel CTAs */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Plus className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Create New Reel
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <button
              onClick={handleNewFromIdea}
              disabled={creating}
              className="glass rounded-2xl p-7 border border-border/30 hover:border-primary/30 transition-all text-left group disabled:opacity-60 card-hover spotlight-card relative overflow-hidden"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
                e.currentTarget.style.setProperty("--y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
              }}
            >
              <div className="flex items-center gap-4 mb-4 relative z-[1]">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-primary/15">
                  {creating ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Sparkles className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <h3 className="font-semibold text-base">Start from Idea</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Full pipeline: Idea to Published Reel</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed relative z-[1]">
                AI guides you through every step — from topic research to a polished, scheduled reel.
              </p>
              <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary absolute bottom-6 right-6 transition-all group-hover:translate-x-1" />
            </button>

            <button
              onClick={handleNewFromUpload}
              disabled={creating}
              className="glass rounded-2xl p-7 border border-border/30 hover:border-accent/30 transition-all text-left group disabled:opacity-60 card-hover spotlight-card relative overflow-hidden"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
                e.currentTarget.style.setProperty("--y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
              }}
            >
              <div className="flex items-center gap-4 mb-4 relative z-[1]">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-accent/15">
                  <Upload className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Upload Footage</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Already have video? Jump to editing</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed relative z-[1]">
                Upload your video, then add motion graphics, captions, and polish with AI-powered editing.
              </p>
              <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-accent absolute bottom-6 right-6 transition-all group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* In Progress */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading projects...</span>
          </div>
        ) : (
          <>
            {drafts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <Folder className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    In Progress ({drafts.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {drafts.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      userId={user?.id ?? ""}
                      onDelete={() => handleDelete(project)}
                      onResume={() => handleResume(project)}
                      onTitleChange={(title) => handleTitleChange(project.id, title)}
                    />
                  ))}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <Check className="w-4 h-4 text-green-400" />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    Completed ({completed.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {completed.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      userId={user?.id ?? ""}
                      onDelete={() => handleDelete(project)}
                      onResume={() => handleResume(project)}
                      onTitleChange={(title) => handleTitleChange(project.id, title)}
                    />
                  ))}
                </div>
              </div>
            )}

            {projects.length === 0 && (
              <Card className="glass rounded-2xl p-14 text-center border-border/30 border-dashed">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Film className="w-7 h-7 text-primary/40" />
                </div>
                <p className="text-foreground font-semibold text-lg mb-1">No projects yet</p>
                <p className="text-sm text-muted-foreground mb-6">Create your first reel to get started</p>
                <Button onClick={handleNewFromIdea} className="gap-2 rounded-xl shadow-lg shadow-primary/20" disabled={creating}>
                  <Plus className="w-4 h-4" /> Create First Reel
                </Button>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
