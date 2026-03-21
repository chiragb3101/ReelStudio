import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a Supabase client authenticated with a Clerk JWT token.
 * Use this for server-side or authenticated operations.
 */
export function createAuthClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

// ── Project CRUD operations ──

export interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  stage: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDataRow {
  project_id: string;
  stage_name: string;
  data: Record<string, unknown>;
}

export async function getProjects(userId: string): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createProject(
  userId: string,
  title: string
): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, title, stage: "idea" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectStage(
  projectId: string,
  stage: string
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) throw error;
}

export async function deleteProject(projectId: string): Promise<void> {
  // Delete project data first, then the project
  await supabase.from("project_data").delete().eq("project_id", projectId);
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function saveProjectData(
  projectId: string,
  stageName: string,
  data: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("project_data")
    .upsert(
      { project_id: projectId, stage_name: stageName, data },
      { onConflict: "project_id,stage_name" }
    );

  if (error) throw error;
}

export async function loadProjectData(
  projectId: string
): Promise<ProjectDataRow[]> {
  const { data, error } = await supabase
    .from("project_data")
    .select("*")
    .eq("project_id", projectId);

  if (error) throw error;
  return data ?? [];
}
