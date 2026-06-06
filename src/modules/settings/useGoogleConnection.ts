import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { importFromGoogleCalendar } from '../../lib/googleCalendar'

export interface GoogleConnection {
  connected: boolean
  email: string | null
  calendarId: string
  connectedAt: string | null
  lastSyncedAt: string | null
}

export function useGoogleConnection() {
  return useQuery<GoogleConnection>({
    queryKey: ['google-connection'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_google_connection_status')
      if (error || !data) return { connected: false, email: null, calendarId: 'primary', connectedAt: null, lastSyncedAt: null }
      const d = data as { connected_email: string | null; calendar_id: string; updated_at: string; last_synced_at: string | null }
      return {
        connected: true,
        email: d.connected_email,
        calendarId: d.calendar_id,
        connectedAt: d.updated_at,
        lastSyncedAt: d.last_synced_at ?? null,
      }
    },
  })
}

export function useDisconnectGoogle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('disconnect_google')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-connection'] })
    },
  })
}

export function useSyncFromGoogle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importFromGoogleCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_events'] })
      queryClient.invalidateQueries({ queryKey: ['google-connection'] })
    },
  })
}
