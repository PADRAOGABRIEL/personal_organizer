import { useState } from 'react'
import { useCreateCalendarEvent } from './useCalendar'
import { useCreateTask } from '../tasks/useTasks'
import { RecurrencePicker } from './RecurrencePicker'
import type { Project, Priority } from '../../types'

interface AddItemModalProps {
  date: string            // pre-filled date 'YYYY-MM-DD'
  startTime?: string      // 'HH:mm', pre-filled from drag
  endTime?: string        // 'HH:mm', pre-filled from drag
  projects: Project[]
  onClose: () => void
}

type ItemType = 'event' | 'task'

export function AddItemModal({ date, startTime, endTime, projects, onClose }: AddItemModalProps) {
  const [type, setType] = useState<ItemType>('event')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [allDay, setAllDay] = useState(!startTime)
  const [eventStart, setEventStart] = useState(
    `${date}T${startTime ?? '09:00'}`
  )
  const [eventEnd, setEventEnd] = useState(
    `${date}T${endTime ?? '10:00'}`
  )
  const [location, setLocation] = useState('')
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState(date)
  const [dueTime, setDueTime] = useState(startTime ?? '')
  const [priority, setPriority] = useState<Priority>('medium')
  const [projectId, setProjectId] = useState('')

  const createEvent = useCreateCalendarEvent()
  const createTask = useCreateTask()

  const isPending = createEvent.isPending || createTask.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      if (type === 'event') {
        await createEvent.mutateAsync({
          title: title.trim(),
          description: description || null,
          start_time: allDay ? `${date}T00:00:00Z` : new Date(eventStart).toISOString(),
          end_time: allDay ? null : new Date(eventEnd).toISOString(),
          all_day: allDay,
          location: location || null,
          recurrence_rule: recurrenceRule,
          project_id: projectId || null,
        })
      } else {
        await createTask.mutateAsync({
          title: title.trim(),
          due_date: dueDate || null,
          due_time: dueTime ? `${dueTime}:00` : null,
          priority,
          project_id: projectId || null,
          recurrence_rule: recurrenceRule,
        } as Parameters<typeof createTask.mutateAsync>[0])
      }
      onClose()
    } catch {
      // error shown via isError states
    }
  }

  const isError = createEvent.isError || createTask.isError

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Type toggle */}
        <div className="flex rounded-xl overflow-hidden border border-slate-700 mb-5">
          {(['event', 'task'] as ItemType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                type === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'event' ? 'Evento' : 'Tarefa'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Título</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === 'event' ? 'Nome do evento' : 'Nome da tarefa'}
              className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Event-specific fields */}
          {type === 'event' && (
            <>
              <label className="flex items-center gap-2 cursor-pointer -mb-2">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={e => setAllDay(e.target.checked)}
                  className="accent-indigo-500"
                />
                <span className="text-slate-400 text-sm">Dia inteiro</span>
              </label>

              {!allDay && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-slate-400 text-xs mb-1 block">Início</label>
                    <input
                      type="datetime-local"
                      value={eventStart}
                      onChange={e => setEventStart(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-slate-400 text-xs mb-1 block">Fim</label>
                    <input
                      type="datetime-local"
                      value={eventEnd}
                      onChange={e => setEventEnd(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 text-xs mb-1 block">Local (opcional)</label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Local do evento"
                  className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                />
              </div>
            </>
          )}

          {/* Task-specific fields */}
          {type === 'task' && (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-slate-400 text-xs mb-1 block">Data</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Hora</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={e => setDueTime(e.target.value)}
                    className="w-28 bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-2 block">Prioridade</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as Priority[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                        priority === p
                          ? p === 'high' ? 'bg-red-800 text-red-200'
                            : p === 'medium' ? 'bg-amber-800 text-amber-200'
                            : 'bg-green-800 text-green-200'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      {p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Recurrence (both types) */}
          <div>
            <label className="text-slate-400 text-xs mb-2 block">Repetição</label>
            <RecurrencePicker value={recurrenceRule} onChange={setRecurrenceRule} />
          </div>

          {/* Área */}
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Área (opcional)</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700"
            >
              <option value="">Nenhuma</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {isError && (
            <p className="text-red-400 text-sm">Falha ao salvar. Tente novamente.</p>
          )}

          <div className="flex gap-2 justify-end mt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isPending}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg"
            >
              {isPending ? 'Salvando…' : type === 'event' ? 'Criar Evento' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
