import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TopBar } from '../../components/layout/TopBar'
import { TaskFilterBar, type TaskFilter } from './TaskFilterBar'
import { TaskList } from './TaskList'
import { TaskDetailPanel } from './TaskDetailPanel'
import { useTasks, groupTasksByHorizon, useUpdateTask } from './useTasks'
import { supabase } from '../../lib/supabase'
import type { Task, Project } from '../../types'

export function TasksPage() {
  const [searchParams] = useSearchParams()
  const projectIdParam = searchParams.get('project')

  const [filter, setFilter] = useState<TaskFilter>(
    projectIdParam ?? 'all'
  )

  useEffect(() => {
    setFilter(projectIdParam ?? 'all')
  }, [projectIdParam])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const { data: tasks = [] } = useTasks(
    filter === 'all' || filter === 'today' || filter === 'this-week' ? null : filter
  )
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*')
      if (error) throw error
      return data as Project[]
    },
  })
  const updateTask = useUpdateTask()

  const handleToggle = (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const next =
      task.status === 'todo' ? 'in_progress'
      : task.status === 'in_progress' ? 'done'
      : 'todo'
    updateTask.mutate({ id, status: next })
  }

  const displayedTasks =
    filter === 'all' || filter === 'today' || filter === 'this-week'
      ? tasks
      : tasks.filter(t => t.project_id === filter)

  const groups = groupTasksByHorizon(displayedTasks)

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-900">
      <TopBar />
      <TaskFilterBar
        filter={filter}
        onFilterChange={setFilter}
        projects={projects}
        showCompleted={showCompleted}
        onToggleCompleted={setShowCompleted}
      />
      <div className="flex flex-1 min-h-0">
        <TaskList
          groups={groups}
          allTasks={displayedTasks}
          projects={projects}
          filter={filter}
          showCompleted={showCompleted}
          onToggle={handleToggle}
          onSelect={setSelectedTask}
          projectId={
            filter !== 'all' && filter !== 'today' && filter !== 'this-week' ? filter : null
          }
        />
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            projects={projects}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    </div>
  )
}
