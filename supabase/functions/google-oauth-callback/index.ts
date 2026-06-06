import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FALLBACK_APP_URL = 'https://bubble-to-do.vercel.app'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function getSecrets(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('app_secrets')
    .select('key, value')
  if (error) {
    console.error('[oauth-callback] app_secrets error:', error)
    return {}
  }
  const rows = data as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

async function fetchJson(res: Response): Promise<unknown> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.error('[oauth-callback] non-JSON response', res.status, res.url, text.slice(0, 300))
    throw new Error(`non_json_response:${res.status}:${res.url}`)
  }
}

Deno.serve(async (req: Request) => {
  let APP_URL = FALLBACK_APP_URL
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const oauthError = url.searchParams.get('error')

    if (oauthError || !code) {
      return Response.redirect(`${APP_URL}/settings?error=oauth_denied`, 302)
    }

    const secrets = await getSecrets()
    APP_URL = secrets['app_url'] ?? FALLBACK_APP_URL
    const GOOGLE_CLIENT_ID = secrets['google_client_id']
    const GOOGLE_CLIENT_SECRET = secrets['google_client_secret']
    const GOOGLE_REDIRECT_URI = secrets['google_redirect_uri']

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error('[oauth-callback] missing secrets, keys found:', Object.keys(secrets))
      return Response.redirect(`${APP_URL}/settings?error=config_missing`, 302)
    }

    // Exchange code for tokens — read as text first to avoid JSON parse errors on HTML error pages
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      console.error('[oauth-callback] token exchange failed', tokenRes.status, body.slice(0, 400))
      return Response.redirect(`${APP_URL}/settings?error=token_exchange`, 302)
    }

    const tokens = await fetchJson(tokenRes) as Record<string, unknown>

    // Get user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await fetchJson(userRes) as Record<string, unknown>

    const calendarId = 'primary'

    // Resolve user_id: try Bearer JWT, fall back to email lookup
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const jwt = authHeader.slice(7)
      const { data } = await supabase.auth.getUser(jwt)
      userId = data.user?.id ?? null
    }
    if (!userId) {
      const { data: listData } = await supabase.auth.admin.listUsers()
      const match = listData?.users.find((u: { email?: string }) => u.email === userInfo.email)
      userId = match?.id ?? null
    }

    if (!userId) {
      return Response.redirect(`${APP_URL}/settings?error=no_user`, 302)
    }

    const { error: dbError } = await supabase.from('google_oauth_tokens').upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString(),
      connected_email: userInfo.email,
      calendar_id: calendarId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('[oauth-callback] db upsert failed:', dbError)
      return Response.redirect(
        `${APP_URL}/settings?error=${encodeURIComponent('db_save_failed:' + dbError.message)}`,
        302
      )
    }

    return Response.redirect(`${APP_URL}/settings?connected=1`, 302)
  } catch (err) {
    console.error('[oauth-callback] unhandled error:', err)
    return Response.redirect(
      `${APP_URL}/settings?error=${encodeURIComponent(String(err))}`,
      302
    )
  }
})
