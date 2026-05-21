import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TopBar } from '../../components/layout/TopBar'
import { MonthGrid } from './MonthGrid'
import { DayPanel } from './DayPanel'
import { AddEventModal } from './AddEventModal'
import { useCalendarData, getItemsForDay, type CalendarItem } from './useCalendar'
import { SkeletonBlock } from '../../components/SkeletonBlock'
import { supabase } from '../../lib/supabase'
import type { Project } from '../../types'

export function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  )
  const [showAddEvent, setShowAddEvent] = useState(false)

  const { tasks, events, isLoading: isCalendarLoading } = useCalendarData(year, month)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*')
      if (error) throw error
      return data as Project[]
    },
  })

  // Build items map: date -> CalendarItem[]
  const itemsMap = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {}
    const allDays = new Set([
      ...tasks.map(t => t.due_date).filter(Boolean) as string[],
      ...events.map(e => e.start_time.split('T')[0]),
    ])
    allDays.forEach(date => {
      map[date] = getItemsForDay(date, tasks, events)
    })
    return map
  }, [tasks, events])

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const action = (
    <div className="flex items-center gap-3">
      <button onClick={prevMonth} className="text-slate-400 hover:text-slate-200 px-2">‹</button>
      <span className="text-slate-300 text-sm font-medium">{monthLabel}</span>
      <button onClick={nextMonth} className="text-slate-400 hover:text-slate-200 px-2">›</button>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-900">
      <TopBar action={action} />
      <div className="flex flex-col flex-1 min-h-0">
        {isCalendarLoading ? (
          <div className="grid grid-cols-7 gap-1 p-4 flex-1 content-start">
            {Array.from({ length: 35 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <>
            <MonthGrid
              year={year}
              month={month}
              items={itemsMap}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              projects={projects}
            />
            {selectedDay && (
              <DayPanel
                date={selectedDay}
                items={itemsMap[selectedDay] ?? []}
                projects={projects}
                onAddEvent={() => setShowAddEvent(true)}
              />
            )}
          </>
        )}
      </div>
      {showAddEvent && selectedDay && (
        <AddEventModal
          date={selectedDay ?? ''}
          projects={projects}
          onClose={() => setShowAddEvent(false)}
        />
      )}
    </div>
  )
}
