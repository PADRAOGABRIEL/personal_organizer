import { supabase } from './supabase'

type SyncAction = 'upsert' | 'delete'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export async function syncTaskToCalendar(taskId: string, action: SyncAction): Promise<void> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/sync-task-to-calendar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, action, timeZone }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      if (body?.error === 'not_connected') return
      console.warn('[gcal] sync failed:', res.status, body)
      return
    }
    if (body?.error && body.error !== 'not_connected') {
      console.warn('[gcal] sync skipped:', body)
    }
  } catch (e) {
    console.warn('[gcal] sync network error:', e)
  }
}

export function getOAuthStartUrl(redirectBack: string): string {
  return `${supabaseUrl}/functions/v1/google-oauth-start?redirect=${encodeURIComponent(redirectBack)}`
}

export async function importFromGoogleCalendar(): Promise<{ imported: number; skipped: number }> {
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
}
