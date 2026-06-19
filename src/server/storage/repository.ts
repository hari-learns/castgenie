import {
  createProject,
  listProjects,
  readProject,
  updateProject,
  writeProject,
} from "@/lib/storage"
import {
  isSupabaseStorageEnabled,
  listSupabaseProjects,
  readSupabaseProject,
  upsertSupabaseArtifactManifest,
  upsertSupabaseProject,
  upsertSupabaseSourcesSummary,
} from "@/server/supabase/repository"
import type { Project } from "@/types/project"
import type { SourceConfig } from "@/types/source-intake"

type CreateProjectInput = {
  id: string
  name: string
  prompt: string
  sourceConfig?: SourceConfig
}

export async function createProjectRecord(input: CreateProjectInput) {
  const project = await createProject(input)
  await upsertSupabaseProject(project)
  return project
}

export async function readProjectRecord(projectId: string) {
  if (isSupabaseStorageEnabled()) {
    const project = await readSupabaseProject(projectId)
    if (project) {
      return project
    }
  }

  return readProject(projectId)
}

export async function listProjectRecords() {
  if (isSupabaseStorageEnabled()) {
    const projects = await listSupabaseProjects()
    if (projects) {
      return projects
    }
  }

  return listProjects()
}

export async function writeProjectRecord(project: Project) {
  await writeProject(project)
  await upsertSupabaseProject(project)
  await upsertSupabaseArtifactManifest(project)
  await upsertSupabaseSourcesSummary(project)
}

export async function updateProjectRecord(projectId: string, patch: Partial<Project>) {
  const project = await updateProject(projectId, patch)

  if (project) {
    await upsertSupabaseProject(project)
  }

  return project
}

export async function mirrorProjectRecord(project: Project) {
  await upsertSupabaseProject(project)
  await upsertSupabaseArtifactManifest(project)
  await upsertSupabaseSourcesSummary(project)
}
