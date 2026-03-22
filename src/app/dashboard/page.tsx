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
          className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm font-medium outline-none"
        />
        <button onClick={save} className="text-primary shrink-0"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => { setValue(initialTitle); setEditing(false); }} className="text-muted-foreground shrink-0"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0 group/title">
      <h3 className="font-medium text-sm truncate">{value}</h3>
      <button onClick={startEdit} className="opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0">
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

function StageProgress({ stage }: { stage: string }) {
  const idx = stageIndex(stage);
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {STAGES.map((s, i) => (
        <div
          key={s}
          className={`h-1 rounded-full flex-1 transition-colors ${
            i < idx
              ? "bg-primary"
              : i === idx
              ? "bg-primary/50"
              : "bg-border/50"
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

  return (
    <Card className="glass rounded-xl border-border/50 hover:border-primary/20 transition-colors group">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${completed ? "bg-green-500/10" : "bg-primary/10"}`}>
              <Film className={`w-4 h-4 ${completed ? "text-green-400" : "text-primary"}`} />
            </div>
            <EditableTitle
              projectId={project.id}
              userId={userId}
              initialTitle={project.title}
              onSave={onTitleChange}
            />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <StageProgress stage={project.stage} />

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {completed ? (
              <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
                <Check className="w-2.5 h-2.5 mr-1" /> Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                {STAGE_LABELS[project.stage] ?? project.stage} · {idx + 1}/9
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
            </span>
          </div>
          <Button
            size="sm"
            variant={completed ? "outline" : "default"}
            onClick={onResume}
            className="gap-1 rounded-lg h-7 text-xs"
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Film className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-semibold">ReelStudio</h1>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.firstName || user.primaryEmailAddress?.emailAddress}
              </span>
              {user.imageUrl && (
                <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full" />
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* New Reel */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Create New Reel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleNewFromIdea}
              disabled={creating}
              className="glass rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all text-left group disabled:opacity-60"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  {creating ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Sparkles className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <h3 className="font-semibold">Start from Idea</h3>
                  <p className="text-xs text-muted-foreground">Full pipeline: Idea → Script → Shoot → Edit</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                AI guides you through every step — from topic research to a polished, scheduled reel.
              </p>
            </button>

            <button
              onClick={handleNewFromUpload}
              disabled={creating}
              className="glass rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all text-left group disabled:opacity-60"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Upload className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Upload Footage</h3>
                  <p className="text-xs text-muted-foreground">Already have video? Add motion graphics & captions</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload your video, then add motion graphics, captions, and polish with AI-powered editing.
              </p>
            </button>
          </div>
        </div>

        {/* In Progress */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {drafts.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  In Progress ({drafts.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Completed ({completed.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <Card className="glass rounded-2xl p-10 text-center border-border/50">
                <Film className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No projects yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Create your first reel above!</p>
                <Button onClick={handleNewFromIdea} className="mt-4 gap-2 rounded-xl" disabled={creating}>
                  <Plus className="w-4 h-4" /> New Reel
                </Button>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
