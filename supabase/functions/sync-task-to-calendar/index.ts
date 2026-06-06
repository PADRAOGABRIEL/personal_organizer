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
  if (error) { console.error('[sync-task] secrets error:', error); return {} }
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  try {
    const { taskId, action, timeZone = 'UTC' } = await req.json()

    const secrets = await getSecrets()
    const GOOGLE_CLIENT_ID = secrets['google_client_id']
    const GOOGLE_CLIENT_SECRET = secrets['google_client_secret']

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'config_missing' }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: 'task_not_found' }), {
        status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('user_id', task.user_id)
      .single()

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ error: 'not_connected' }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await refreshAccessToken(tokenRow.refresh_token, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
    const calendarId = tokenRow.calendar_id || 'primary'

    if (action === 'delete') {
      if (task.google_event_id) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${task.google_event_id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
        )
        await supabase.from('tasks').update({ google_event_id: null }).eq('id', taskId)
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (!task.due_date) {
      return new Response(JSON.stringify({ skipped: 'no_due_date' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const titlePrefix = task.status === 'done' ? '[✓] ' : ''
    let eventBody: Record<string, unknown>

    if (task.due_time) {
      const startDt = `${task.due_date}T${task.due_time}`
      const durationMs = (task.duration_minutes || 30) * 60 * 1000
      const endDt = new Date(new Date(startDt).getTime() + durationMs).toISOString()
      eventBody = {
        summary: `${titlePrefix}${task.title}`,
        start: { dateTime: new Date(startDt).toISOString(), timeZone },
        end: { dateTime: endDt, timeZone },
        extendedProperties: { private: { source: 'personal_organizer', taskId } },
      }
    } else {
      eventBody = {
        summary: `${titlePrefix}${task.title}`,
        start: { date: task.due_date },
        end: { date: task.due_date },
        extendedProperties: { private: { source: 'personal_organizer', taskId } },
      }
    }

    let googleEventId = task.google_event_id
    let calRes: Response

    if (googleEventId) {
      calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBody),
        }
      )
    } else {
      calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBody),
        }
      )
    }

    const created = await calRes.json()
    if (!calRes.ok) throw new Error(`GCal API error: ${JSON.stringify(created)}`)

    googleEventId = created.id
    await supabase.from('tasks').update({ google_event_id: googleEventId }).eq('id', taskId)

    return new Response(JSON.stringify({ ok: true, googleEventId }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[sync-task-to-calendar]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
