import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Project, Task, ProjectWithTaskCount } from '../../types'

export function computeProjectsWithTaskCounts(
  projects: Project[],
  tasks: Task[]
): ProjectWithTaskCount[] {
  return projects
    .filter(p => p.status === 'active')
    .map(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id)
      return {
        ...project,
        open_task_count: projectTasks.filter(t => t.status !== 'done').length,
        total_task_count: projectTasks.length,
      }
    })
}

export function useHomeData() {
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Project[]
    },
  })

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Task[]
    },
  })

  const projects = projectsQuery.data ?? []
  const tasks = tasksQuery.data ?? []
  const projectsWithCounts = computeProjectsWithTaskCounts(projects, tasks)

  const today = new Date().toISOString().split('T')[0]
  const dueTodayCount = tasks.filter(
    t => t.due_date === today && t.status !== 'done'
  ).length

  return {
    projectsWithCounts,
    openTaskCount: tasks.filter(t => t.status !== 'done').length,
    dueTodayCount,
    isLoading: projectsQuery.isLoading || tasksQuery.isLoading,
    error: projectsQuery.error ?? tasksQuery.error,
  }
}
