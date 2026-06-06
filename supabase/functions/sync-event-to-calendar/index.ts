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
  if (error) { console.error('[sync-event] secrets error:', error); return {} }
  return Object.fromEntries((data as { key: string; value: string }[]).map(r => [r.key, r.value]))
}

async function refreshAccessToken(rt: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: rt, grant_type: 'refresh_token',
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(body)}`)
  return body.access_token as string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  try {
    const { eventId, action } = await req.json()

    const [secrets, eventResult] = await Promise.all([
      getSecrets(),
      supabase.from('calendar_events').select('*').eq('id', eventId).single(),
    ])

    const CLIENT_ID = secrets['google_client_id']
    const CLIENT_SECRET = secrets['google_client_secret']
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'config_missing' }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (eventResult.error || !eventResult.data) {
      return new Response(JSON.stringify({ error: 'event_not_found' }), {
        status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const event = eventResult.data

    // google_event_id = imported FROM Google → skip (would cause echo loop)
    if (event.google_event_id) {
      return new Response(JSON.stringify({ skipped: 'google_originated' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const tokenResult = await supabase
      .from('google_oauth_tokens').select('*').eq('user_id', event.user_id).single()
    if (tokenResult.error || !tokenResult.data) {
      return new Response(JSON.stringify({ error: 'not_connected' }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const token = tokenResult.data
    const accessToken = await refreshAccessToken(token.refresh_token, CLIENT_ID, CLIENT_SECRET)
    const calendarId = token.calendar_id || 'primary'

    // DELETE
    if (action === 'delete') {
      if (event.gcal_event_id) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${event.gcal_event_id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
        )
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // UPSERT — build Google event body
    const gcalBody: Record<string, unknown> = {
      summary: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      extendedProperties: { private: { source: 'personal_organizer', eventId } },
    }

    if (event.all_day) {
      const dateStr = event.start_time.split('T')[0]
      gcalBody.start = { date: dateStr }
      gcalBody.end   = { date: dateStr }
    } else {
      gcalBody.start = { dateTime: event.start_time }
      gcalBody.end   = { dateTime: event.end_time ?? event.start_time }
    }

    // gcal_event_id = previously synced from this app → update; otherwise create
    const existingGcalId = event.gcal_event_id
    const calRes = await fetch(
      existingGcalId
        ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existingGcalId}`
        : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: existingGcalId ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(gcalBody),
      }
    )

    const created = await calRes.json()
    if (!calRes.ok) throw new Error(`GCal API error: ${JSON.stringify(created)}`)

    await supabase.from('calendar_events')
      .update({ gcal_event_id: created.id })
      .eq('id', eventId)

    return new Response(JSON.stringify({ ok: true, gcalEventId: created.id }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[sync-event-to-calendar]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
