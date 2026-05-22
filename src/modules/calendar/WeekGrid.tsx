import { useRef, useState, useCallback } from 'react'
import type { Project } from '../../types'
import type { CalendarItem } from './useCalendar'

interface WeekGridProps {
  weekStart: string           // 'YYYY-MM-DD', Monday
  itemsByDate: Record<string, CalendarItem[]>
  projects: Project[]
  onCreateAt: (date: string, startTime: string, endTime: string) => void
  onItemClick?: (item: CalendarItem) => void
}

const HOUR_HEIGHT = 56  // px per hour
const DAY_START = 7     // 07:00 visible
const DAY_END = 23      // 23:00 visible
const VISIBLE_HOURS = DAY_END - DAY_START
const TOTAL_HEIGHT = VISIBLE_HOURS * HOUR_HEIGHT

function pad(n: number) { return String(n).padStart(2, '0') }

function minuteToY(minutes: number): number {
  const offset = minutes - DAY_START * 60
  return (offset / 60) * HOUR_HEIGHT
}

function snapMinutes(minutes: number): number {
  return Math.round(minutes / 15) * 15
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  return dateStr === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

interface DragState {
  date: string
  startMinute: number
  endMinute: number
}

export function WeekGrid({ weekStart, itemsByDate, projects, onCreateAt, onItemClick }: WeekGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragging = useRef(false)

  const dates = weekDates(weekStart)

  const getMinuteFromY = useCallback((y: number): number => {
    const raw = (y / HOUR_HEIGHT) * 60 + DAY_START * 60
    return Math.max(DAY_START * 60, Math.min(DAY_END * 60, snapMinutes(raw)))
  }, [])

  const getYFromEvent = useCallback((e: React.MouseEvent, colEl: HTMLElement): number => {
    const rect = colEl.getBoundingClientRect()
    return Math.max(0, Math.min(TOTAL_HEIGHT, e.clientY - rect.top))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent, date: string) => {
    if (e.button !== 0) return
    const col = e.currentTarget as HTMLElement
    const y = getYFromEvent(e, col)
    const startMinute = getMinuteFromY(y)
    dragging.current = true
    setDrag({ date, startMinute, endMinute: startMinute + 60 })

    const onMouseMove = (mv: MouseEvent) => {
      if (!dragging.current) return
      const rect = col.getBoundingClientRect()
      const my = Math.max(0, Math.min(TOTAL_HEIGHT, mv.clientY - rect.top))
      const endMinute = Math.max(startMinute + 15, getMinuteFromY(my))
      setDrag(d => d ? { ...d, endMinute } : null)
    }

    const onMouseUp = () => {
      dragging.current = false
      setDrag(d => {
        if (d) {
          const s = `${pad(Math.floor(d.startMinute / 60))}:${pad(d.startMinute % 60)}`
          const en = `${pad(Math.floor(d.endMinute / 60))}:${pad(d.endMinute % 60)}`
          onCreateAt(d.date, s, en)
        }
        return null
      })
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    e.preventDefault()
  }, [getMinuteFromY, getYFromEvent, onCreateAt])

  const projectColor = (pid: string | null) =>
    projects.find(p => p.id === pid)?.color ?? '#6366f1'

  const renderItems = (date: string) => {
    const items = (itemsByDate[date] ?? []).filter(i => !i.allDay)
    return items.map(item => {
      if (!item.startTime) return null
      const startD = new Date(item.startTime)
      const startMin = startD.getHours() * 60 + startD.getMinutes()
      const endMin = item.endTime
        ? (() => { const e = new Date(item.endTime); return e.getHours() * 60 + e.getMinutes() })()
        : item.durationMinutes ? startMin + item.durationMinutes : startMin + 60
      const top = minuteToY(startMin)
      const height = Math.max(22, minuteToY(endMin) - top)
      const color = projectColor(item.projectId)
      return (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-xs text-white overflow-hidden cursor-pointer hover:brightness-110 select-none"
          style={{ top, height, backgroundColor: color, zIndex: 2 }}
        >
          <span className="line-clamp-2">{item.title}</span>
        </div>
      )
    })
  }

  const renderAllDay = (date: string) => {
    const items = (itemsByDate[date] ?? []).filter(i => i.allDay || !i.startTime)
    return items.map(item => {
      const color = projectColor(item.projectId)
      return (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className="rounded px-1.5 py-0.5 text-xs text-white truncate cursor-pointer hover:brightness-110"
          style={{ backgroundColor: color }}
        >
          {item.title}
        </div>
      )
    })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" ref={gridRef}>
      {/* Single scroll container so header/all-day/time-grid share the same width
          (avoids the scrollbar stealing space only from the time grid columns). */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Sticky header group — sticks to top of the scroll container */}
        <div className="sticky top-0 z-10 bg-slate-900">
          {/* Day headers */}
          <div className="flex border-b border-slate-700">
            <div className="w-12 shrink-0" />
            {dates.map((date, i) => {
              const [, , dd] = date.split('-')
              const today = isToday(date)
              return (
                <div
                  key={date}
                  className="flex-1 text-center py-2 border-l border-slate-700"
                >
                  <div className="text-slate-500 text-xs">{DAY_LABELS[i]}</div>
                  <div className={`text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5 ${
                    today ? 'bg-indigo-600 text-white' : 'text-slate-300'
                  }`}>
                    {dd.replace(/^0/, '')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* All-day strip */}
          <div className="flex border-b border-slate-700 min-h-[28px]">
            <div className="w-12 shrink-0 flex items-center justify-center">
              <span className="text-slate-600 text-[10px]">dia todo</span>
            </div>
            {dates.map(date => (
              <div key={date} className="flex-1 min-w-0 overflow-hidden border-l border-slate-700 flex flex-col gap-0.5 p-0.5">
                {renderAllDay(date)}
              </div>
            ))}
          </div>
        </div>

        {/* Time grid — no longer a separate scroll container */}
        <div className="flex">
          {/* Hours column */}
          <div className="w-12 shrink-0 relative" style={{ height: TOTAL_HEIGHT }}>
            {Array.from({ length: VISIBLE_HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-2 text-slate-600 text-[10px] leading-none -translate-y-1/2"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {pad(DAY_START + i)}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dates.map(date => {
            const isDraggingHere = drag?.date === date
            return (
              <div
                key={date}
                className="flex-1 border-l border-slate-700 relative select-none cursor-crosshair"
                style={{ height: TOTAL_HEIGHT }}
                onMouseDown={e => handleMouseDown(e, date)}
              >
                {/* Hour lines */}
                {Array.from({ length: VISIBLE_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-slate-800"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}
                {/* Half-hour lines */}
                {Array.from({ length: VISIBLE_HOURS }, (_, i) => (
                  <div
                    key={`h${i}`}
                    className="absolute left-0 right-0 border-t border-slate-800/40"
                    style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}

                {/* Drag ghost */}
                {isDraggingHere && drag && (
                  <div
                    className="absolute left-0.5 right-0.5 bg-indigo-500/40 border border-indigo-400 rounded-md pointer-events-none"
                    style={{
                      top: minuteToY(drag.startMinute),
                      height: Math.max(22, minuteToY(drag.endMinute) - minuteToY(drag.startMinute)),
                      zIndex: 10,
                    }}
                  >
                    <span className="text-indigo-200 text-xs px-1.5 pt-0.5 block">
                      {pad(Math.floor(drag.startMinute / 60))}:{pad(drag.startMinute % 60)}
                      {' – '}
                      {pad(Math.floor(drag.endMinute / 60))}:{pad(drag.endMinute % 60)}
                    </span>
                  </div>
                )}

                {renderItems(date)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
