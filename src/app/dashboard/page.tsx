"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Plus,
  Film,
  Upload,
  Trash2,
  Clock,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectDraft {
  id: string;
  title: string;
  stage: string;
  updatedAt: string;
  template?: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectDraft[]>([]);
  const [loading, setLoading] = useState(true);

  // Load projects from localStorage (later: Supabase)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("reelstudio-projects");
      if (saved) {
        setProjects(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  function saveProjects(updated: ProjectDraft[]) {
    setProjects(updated);
    localStorage.setItem("reelstudio-projects", JSON.stringify(updated));
  }

  function handleNewFromIdea() {
    // Clear current draft and start fresh
    localStorage.removeItem("reelstudio-draft");
    const newProject: ProjectDraft = {
      id: crypto.randomUUID(),
      title: "Untitled Reel",
      stage: "idea",
      updatedAt: new Date().toISOString(),
    };
    saveProjects([newProject, ...projects]);
    router.push("/pipeline/idea");
  }

  function handleNewFromUpload() {
    localStorage.removeItem("reelstudio-draft");
    const newProject: ProjectDraft = {
      id: crypto.randomUUID(),
      title: "Uploaded Video",
      stage: "edit",
      updatedAt: new Date().toISOString(),
    };
    saveProjects([newProject, ...projects]);
    router.push("/pipeline/shoot");
  }

  function handleResume(project: ProjectDraft) {
    router.push(`/pipeline/${project.stage}`);
  }

  function handleDelete(projectId: string) {
    saveProjects(projects.filter((p) => p.id !== projectId));
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }

  const stageLabels: Record<string, string> = {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Film className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-semibold">ReelStudio</h1>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {user.firstName || user.emailAddresses[0]?.emailAddress}
              </span>
              {user.imageUrl && (
                <img
                  src={user.imageUrl}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* New Reel Section */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Create New Reel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleNewFromIdea}
              className="glass rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Start from Idea</h3>
                  <p className="text-xs text-muted-foreground">
                    Full pipeline: Idea → Script → Shoot → Edit
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                AI guides you through every step — from topic research to a polished,
                scheduled reel.
              </p>
            </button>

            <button
              onClick={handleNewFromUpload}
              className="glass rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Upload className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Upload Footage</h3>
                  <p className="text-xs text-muted-foreground">
                    Already have video? Add motion graphics & captions
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload your video, then add motion graphics, captions, and polish
                with AI-powered editing.
              </p>
            </button>
          </div>
        </div>

        {/* Projects List */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Your Projects {projects.length > 0 && `(${projects.length})`}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <Card className="glass rounded-2xl p-8 text-center border-border/50">
              <Film className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                No projects yet. Create your first reel above!
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="glass rounded-xl border-border/50 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Film className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">{project.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                            {stageLabels[project.stage] ?? project.stage}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(project.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleResume(project)}
                        className="gap-1 rounded-lg bg-primary hover:bg-primary/90"
                      >
                        Resume
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
