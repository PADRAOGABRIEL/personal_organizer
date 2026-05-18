import type { Project } from '../../types'

export type TaskFilter = 'all' | 'today' | 'this-week' | string  // string = project id

interface TaskFilterBarProps {
  filter: TaskFilter
  onFilterChange: (f: TaskFilter) => void
  projects: Project[]
}

export function TaskFilterBar({ filter, onFilterChange, projects }: TaskFilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800">
      {(['all', 'today', 'this-week'] as const).map(f => (
        <button
          key={f}
          onClick={() => onFilterChange(f)}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            filter === f
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {f === 'all' ? 'All' : f === 'today' ? 'Today' : 'This Week'}
        </button>
      ))}
      <select
        value={projects.some(p => p.id === filter) ? filter : ''}
        onChange={e => onFilterChange(e.target.value || 'all')}
        className="ml-auto bg-slate-800 text-slate-400 text-sm rounded-lg px-3 py-1 outline-none border border-slate-700 hover:border-slate-600"
      >
        <option value="">All Projects</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  )
}
