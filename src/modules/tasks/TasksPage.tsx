import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TopBar } from '../../components/layout/TopBar'
import { TaskFilterBar, type TaskFilter } from './TaskFilterBar'
import { TaskList } from './TaskList'
import { TaskDetailPanel } from './TaskDetailPanel'
import { useTasks, groupTasksByHorizon, useUpdateTask } from './useTasks'
import { SkeletonBlock } from '../../components/SkeletonBlock'
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

  const { data: tasks = [], isLoading: isTasksLoading } = useTasks(
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
        {isTasksLoading ? (
          <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <SkeletonBlock className="w-5 h-5 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <SkeletonBlock className="h-3.5 w-3/4" />
                  <SkeletonBlock className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
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
        )}
        {selectedTask && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setSelectedTask(null)}
            />
            <TaskDetailPanel
              task={selectedTask}
              projects={projects}
              onClose={() => setSelectedTask(null)}
            />
          </>
        )}
      </div>
    </div>
  )
}
