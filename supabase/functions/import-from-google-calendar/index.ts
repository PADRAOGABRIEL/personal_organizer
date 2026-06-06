import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function getSecrets(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('app_secrets').select('key, value')
  if (error) { console.error('[import-gcal] secrets error:', error); return {} }
  return Object.fromEntries((data as { key: string; value: string }[]).map(r => [r.key, r.value]))
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(body)}`)
  return body.access_token as string
}

interface GCalEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  extendedProperties?: { private?: { source?: string } }
  status?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  try {
    // Verify caller's JWT and extract user_id
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { timeMin, timeMax } = await req.json()
    const userId = user.id

    const secrets = await getSecrets()
    const GOOGLE_CLIENT_ID = secrets['google_client_id']
    const GOOGLE_CLIENT_SECRET = secrets['google_client_secret']

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'config_missing' }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ error: 'not_connected' }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await refreshAccessToken(tokenRow.refresh_token, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
    const calendarId = tokenRow.calendar_id || 'primary'

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '500',
    })

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!eventsRes.ok) {
      const err = await eventsRes.json()
      throw new Error(`GCal list events failed: ${JSON.stringify(err)}`)
    }

    const { items }: { items: GCalEvent[] } = await eventsRes.json()

    let imported = 0
    let skipped = 0

    for (const event of items ?? []) {
      if (event.status === 'cancelled') { skipped++; continue }
      if (event.extendedProperties?.private?.source === 'personal_organizer') { skipped++; continue }

      const startTime = event.start.dateTime ?? `${event.start.date}T00:00:00Z`
      const endTime = event.end.dateTime ?? (event.end.date ? `${event.end.date}T00:00:00Z` : null)
      const allDay = !event.start.dateTime

      const { error } = await supabase.from('calendar_events').upsert({
        user_id: userId,
        title: event.summary ?? '(sem título)',
        description: event.description ?? null,
        location: event.location ?? null,
        start_time: startTime,
        end_time: endTime,
        all_day: allDay,
        google_event_id: event.id,
      }, { onConflict: 'google_event_id', ignoreDuplicates: false })

      if (error) { console.error('[import-gcal] upsert error:', error); skipped++ }
      else { imported++ }
    }

    await supabase
      .from('google_oauth_tokens')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    return new Response(JSON.stringify({ imported, skipped }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[import-from-google-calendar]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
