import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TopBar } from '../../components/layout/TopBar'
import { MonthGrid } from './MonthGrid'
import { DayPanel } from './DayPanel'
import { WeekGrid } from './WeekGrid'
import { DayGrid } from './DayGrid'
import { ViewSwitcher, type CalendarView } from './ViewSwitcher'
import { AddItemModal } from './AddItemModal'
import { CalendarEventDetailPanel } from './CalendarEventDetailPanel'
import { useCalendarData, getItemsForDay, type CalendarItem, useImportFromGoogleCalendar } from './useCalendar'
import { TaskDetailPanel } from '../tasks/TaskDetailPanel'
import { supabase } from '../../lib/supabase'
import type { Project } from '../../types'

function pad(n: number) { return String(n).padStart(2, '0') }

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return toDateStr(d)
}

function addDaysToStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

export function CalendarPage() {
  const now = new Date()
  const todayStr = toDateStr(now)

  const [view, setView] = useState<CalendarView>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<string>(todayStr)
  const [weekStart, setWeekStart] = useState(getMondayOf(todayStr))
  const [showAddModal, setShowAddModal] = useState(false)
  const [dragSlot, setDragSlot] = useState<{ date: string; start: string; end: string } | null>(null)
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null)

  // Compute date range normalized to month boundaries so that switching between
  // month/week/day views within the same month reuses the same TanStack Query cache
  // entry instead of triggering a new Supabase fetch on every view change.
  const { calStart, calEnd } = useMemo(() => {
    // Determine the first and last visible dates for this view
    let startAnchor: string
    let endAnchor: string

    if (view === 'month') {
      startAnchor = `${year}-${pad(month + 1)}-01`
      endAnchor = startAnchor
    } else if (view === 'week') {
      startAnchor = weekStart
      endAnchor = addDaysToStr(weekStart, 6)
    } else {
      startAnchor = selectedDay
      endAnchor = selectedDay
    }

    // Round both anchors to their month boundaries
    const sy = parseInt(startAnchor.slice(0, 4))
    const sm = parseInt(startAnchor.slice(5, 7)) - 1
    const ey = parseInt(endAnchor.slice(0, 4))
    const em = parseInt(endAnchor.slice(5, 7)) - 1
    const lastDayEnd = new Date(ey, em + 1, 0).getDate()

    return {
      calStart: `${sy}-${pad(sm + 1)}-01T00:00:00`,
      calEnd: `${ey}-${pad(em + 1)}-${pad(lastDayEnd)}T23:59:59`,
    }
  }, [view, year, month, weekStart, selectedDay])

  const { tasks, events, rawEvents } = useCalendarData(calStart, calEnd)
  const importGcal = useImportFromGoogleCalendar()

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*')
      if (error) throw error
      return data as Project[]
    },
  })

  // Check if Google Calendar is connected
  const { data: gcalConnection } = useQuery({
    queryKey: ['google_connection'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_google_connection_status')
      return data as { connected: boolean; email?: string; last_synced_at?: string } | null
    },
  })

  // Build items map: date -> CalendarItem[]
  const itemsMap = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {}
    const toLocalDate = (iso: string) => {
      const d = new Date(iso)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    const allDays = new Set([
      ...tasks.map(t => t.due_date).filter(Boolean) as string[],
      ...events.map(e => toLocalDate(e.start_time)),
    ])
    allDays.forEach(date => {
      map[date] = getItemsForDay(date, tasks, events)
    })
    return map
  }, [tasks, events])

  // Navigation labels and handlers
  const monthLabel = new Date(year, month, 1).toLocaleDateString('pt-BR', {
    month: 'long', year: 'numeric',
  })
  const weekLabel = (() => {
    const end = addDaysToStr(weekStart, 6)
    const s = new Date(weekStart + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    const e = new Date(end + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    return `${s} – ${e}`
  })()
  const dayLabel = new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const prevPeriod = () => {
    if (view === 'month') {
      if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    } else if (view === 'week') {
      setWeekStart(w => addDaysToStr(w, -7))
    } else {
      setSelectedDay(d => addDaysToStr(d, -1))
    }
  }
  const nextPeriod = () => {
    if (view === 'month') {
      if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    } else if (view === 'week') {
      setWeekStart(w => addDaysToStr(w, 7))
    } else {
      setSelectedDay(d => addDaysToStr(d, 1))
    }
  }

  const handleViewChange = (v: CalendarView) => {
    setView(v)
    if (v === 'week') setWeekStart(getMondayOf(selectedDay))
  }

  const handleDragCreate = (date: string, start: string, end: string) => {
    setDragSlot({ date, start, end })
    setShowAddModal(true)
  }

  const handleDayCreate = (start: string, end: string) => {
    setDragSlot({ date: selectedDay, start, end })
    setShowAddModal(true)
  }

  const handleSelectDay = (date: string) => {
    setSelectedDay(date)
  }

  const handleItemClick = (item: CalendarItem) => {
    setSelectedItem(item)
  }

  const closeDetailPanel = () => setSelectedItem(null)

  const currentLabel = view === 'month' ? monthLabel : view === 'week' ? weekLabel : dayLabel

  const action = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {gcalConnection?.connected && (
        <button
          onClick={() => importGcal.mutate()}
          disabled={importGcal.isPending}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {importGcal.isPending ? 'Sincronizando…' : '⟳ Sync GCal'}
        </button>
      )}
      <ViewSwitcher view={view} onChange={handleViewChange} />
      <div className="flex items-center gap-1">
        <button onClick={prevPeriod} className="text-slate-400 hover:text-slate-200 px-2 py-1">‹</button>
        <span className="text-slate-300 text-sm font-medium min-w-[120px] text-center">{currentLabel}</span>
        <button onClick={nextPeriod} className="text-slate-400 hover:text-slate-200 px-2 py-1">›</button>
      </div>
    </div>
  )

  // Resolve the selected item to a full task or event for the detail panel
  const detailPanel = (() => {
    if (!selectedItem) return null
    if (selectedItem.type === 'task') {
      const task = tasks.find(t => t.id === selectedItem.id)
      if (!task) return null
      return (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={closeDetailPanel} />
          <TaskDetailPanel task={task} projects={projects} onClose={closeDetailPanel} />
        </>
      )
    }
    const realId = selectedItem.id.includes('__') ? selectedItem.id.split('__')[0] : selectedItem.id
    const event = rawEvents.find(e => e.id === realId)
    if (!event) return null
    // For expanded occurrences of recurring events, override start/end with
    // the occurrence's actual dates so the panel shows the correct date/time
    const displayEvent = selectedItem.id.includes('__')
      ? { ...event, start_time: selectedItem.startTime ?? event.start_time, end_time: selectedItem.endTime ?? event.end_time }
      : event
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={closeDetailPanel} />
        <CalendarEventDetailPanel event={displayEvent} projects={projects} onClose={closeDetailPanel} />
      </>
    )
  })()

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-900">
      <TopBar action={action} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {view === 'month' && (
            <>
              <MonthGrid
                year={year}
                month={month}
                items={itemsMap}
                selectedDay={selectedDay}
                onSelectDay={handleSelectDay}
                projects={projects}
              />
              {selectedDay && (
                <DayPanel
                  date={selectedDay}
                  items={itemsMap[selectedDay] ?? []}
                  projects={projects}
                  onAddEvent={() => {
                    setDragSlot(null)
                    setShowAddModal(true)
                  }}
                  onItemClick={handleItemClick}
                />
              )}
            </>
          )}

          {view === 'week' && (
            <WeekGrid
              weekStart={weekStart}
              itemsByDate={itemsMap}
              projects={projects}
              onCreateAt={handleDragCreate}
              onItemClick={handleItemClick}
            />
          )}

          {view === 'day' && (
            <DayGrid
              date={selectedDay}
              items={itemsMap[selectedDay] ?? []}
              projects={projects}
              onCreateAt={handleDayCreate}
              onItemClick={handleItemClick}
            />
          )}
        </div>
        {detailPanel}
      </div>

      {showAddModal && (
        <AddItemModal
          date={dragSlot?.date ?? selectedDay}
          startTime={dragSlot?.start}
          endTime={dragSlot?.end}
          projects={projects}
          onClose={() => {
            setShowAddModal(false)
            setDragSlot(null)
          }}
        />
      )}
    </div>
  )
}
