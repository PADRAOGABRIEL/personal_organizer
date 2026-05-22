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
      const { data } = await supabase
        .rpc('get_google_connection_status')
        .maybeSingle<{ connected_email: string | null; calendar_id: string; updated_at: string; last_synced_at: string | null }>()
      if (!data) return { connected: false, email: null, calendarId: 'primary', connectedAt: null, lastSyncedAt: null }
      return {
        connected: true,
        email: data.connected_email,
        calendarId: data.calendar_id,
        connectedAt: data.updated_at,
        lastSyncedAt: data.last_synced_at ?? null,
      }
    },
  })
}

export function useDisconnectGoogle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('google_oauth_tokens')
        .delete()
        .eq('user_id', session.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-connection'] })
      queryClient.invalidateQueries({ queryKey: ['google_connection'] })
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
