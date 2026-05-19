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
