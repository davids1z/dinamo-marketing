/* eslint-disable react-refresh/only-export-components */
// Standard pattern: context + hook exported together from same file
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useClient, type ProjectInfo } from './ClientContext'

interface ProjectContextType {
  projects: ProjectInfo[]
  currentProject: ProjectInfo | null
  switchProject: (projectId: string) => void
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  currentProject: null,
  switchProject: () => {},
})

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { currentClient } = useClient()
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(
    () => localStorage.getItem('current_project_id')
  )

  const projects = useMemo(() => currentClient?.projects || [], [currentClient?.projects])

  const currentProject = projects.find(p => p.project_id === currentProjectId) || projects[0] || null

  // Sync current project when client changes or project list changes
  useEffect(() => {
    const first = projects[0]
    if (first && !projects.find(p => p.project_id === currentProjectId)) {
      // Current project not in list (client changed), select first one
      setTimeout(() => {
        setCurrentProjectId(first.project_id)
        localStorage.setItem('current_project_id', first.project_id)
      }, 0)
    } else if (currentProject && currentProjectId !== currentProject.project_id) {
      setTimeout(() => {
        setCurrentProjectId(currentProject.project_id)
        localStorage.setItem('current_project_id', currentProject.project_id)
      }, 0)
    }
  }, [projects, currentProjectId, currentProject])

  const switchProject = useCallback((projectId: string) => {
    setCurrentProjectId(projectId)
    localStorage.setItem('current_project_id', projectId)
    // Reload the page to refresh all data for the new project
    window.location.reload()
  }, [])

  return (
    <ProjectContext.Provider value={{ projects, currentProject, switchProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => useContext(ProjectContext)
