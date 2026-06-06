import { useRef, useState, useCallback } from 'react'
import type { Project } from '../../types'
import type { CalendarItem } from './useCalendar'

interface DayGridProps {
  date: string            // 'YYYY-MM-DD'
  items: CalendarItem[]
  projects: Project[]
  onCreateAt: (startTime: string, endTime: string) => void
  onItemClick?: (item: CalendarItem) => void
}

const HOUR_HEIGHT = 64
const DAY_START = 0
const DAY_END = 24
const VISIBLE_HOURS = DAY_END - DAY_START
const TOTAL_HEIGHT = VISIBLE_HOURS * HOUR_HEIGHT

function pad(n: number) { return String(n).padStart(2, '0') }

function minuteToY(minutes: number): number {
  return ((minutes - DAY_START * 60) / 60) * HOUR_HEIGHT
}

function snapMinutes(minutes: number): number {
  return Math.round(minutes / 15) * 15
}

function getMinuteFromY(y: number): number {
  const raw = (y / HOUR_HEIGHT) * 60 + DAY_START * 60
  return Math.max(DAY_START * 60, Math.min(DAY_END * 60, snapMinutes(raw)))
}

export function DayGrid({ date, items, projects, onCreateAt, onItemClick }: DayGridProps) {
  const colRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ startMin: number; endMin: number } | null>(null)
  const dragging = useRef(false)

  const projectColor = (pid: string | null) =>
    projects.find(p => p.id === pid)?.color ?? '#6366f1'

  const timedItems = items.filter(i => !i.allDay && i.startTime)
  const allDayItems = items.filter(i => i.allDay || !i.startTime)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || !colRef.current) return
    const rect = colRef.current.getBoundingClientRect()
    const y = Math.max(0, Math.min(TOTAL_HEIGHT, e.clientY - rect.top))
    const startMin = getMinuteFromY(y)
    dragging.current = true
    setDrag({ startMin, endMin: startMin + 60 })

    const onMouseMove = (mv: MouseEvent) => {
      if (!dragging.current || !colRef.current) return
      const r = colRef.current.getBoundingClientRect()
      const my = Math.max(0, Math.min(TOTAL_HEIGHT, mv.clientY - r.top))
      const endMin = Math.max(startMin + 15, getMinuteFromY(my))
      setDrag(d => d ? { ...d, endMin } : null)
    }

    const onMouseUp = () => {
      dragging.current = false
      setDrag(d => {
        if (d) {
          const s = `${pad(Math.floor(d.startMin / 60))}:${pad(d.startMin % 60)}`
          const en = `${pad(Math.floor(d.endMin / 60))}:${pad(d.endMin % 60)}`
          onCreateAt(s, en)
        }
        return null
      })
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    e.preventDefault()
  }, [onCreateAt])

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Day header */}
      <div className="px-4 py-2 border-b border-slate-700 shrink-0">
        <span className="text-slate-300 text-sm font-medium capitalize">{dateLabel}</span>
      </div>

      {/* All-day strip */}
      {allDayItems.length > 0 && (
        <div className="flex flex-col gap-1 px-3 py-2 border-b border-slate-700 shrink-0">
          <span className="text-slate-600 text-xs mb-0.5">dia todo</span>
          {allDayItems.map(item => (
            <div
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className="rounded px-2 py-1 text-xs text-white truncate cursor-pointer hover:brightness-110"
              style={{ backgroundColor: projectColor(item.projectId) }}
            >
              {item.title}
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Hours column */}
        <div className="w-14 shrink-0 relative" style={{ height: TOTAL_HEIGHT }}>
          {Array.from({ length: VISIBLE_HOURS }, (_, i) => (
            <div
              key={i}
              className="absolute right-2 text-slate-600 text-xs leading-none -translate-y-1/2"
              style={{ top: i * HOUR_HEIGHT }}
            >
              {pad(DAY_START + i)}:00
            </div>
          ))}
        </div>

        {/* Events column */}
        <div
          ref={colRef}
          className="flex-1 border-l border-slate-700 relative select-none cursor-crosshair"
          style={{ height: TOTAL_HEIGHT }}
          onMouseDown={handleMouseDown}
        >
          {/* Hour lines */}
          {Array.from({ length: VISIBLE_HOURS }, (_, i) => (
            <div key={i} className="absolute left-0 right-0 border-t border-slate-800" style={{ top: i * HOUR_HEIGHT }} />
          ))}
          {Array.from({ length: VISIBLE_HOURS }, (_, i) => (
            <div key={`h${i}`} className="absolute left-0 right-0 border-t border-slate-800/40" style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
          ))}

          {/* Drag ghost */}
          {drag && (
            <div
              className="absolute left-1 right-1 bg-indigo-500/40 border border-indigo-400 rounded-lg pointer-events-none"
              style={{
                top: minuteToY(drag.startMin),
                height: Math.max(22, minuteToY(drag.endMin) - minuteToY(drag.startMin)),
                zIndex: 10,
              }}
            >
              <span className="text-indigo-200 text-xs px-2 pt-1 block">
                {pad(Math.floor(drag.startMin / 60))}:{pad(drag.startMin % 60)}
                {' – '}
                {pad(Math.floor(drag.endMin / 60))}:{pad(drag.endMin % 60)}
              </span>
            </div>
          )}

          {/* Events */}
          {timedItems.map(item => {
            const startD = new Date(item.startTime!)
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
                onMouseDown={e => e.stopPropagation()}
                className="absolute left-1 right-1 rounded-lg px-2 py-1 text-xs text-white overflow-hidden cursor-pointer hover:brightness-110"
                style={{ top, height, backgroundColor: color, zIndex: 2 }}
              >
                <span className="font-medium">{item.title}</span>
                <br />
                <span className="text-white/70">
                  {pad(startD.getHours())}:{pad(startD.getMinutes())}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
