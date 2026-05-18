import type { Task, Project } from '../../types'

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-900/50 text-red-300',
  medium: 'bg-amber-900/50 text-amber-300',
  low: 'bg-green-900/50 text-green-300',
}

const PRIORITY_LABEL: Record<string, string> = {
  high: 'High', medium: 'Medium', low: 'Low',
}

interface TaskRowProps {
  task: Task
  projects: Project[]
  onToggle: (id: string) => void
  onSelect: (task: Task) => void
}

export function TaskRow({ task, projects, onToggle, onSelect }: TaskRowProps) {
  const project = projects.find(p => p.id === task.project_id)
  const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0]

  return (
    <div
      className="flex items-center gap-3 bg-slate-800 rounded-lg px-3 py-2.5 hover:bg-slate-750 cursor-pointer group"
      onClick={() => onSelect(task)}
    >
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={() => onToggle(task.id)}
        onClick={e => e.stopPropagation()}
        className="w-4 h-4 rounded-full border-2 border-slate-500 accent-indigo-500 cursor-pointer shrink-0"
      />
      <span className={`flex-1 text-sm ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
        {task.title}
      </span>
      {project && (
        <span className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
          {project.name}
        </span>
      )}
      <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_STYLES[task.priority]} shrink-0`}>
        {PRIORITY_LABEL[task.priority]}
      </span>
      {task.due_date && (
        <span className={`text-xs shrink-0 ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
          {formatDueDate(task.due_date)}
        </span>
      )}
    </div>
  )
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
