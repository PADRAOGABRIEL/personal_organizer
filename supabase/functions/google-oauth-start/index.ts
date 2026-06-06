import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

async function getSecrets(): Promise<Record<string, string>> {
  const { data, error } = await supabase.rpc('get_app_secrets_for_functions')
  if (error) throw new Error('Failed to load secrets: ' + error.message)
  return (data ?? {}) as Record<string, string>
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const redirectBack = url.searchParams.get('redirect') ?? '/'

  let secrets: Record<string, string>
  try {
    secrets = await getSecrets()
  } catch (e) {
    console.error('[oauth-start] failed to load secrets:', e)
    return new Response('Internal error loading config', { status: 500 })
  }

  const GOOGLE_CLIENT_ID = secrets['google_client_id']
  const GOOGLE_REDIRECT_URI = secrets['google_redirect_uri']

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: redirectBack,
  })

  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    302,
  )
})
