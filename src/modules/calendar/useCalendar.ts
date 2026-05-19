import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Task, CalendarEvent } from '../../types'

export interface CalendarDay {
  date: string          // 'YYYY-MM-DD'
  isCurrentMonth: boolean
  isToday: boolean
}

export interface CalendarItem {
  id: string
  title: string
  type: 'task' | 'event'
  projectId: string | null
}

export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const todayObj = new Date()
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth()+1).padStart(2,'0')}-${String(todayObj.getDate()).padStart(2,'0')}`
  const firstDay = new Date(year, month, 1)
  // Adjust so week starts on Monday (0=Mon, 6=Sun)
  const startDow = (firstDay.getDay() + 6) % 7
  const start = new Date(year, month, 1 - startDow)

  const lastDay = new Date(year, month + 1, 0)
  const endDow = (lastDay.getDay() + 6) % 7
  const totalDays = startDow + lastDay.getDate() + (6 - endDow)
  const weeks = Math.ceil(totalDays / 7)

  const days: CalendarDay[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    days.push({
      date: dateStr,
      isCurrentMonth: d.getMonth() === month,
      isToday: dateStr === today,
    })
  }
  return days
}

export function getItemsForDay(
  dateStr: string,
  tasks: Task[],
  events: CalendarEvent[]
): CalendarItem[] {
  const taskItems: CalendarItem[] = tasks
    .filter(t => t.due_date === dateStr && t.status !== 'done')
    .map(t => ({ id: t.id, title: t.title, type: 'task', projectId: t.project_id }))

  const eventItems: CalendarItem[] = events
    .filter(e => e.start_time.startsWith(dateStr))
    .map(e => ({ id: e.id, title: e.title, type: 'event', projectId: e.project_id }))

  return [...taskItems, ...eventItems]
}

export function useCalendarData(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const startDate = `${year}-${pad(month + 1)}-01T00:00:00`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}T23:59:59`

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*')
      if (error) throw error
      return data as Task[]
    },
  })

  const eventsQuery = useQuery({
    queryKey: ['calendar_events', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', startDate)
        .lte('start_time', endDate)
      if (error) throw error
      return data as CalendarEvent[]
    },
  })

  return {
    tasks: tasksQuery.data ?? [],
    events: eventsQuery.data ?? [],
    isLoading: tasksQuery.isLoading || eventsQuery.isLoading,
  }
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Pick<CalendarEvent, 'title' | 'start_time' | 'end_time' | 'all_day' | 'project_id'>) => {
      const { data, error } = await supabase
        .from('calendar_events').insert(input).select().single()
      if (error) throw error
      return data as CalendarEvent
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_events'] })
    },
  })
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_events'] })
    },
  })
}
