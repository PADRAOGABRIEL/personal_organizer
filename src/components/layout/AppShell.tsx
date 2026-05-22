import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

function pad(n: number) { return String(n).padStart(2, '0') }

export function AppShell() {
  const queryClient = useQueryClient()

  // Prefetch tasks and current-month calendar events in the background so that
  // navigating to Calendar is instant instead of waiting for a fresh fetch.
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['tasks'],
      staleTime: 2 * 60_000,
      queryFn: async () => {
        const { data, error } = await supabase.from('tasks').select('*')
        if (error) throw error
        return data
      },
    })

    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const lastDay = new Date(y, m + 1, 0).getDate()
    const calStart = `${y}-${pad(m + 1)}-01T00:00:00`
    const calEnd   = `${y}-${pad(m + 1)}-${pad(lastDay)}T23:59:59`

    queryClient.prefetchQuery({
      queryKey: ['calendar_events', calStart, calEnd],
      staleTime: 2 * 60_000,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .or(`start_time.gte.${calStart},recurrence_rule.not.is.null`)
          .lte('start_time', calEnd)
        if (error) throw error
        return data
      },
    })
  }, [queryClient])

  return (
    <div className="fixed inset-0 flex">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden pb-16 md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
