import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(body)}`)
  return body.access_token as string
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { taskId, action, timeZone = 'UTC' } = await req.json()

    // Get task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()
    if (taskError || !task) {
      return new Response(JSON.stringify({ error: 'task_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get Google tokens for this user
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('user_id', task.user_id)
      .single()
    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ error: 'not_connected' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await refreshAccessToken(tokenRow.refresh_token)
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build event body
    if (!task.due_date) {
      return new Response(JSON.stringify({ skipped: 'no_due_date' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    let res: Response

    if (googleEventId) {
      res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBody),
        }
      )
    } else {
      res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBody),
        }
      )
    }

    const created = await res.json()
    if (!res.ok) throw new Error(`GCal API error: ${JSON.stringify(created)}`)

    googleEventId = created.id
    await supabase.from('tasks').update({ google_event_id: googleEventId }).eq('id', taskId)

    return new Response(JSON.stringify({ ok: true, googleEventId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[sync-task-to-calendar]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { corsHeaders, 'Content-Type': 'application/json' } as HeadersInit,
    })
  }
})
