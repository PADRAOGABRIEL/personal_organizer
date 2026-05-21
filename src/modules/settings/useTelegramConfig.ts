import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export interface TelegramConfig {
  chat_id: string
  summary_hour: number
  timezone: string
}

export function useTelegramConfig() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['telegram-config', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('telegram_config')
        .select('chat_id, summary_hour, timezone')
        .eq('user_id', user!.id)
        .maybeSingle()
      return data as TelegramConfig | null
    },
  })
}

export function useSaveTelegramConfig() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (config: TelegramConfig) => {
      const { error } = await supabase
        .from('telegram_config')
        .upsert({ user_id: user!.id, ...config }, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-config'] })
    },
  })
}

export function useDisconnectTelegram() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('telegram_config').delete().eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-config'] })
    },
  })
}

export function useGenerateTelegramLink() {
  const { user } = useAuth()
  return useMutation({
    mutationFn: async () => {
      await supabase.from('telegram_link_tokens').delete().eq('user_id', user!.id)
      const { data, error } = await supabase
        .from('telegram_link_tokens')
        .insert({ user_id: user!.id })
        .select('token')
        .single()
      if (error) throw error
      return `https://t.me/BubbleOrganizer_bot?start=${data.token}`
    },
  })
}
