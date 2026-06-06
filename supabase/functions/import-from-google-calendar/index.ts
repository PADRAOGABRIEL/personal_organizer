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

// Converts Google's RRULE to our internal format: "FREQ:INTERVAL" or "WEEKLY:INTERVAL:BYDAY"
// e.g. "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=2" → "WEEKLY:2:MO,WE"
function parseGoogleRRule(recurrence: string[]): string | null {
  const rruleLine = recurrence?.find(r => r.startsWith('RRULE:'))
  if (!rruleLine) return null

  const params = Object.fromEntries(
    rruleLine.replace('RRULE:', '').split(';').map(p => {
      const [k, v] = p.split('=')
      return [k, v]
    })
  )

  const freq = params['FREQ']
  const interval = parseInt(params['INTERVAL'] ?? '1', 10)
  const byday = params['BYDAY'] // e.g. "MO,WE,FR"

  if (freq === 'DAILY')   return `DAILY:${interval}`
  if (freq === 'WEEKLY')  return byday ? `WEEKLY:${interval}:${byday}` : `WEEKLY:${interval}`
  if (freq === 'MONTHLY') return `MONTHLY:${interval}`
  if (freq === 'YEARLY')  return `YEARLY:${interval}`
  return null
}

interface GCalEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  recurrence?: string[]          // present on recurring templates
  recurringEventId?: string      // present on exception instances
  extendedProperties?: { private?: { source?: string } }
  status?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  try {
    // Verify caller JWT
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

    // Load secrets and token in parallel
    const [secrets, tokenResult] = await Promise.all([
      getSecrets(),
      supabase.from('google_oauth_tokens').select('*').eq('user_id', userId).single(),
    ])

    const GOOGLE_CLIENT_ID = secrets['google_client_id']
    const GOOGLE_CLIENT_SECRET = secrets['google_client_secret']

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'config_missing' }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (tokenResult.error || !tokenResult.data) {
      return new Response(JSON.stringify({ error: 'not_connected' }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const tokenRow = tokenResult.data
    const accessToken = await refreshAccessToken(tokenRow.refresh_token, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
    const calendarId = tokenRow.calendar_id || 'primary'

    // singleEvents: false → returns recurring series as one template (with recurrence[] field)
    // instead of expanding each occurrence. This lets us store the recurrence rule.
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'false',
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

    const rows = (items ?? [])
      .filter(e => e.status !== 'cancelled')
      // Skip exception instances of a recurring series (they have recurringEventId)
      // We keep the template (no recurringEventId) which carries the recurrence rule
      .filter(e => !e.recurringEventId)
      // Skip events that originated from this app (avoid echo loop)
      .filter(e => e.extendedProperties?.private?.source !== 'personal_organizer')
      .map(e => {
        const startTime = e.start.dateTime ?? `${e.start.date}T00:00:00Z`
        const endTime = e.end.dateTime ?? (e.end.date ? `${e.end.date}T00:00:00Z` : null)
        const allDay = !e.start.dateTime
        const recurrenceRule = e.recurrence ? parseGoogleRRule(e.recurrence) : null

        return {
          user_id: userId,
          title: e.summary ?? '(sem título)',
          description: e.description ?? null,
          location: e.location ?? null,
          start_time: startTime,
          end_time: endTime,
          all_day: allDay,
          google_event_id: e.id,
          recurrence_rule: recurrenceRule,
        }
      })

    const skipped = (items ?? []).length - rows.length
    let imported = 0

    if (rows.length > 0) {
      // Before upserting recurring templates, clean up any previously imported
      // individual instances from when singleEvents=true was used.
      // Instance IDs follow the pattern "{templateId}_{datetime}", e.g.
      // "abc123_20260602T090000Z". The template ID itself is just "abc123".
      const recurringTemplateIds = rows
        .filter(r => r.recurrence_rule !== null)
        .map(r => r.google_event_id)

      for (const templateId of recurringTemplateIds) {
        await supabase
          .from('calendar_events')
          .delete()
          .eq('user_id', userId)
          .like('google_event_id', `${templateId}_%`)
      }

      const { error: upsertError } = await supabase
        .from('calendar_events')
        .upsert(rows, { onConflict: 'google_event_id', ignoreDuplicates: false })

      if (upsertError) {
        console.error('[import-gcal] batch upsert error:', upsertError)
        throw new Error(`Batch upsert failed: ${upsertError.message}`)
      }
      imported = rows.length
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
