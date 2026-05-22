import { useState } from 'react'
import { useCreateCalendarEvent } from './useCalendar'
import type { Project } from '../../types'

interface AddEventModalProps {
  date: string
  projects: Project[]
  onClose: () => void
}

export function AddEventModal({ date, projects, onClose }: AddEventModalProps) {
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState(`${date}T09:00`)
  const [allDay, setAllDay] = useState(false)
  const [projectId, setProjectId] = useState('')
  const create = useCreateCalendarEvent()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await create.mutateAsync({
        title: title.trim(),
        start_time: allDay ? `${date}T00:00:00Z` : new Date(startTime).toISOString(),
        end_time: null,
        all_day: allDay,
        project_id: projectId || null,
      })
      onClose()
    } catch {
      // error state is available via create.isError / create.error
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-slate-100 font-semibold text-lg mb-5">New Event</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Title</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="accent-indigo-500" />
            <span className="text-slate-400 text-sm">All day</span>
          </label>
          {!allDay && (
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
              />
            </div>
          )}
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Área (opcional)</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700"
            >
              <option value="">None</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {create.isError && (
            <p className="text-red-400 text-sm">Failed to create event. Please try again.</p>
          )}
          <div className="flex gap-2 justify-end mt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button
              type="submit"
              disabled={!title.trim() || create.isPending}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg"
            >
              {create.isPending ? 'Saving…' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
