import { useState, useEffect, useCallback } from 'react'
import type { Task, Project, Priority } from '../../types'
import { useUpdateTask, useDeleteTask } from './useTasks'

interface TaskDetailPanelProps {
  task: Task
  projects: Project[]
  onClose: () => void
}

export function TaskDetailPanel({ task, projects, onClose }: TaskDetailPanelProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [projectId, setProjectId] = useState(task.project_id ?? '')

  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  // Sync when task changes
  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setDueDate(task.due_date ?? '')
    setPriority(task.priority)
    setProjectId(task.project_id ?? '')
  }, [task.id])

  const save = useCallback((overrides?: Partial<Task>) => {
    updateTask.mutate({
      id: task.id,
      title: overrides?.title ?? (title.trim() || task.title),
      description: overrides?.description ?? (description || null),
      due_date: overrides?.due_date ?? (dueDate || null),
      priority: overrides?.priority ?? priority,
      project_id: overrides?.project_id ?? (projectId || null),
      status: task.status,
    })
  }, [task, updateTask, title, description, dueDate, priority, projectId])

  return (
    <aside className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-y-auto shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-slate-400 text-xs uppercase tracking-wider">Task Detail</span>
        <button
          aria-label="Close panel"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-5 p-4">
        {/* Title */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => save()}
            className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => save()}
            rows={4}
            className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Due date */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => { setDueDate(e.target.value); save({ due_date: e.target.value || null }) }}
            className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Priority</label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as Priority[]).map(p => (
              <button
                key={p}
                onClick={() => { setPriority(p); save({ priority: p }) }}
                className={`flex-1 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                  priority === p
                    ? p === 'high' ? 'bg-red-800 text-red-200'
                      : p === 'medium' ? 'bg-amber-800 text-amber-200'
                      : 'bg-green-800 text-green-200'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Project */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Project</label>
          <select
            value={projectId}
            onChange={e => { setProjectId(e.target.value); save({ project_id: e.target.value || null }) }}
            className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700"
          >
            <option value="">No project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Delete */}
        <button
          onClick={() => { deleteTask.mutate(task.id); onClose() }}
          className="mt-2 w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          Delete task
        </button>
      </div>
    </aside>
  )
}
