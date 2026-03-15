import { useProject } from '../contexts/ProjectContext'

export interface ProjectStatus {
  /** True if at least one project exists */
  hasProjects: boolean
  /** True if a current project is selected */
  hasCurrentProject: boolean
  /** Current project info (or null) */
  currentProject: ReturnType<typeof useProject>['currentProject']
  /** All projects for the current client */
  projects: ReturnType<typeof useProject>['projects']
}

export function useProjectStatus(): ProjectStatus {
  const { projects, currentProject } = useProject()

  return {
    hasProjects: projects.length > 0,
    hasCurrentProject: !!currentProject,
    currentProject,
    projects,
  }
}
