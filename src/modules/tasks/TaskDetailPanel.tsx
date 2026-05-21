import { useState, useEffect, useCallback } from 'react'
import type { Task, Project, Priority, TaskStatus } from '../../types'
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
  const [dueTime, setDueTime] = useState(task.due_time?.slice(0, 5) ?? '')
  const [duration, setDuration] = useState<string>(task.duration_minutes?.toString() ?? '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [projectId, setProjectId] = useState(task.project_id ?? '')
  const [status, setStatus] = useState<TaskStatus>(task.status)

  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setDueDate(task.due_date ?? '')
    setDueTime(task.due_time?.slice(0, 5) ?? '')
    setDuration(task.duration_minutes?.toString() ?? '')
    setPriority(task.priority)
    setProjectId(task.project_id ?? '')
    setStatus(task.status)
  }, [task.id])

  const save = useCallback((overrides?: Partial<Task>) => {
    const o = overrides ?? {}
    updateTask.mutate({
      id: task.id,
      title: 'title' in o ? o.title! : (title.trim() || task.title),
      description: 'description' in o ? o.description : (description || null),
      due_date: 'due_date' in o ? o.due_date : (dueDate || null),
      due_time: 'due_time' in o ? o.due_time : (dueTime ? `${dueTime}:00` : null),
      duration_minutes: 'duration_minutes' in o ? o.duration_minutes : (duration ? Number(duration) : null),
      priority: 'priority' in o ? o.priority! : priority,
      project_id: 'project_id' in o ? o.project_id : (projectId || null),
      status: 'status' in o ? o.status! : status,
    })
  }, [task, updateTask, title, description, dueDate, dueTime, duration, priority, projectId, status])

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

        {/* Status */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Status</label>
          <div className="flex gap-2">
            {(['todo', 'in_progress', 'done'] as TaskStatus[]).map(s => (
              <button
                key={s}
                onClick={() => { setStatus(s); save({ status: s }) }}
                className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${
                  status === s
                    ? s === 'done' ? 'bg-indigo-700 text-indigo-100'
                      : s === 'in_progress' ? 'bg-indigo-900/60 text-indigo-200'
                      : 'bg-slate-600 text-slate-100'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {s === 'in_progress' ? 'In progress' : s === 'todo' ? 'To do' : 'Done'}
              </button>
            ))}
          </div>
        </div>

        {/* Due date + time */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Due Date</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={e => {
                const newDate = e.target.value
                setDueDate(newDate)
                if (!newDate) {
                  setDueTime('')
                  save({ due_date: null, due_time: null })
                } else {
                  save({ due_date: newDate })
                }
              }}
              className="flex-1 bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
            />
            <input
              type="time"
              value={dueTime}
              disabled={!dueDate}
              onChange={e => {
                const newTime = e.target.value
                setDueTime(newTime)
                save({ due_time: newTime ? `${newTime}:00` : null })
              }}
              className="w-28 bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark] disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
          {dueDate && !dueTime && (
            <p className="text-slate-600 text-xs mt-1">All-day. Set a time to make it timed.</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Estimated duration</label>
          <div className="flex gap-2 items-center">
            <select
              value={duration}
              disabled={!dueTime}
              onChange={e => {
                const v = e.target.value
                setDuration(v)
                save({ duration_minutes: v ? Number(v) : null })
              }}
              className="flex-1 bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">30 min (default)</option>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hour</option>
              <option value="90">1h 30min</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
              <option value="240">4 hours</option>
              <option value="480">8 hours</option>
            </select>
          </div>
          {!dueTime && (
            <p className="text-slate-600 text-xs mt-1">Set a time first to use a duration.</p>
          )}
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
