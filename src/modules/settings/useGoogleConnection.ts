import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface GoogleConnection {
  connected: boolean
  email: string | null
  calendarId: string
  connectedAt: string | null
}

export function useGoogleConnection() {
  return useQuery<GoogleConnection>({
    queryKey: ['google-connection'],
    queryFn: async () => {
      // RPC function reads from google_oauth_tokens with SECURITY DEFINER,
      // exposing only the safe display fields (never the tokens themselves).
      const { data } = await supabase
        .rpc('get_google_connection_status')
        .maybeSingle<{ connected_email: string | null; calendar_id: string; updated_at: string }>()
      if (!data) return { connected: false, email: null, calendarId: 'primary', connectedAt: null }
      return {
        connected: true,
        email: data.connected_email,
        calendarId: data.calendar_id,
        connectedAt: data.updated_at,
      }
    },
  })
}

export function useDisconnectGoogle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('google_oauth_tokens').delete().eq('id', 1)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-connection'] })
    },
  })
}
