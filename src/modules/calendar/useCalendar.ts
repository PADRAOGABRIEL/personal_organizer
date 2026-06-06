import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Task, CalendarEvent } from '../../types'
import { expandRecurrences } from '../../lib/recurrence'

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
  startTime?: string    // ISO string, for time-grid positioning
  endTime?: string
  allDay?: boolean
  durationMinutes?: number
  recurrenceRule?: string | null
}

export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const todayObj = new Date()
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth()+1).padStart(2,'0')}-${String(todayObj.getDate()).padStart(2,'0')}`
  const firstDay = new Date(year, month, 1)
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

function toLocalDateStr(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getItemsForDay(
  dateStr: string,
  tasks: Task[],
  events: CalendarEvent[]
): CalendarItem[] {
  const taskItems: CalendarItem[] = tasks
    .filter(t => t.due_date === dateStr && t.status !== 'done')
    .map(t => ({
      id: t.id,
      title: t.title,
      type: 'task' as const,
      projectId: t.project_id,
      startTime: t.due_time ? `${dateStr}T${t.due_time}` : undefined,
      durationMinutes: t.duration_minutes ?? undefined,
      allDay: !t.due_time,
      recurrenceRule: t.recurrence_rule,
    }))

  const eventItems: CalendarItem[] = events
    .filter(e => toLocalDateStr(e.start_time) === dateStr)
    .map(e => ({
      id: e.id,
      title: e.title,
      type: 'event' as const,
      projectId: e.project_id,
      startTime: e.start_time,
      endTime: e.end_time ?? undefined,
      allDay: e.all_day,
      recurrenceRule: e.recurrence_rule,
    }))

  return [...taskItems, ...eventItems]
}

export function useCalendarData(startDate: string, endDate: string) {
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*')
      if (error) throw error
      return data as Task[]
    },
  })

  const rawEventsQuery = useQuery({
    queryKey: ['calendar_events', startDate, endDate],
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev: CalendarEvent[] | undefined) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .or(`start_time.gte.${startDate},recurrence_rule.not.is.null`)
        .lte('start_time', endDate)
      if (error) throw error
      return data as CalendarEvent[]
    },
  })

  const rawEvents = rawEventsQuery.data ?? []
  const events = useMemo(
    () => expandRecurrences(rawEvents, startDate, endDate),
    [rawEvents, startDate, endDate]
  )

  return {
    tasks: tasksQuery.data ?? [],
    events,
    rawEvents,
    // Show skeleton only when data is absent AND actively fetching.
    // Checking isFetching prevents infinite loading on error (data=undefined, isFetching=false).
    // Checking data instead of isPending handles placeholderData correctly
    // (isPending stays true even when placeholder provides data).
    isLoading: (tasksQuery.data === undefined && tasksQuery.isFetching) ||
               (rawEventsQuery.data === undefined && rawEventsQuery.isFetching),
  }
}

// Convenience wrapper for the month view
export function useCalendarMonthData(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const startDate = `${year}-${pad(month + 1)}-01T00:00:00`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}T23:59:59`
  return useCalendarData(startDate, endDate)
}

export type CreateCalendarEventInput = Pick<
  CalendarEvent,
  'title' | 'start_time' | 'end_time' | 'all_day' | 'project_id'
> & Partial<Pick<CalendarEvent, 'location' | 'recurrence_rule' | 'description'>>

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCalendarEventInput) => {
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

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<CalendarEvent> & { id: string }) => {
      const { id, ...rest } = input
      const { data, error } = await supabase
        .from('calendar_events').update(rest).eq('id', id).select().single()
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
      // Strip virtual recurrence suffix (e.g. "uuid__2024-01-01T...")
      const realId = id.includes('__') ? id.split('__')[0] : id
      const { error } = await supabase.from('calendar_events').delete().eq('id', realId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_events'] })
    },
  })
}

export function useImportFromGoogleCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const now = new Date()
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

      const { data, error } = await supabase.functions.invoke('import-from-google-calendar', {
        body: { userId: session.user.id, timeMin, timeMax },
      })
      if (error) throw error
      return data as { imported: number; skipped: number }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_events'] })
    },
  })
}
