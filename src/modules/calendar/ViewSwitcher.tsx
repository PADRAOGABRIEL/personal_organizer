export type CalendarView = 'month' | 'week' | 'day'

interface ViewSwitcherProps {
  view: CalendarView
  onChange: (v: CalendarView) => void
}

const LABELS: Record<CalendarView, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
}

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-700">
      {(['month', 'week', 'day'] as CalendarView[]).map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 text-sm transition-colors ${
            view === v
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {LABELS[v]}
        </button>
      ))}
    </div>
  )
}
