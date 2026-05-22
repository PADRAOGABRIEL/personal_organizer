import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI')!
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') ?? '/'
  const error = url.searchParams.get('error')

  if (error || !code) {
    return Response.redirect(`${APP_URL}/settings?error=oauth_denied`, 302)
  }

  // Exchange code for tokens
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

  const tokens = await tokenRes.json()
  if (!tokenRes.ok) {
    console.error('[oauth-callback] token exchange failed:', tokens)
    return Response.redirect(`${APP_URL}/settings?error=token_exchange`, 302)
  }

  // Get user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const userInfo = await userRes.json()

  // Find the primary calendar ID
  const calRes = await fetch(
    'https://www.googleapis.com/calendar/v3/calendarList?minAccessRole=owner',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  )
  const calList = await calRes.json()
  const primaryCal = calList.items?.find((c: { primary?: boolean }) => c.primary)
  const calendarId = primaryCal?.id ?? 'primary'

  // We need the user_id — decode it from the state or require the user to be logged in
  // The state is the redirectBack URL; we extract user_id from the supabase JWT if available
  const authHeader = req.headers.get('Authorization')
  let userId: string | null = null
  if (authHeader?.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7)
    const { data } = await supabase.auth.getUser(jwt)
    userId = data.user?.id ?? null
  }

  // Fall back: look up user by google email
  if (!userId) {
    const { data: users } = await supabase.auth.admin.listUsers()
    const match = users.users.find(u => u.email === userInfo.email)
    userId = match?.id ?? null
  }

  if (!userId) {
    return Response.redirect(`${APP_URL}/settings?error=no_user`, 302)
  }

  // Upsert token row
  await supabase.from('google_oauth_tokens').upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    email: userInfo.email,
    calendar_id: calendarId,
  }, { onConflict: 'user_id' })

  return Response.redirect(`${APP_URL}/settings?connected=1`, 302)
})
