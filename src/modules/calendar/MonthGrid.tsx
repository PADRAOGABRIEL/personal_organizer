import { getCalendarDays, type CalendarItem } from './useCalendar'
import type { Project } from '../../types'

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface MonthGridProps {
  year: number
  month: number
  items: Record<string, CalendarItem[]>   // date -> items
  selectedDay: string | null
  onSelectDay: (date: string) => void
  projects: Project[]
}

export function MonthGrid({ year, month, items, selectedDay, onSelectDay, projects }: MonthGridProps) {
  const days = getCalendarDays(year, month)

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-center text-xs text-slate-500 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-1">
        {days.map(day => {
          const dayItems = items[day.date] ?? []
          const isSelected = day.date === selectedDay
          return (
            <button
              key={day.date}
              onClick={() => onSelectDay(day.date)}
              className={`
                flex flex-col rounded-lg p-1 text-left transition-colors min-h-[44px] md:min-h-[56px]
                ${day.isCurrentMonth ? 'hover:bg-slate-800' : 'opacity-30'}
                ${isSelected ? 'bg-slate-700 ring-1 ring-indigo-500' : ''}
              `}
            >
              <span className={`
                text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                ${day.isToday ? 'bg-indigo-600 text-white' : day.isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}
              `}>
                {new Date(day.date + 'T00:00:00').getDate()}
              </span>
              {/* Mobile: colored dots only */}
              {dayItems.length > 0 && (
                <div className="flex md:hidden gap-0.5 flex-wrap mt-0.5">
                  {dayItems.slice(0, 4).map(item => {
                    const color = projects.find(p => p.id === item.projectId)?.color ?? '#6366f1'
                    return (
                      <span
                        key={item.id}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    )
                  })}
                </div>
              )}
              {/* Desktop: text labels */}
              <div className="hidden md:flex flex-col gap-0.5 mt-0.5 w-full">
                {dayItems.slice(0, 3).map(item => {
                  const color = projects.find(p => p.id === item.projectId)?.color ?? '#6366f1'
                  return (
                    <span
                      key={item.id}
                      className="block truncate rounded text-[10px] leading-4 px-1"
                      style={{ backgroundColor: color + '33', color }}
                    >
                      {item.title}
                    </span>
                  )
                })}
                {dayItems.length > 3 && (
                  <span className="text-slate-500 text-[9px] px-1">+{dayItems.length - 3} more</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
