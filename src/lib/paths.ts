import path from "node:path"

export const storageRoot = path.join(/*turbopackIgnore: true*/ process.cwd(), "storage")
export const projectsRoot = path.join(storageRoot, "projects")

export function projectRoot(projectId: string) {
  return path.join(projectsRoot, projectId)
}

export function projectArtifactPath(projectId: string, ...segments: string[]) {
  return path.join(projectRoot(projectId), ...segments)
}
