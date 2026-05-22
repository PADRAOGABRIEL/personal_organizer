import type { Project } from '../../types'

export type TaskFilter = 'all' | 'today' | 'this-week' | string  // string = project id

interface TaskFilterBarProps {
  filter: TaskFilter
  onFilterChange: (f: TaskFilter) => void
  projects: Project[]
  showCompleted: boolean
  onToggleCompleted: (value: boolean) => void
}

export function TaskFilterBar({ filter, onFilterChange, projects, showCompleted, onToggleCompleted }: TaskFilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 overflow-x-auto scrollbar-none">
      {(['all', 'today', 'this-week'] as const).map(f => (
        <button
          key={f}
          onClick={() => onFilterChange(f)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            filter === f
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {f === 'all' ? 'All' : f === 'today' ? 'Today' : 'This Week'}
        </button>
      ))}
      <button
        onClick={() => onToggleCompleted(!showCompleted)}
        title={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}
        className={`shrink-0 ml-0 md:ml-auto px-3 py-1.5 rounded-lg text-sm transition-colors ${
          showCompleted
            ? 'bg-emerald-700/60 text-emerald-100'
            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
        }`}
      >
        {showCompleted ? '✓ Showing completed' : 'Show completed'}
      </button>
      <select
        value={projects.some(p => p.id === filter) ? filter : ''}
        onChange={e => onFilterChange(e.target.value || 'all')}
        className="shrink-0 bg-slate-800 text-slate-400 text-sm rounded-lg px-3 py-1.5 outline-none border border-slate-700 hover:border-slate-600"
      >
        <option value="">All Projects</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  )
}
