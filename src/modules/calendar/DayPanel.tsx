import type { CalendarItem } from './useCalendar'
import type { Project } from '../../types'

interface DayPanelProps {
  date: string
  items: CalendarItem[]
  projects: Project[]
  onAddEvent: () => void
}

export function DayPanel({ date, items, projects, onAddEvent }: DayPanelProps) {
  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="border-t border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-300 text-sm font-semibold">{label}</h3>
        <button
          onClick={onAddEvent}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1 rounded-lg transition-colors"
        >
          + Add event
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-slate-500 text-xs">Nothing scheduled.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map(item => {
            const project = projects.find(p => p.id === item.projectId)
            return (
              <div key={item.id} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: project?.color ?? '#6366f1' }}
                />
                <span className="text-slate-200 text-sm flex-1">{item.title}</span>
                <span className="text-slate-500 text-xs">{item.type}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
