import { useState, useEffect, useCallback } from 'react'
import type { CalendarEvent, Project } from '../../types'
import { useUpdateCalendarEvent, useDeleteCalendarEvent } from './useCalendar'
import { recurrenceLabel } from '../../lib/recurrence'

interface CalendarEventDetailPanelProps {
  event: CalendarEvent
  projects: Project[]
  onClose: () => void
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  // "2024-05-22T14:00:00Z" → "2024-05-22T14:00"
  return iso.slice(0, 16)
}

function fromDatetimeLocal(val: string): string {
  if (!val) return ''
  return new Date(val).toISOString()
}

export function CalendarEventDetailPanel({ event, projects, onClose }: CalendarEventDetailPanelProps) {
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description ?? '')
  const [allDay, setAllDay] = useState(event.all_day)
  const [startTime, setStartTime] = useState(toDatetimeLocal(event.start_time))
  const [endTime, setEndTime] = useState(toDatetimeLocal(event.end_time))
  const [location, setLocation] = useState(event.location ?? '')
  const [projectId, setProjectId] = useState(event.project_id ?? '')
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(event.recurrence_rule ?? null)

  const updateEvent = useUpdateCalendarEvent()
  const deleteEvent = useDeleteCalendarEvent()

  useEffect(() => {
    setTitle(event.title)
    setDescription(event.description ?? '')
    setAllDay(event.all_day)
    setStartTime(toDatetimeLocal(event.start_time))
    setEndTime(toDatetimeLocal(event.end_time))
    setLocation(event.location ?? '')
    setProjectId(event.project_id ?? '')
    setRecurrenceRule(event.recurrence_rule ?? null)
  }, [event.id])

  const save = useCallback((overrides?: Partial<CalendarEvent>) => {
    const o = overrides ?? {}
    updateEvent.mutate({
      id: event.id,
      title: 'title' in o ? o.title! : (title.trim() || event.title),
      description: 'description' in o ? o.description : (description || null),
      all_day: 'all_day' in o ? o.all_day! : allDay,
      start_time: 'start_time' in o ? o.start_time! : (startTime ? fromDatetimeLocal(startTime) : event.start_time),
      end_time: 'end_time' in o ? o.end_time : (endTime ? fromDatetimeLocal(endTime) : null),
      location: 'location' in o ? o.location : (location || null),
      project_id: 'project_id' in o ? o.project_id : (projectId || null),
      recurrence_rule: 'recurrence_rule' in o ? o.recurrence_rule : recurrenceRule,
    })
  }, [event, updateEvent, title, description, allDay, startTime, endTime, location, projectId, recurrenceRule])

  const RECURRENCE_OPTIONS = [
    { label: 'Não repete', rule: null },
    { label: 'Todo dia', rule: 'DAILY:1' },
    { label: 'Toda semana', rule: 'WEEKLY:1' },
    { label: 'Todo mês', rule: 'MONTHLY:1' },
  ]

  return (
    <aside className="
      fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl
      bg-slate-800 border-t border-slate-700 flex flex-col
      md:relative md:inset-auto md:bottom-auto md:z-auto md:max-h-none md:rounded-none
      md:w-80 md:border-l md:border-t-0 md:shrink-0
    ">
      {/* Mobile drag handle */}
      <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-slate-600" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <span className="text-slate-400 text-xs uppercase tracking-wider">Evento</span>
        <button
          aria-label="Fechar painel"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700 text-xl leading-none transition-colors"
        >
          ×
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-5 p-4">
        {/* Title */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Título</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => save()}
            className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Descrição</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => save()}
            rows={3}
            className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* All-day toggle */}
        <div className="flex items-center gap-3">
          <input
            id="allday-toggle"
            type="checkbox"
            checked={allDay}
            onChange={e => {
              const checked = e.target.checked
              setAllDay(checked)
              if (checked) {
                save({ all_day: true, end_time: null })
              } else {
                // default end = start + 1h
                const newEnd = startTime
                  ? new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString()
                  : null
                const newEndLocal = newEnd ? newEnd.slice(0, 16) : ''
                setEndTime(newEndLocal)
                save({ all_day: false, end_time: newEnd })
              }
            }}
            className="rounded accent-indigo-500 w-4 h-4"
          />
          <label htmlFor="allday-toggle" className="text-slate-300 text-sm cursor-pointer select-none">
            Dia todo
          </label>
        </div>

        {/* Start time */}
        {!allDay && (
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Início</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={e => {
                setStartTime(e.target.value)
                save({ start_time: e.target.value ? fromDatetimeLocal(e.target.value) : event.start_time })
              }}
              className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
            />
          </div>
        )}

        {/* End time */}
        {!allDay && (
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Fim</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={e => {
                setEndTime(e.target.value)
                save({ end_time: e.target.value ? fromDatetimeLocal(e.target.value) : null })
              }}
              className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
            />
          </div>
        )}

        {/* Location */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Local</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            onBlur={() => save()}
            placeholder="Adicionar local"
            className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
        </div>

        {/* Área */}
        <div>
          <label className="text-slate-500 text-xs mb-1 block">Área</label>
          <select
            value={projectId}
            onChange={e => { setProjectId(e.target.value); save({ project_id: e.target.value || null }) }}
            className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700"
          >
            <option value="">Sem área</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Recurrence */}
        <div>
          <label className="text-slate-500 text-xs mb-2 block">Repetição</label>
          <div className="flex flex-wrap gap-1.5">
            {RECURRENCE_OPTIONS.map(opt => (
              <button
                key={opt.rule ?? 'none'}
                type="button"
                onClick={() => {
                  setRecurrenceRule(opt.rule)
                  save({ recurrence_rule: opt.rule })
                }}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  recurrenceRule === opt.rule
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {recurrenceRule && (
            <p className="text-indigo-400 text-xs mt-1">{recurrenceLabel(recurrenceRule)}</p>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => { deleteEvent.mutate(event.id); onClose() }}
          className="mt-2 w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          Excluir evento
        </button>
      </div>
    </aside>
  )
}
