import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const REDIRECT_URL = `${window.location.origin}/auth/callback`

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [magicStatus, setMagicStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_URL },
    })
    if (error) {
      setErrorMsg(error.message)
      setGoogleLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setMagicStatus('loading')
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: REDIRECT_URL },
    })
    if (error) {
      setErrorMsg(error.message)
      setMagicStatus('error')
    } else {
      setMagicStatus('sent')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-100">Personal Organizer</h1>
          <p className="text-slate-400 text-sm mt-2">Entre para acessar seus projetos e tarefas</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col gap-5">
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm rounded-xl px-4 py-3 transition-colors disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecionando...' : 'Entrar com Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-slate-600 text-xs">ou</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {magicStatus === 'sent' ? (
            <div className="text-center py-2">
              <p className="text-slate-200 text-sm font-medium">Link enviado!</p>
              <p className="text-slate-400 text-xs mt-1">
                Verifique seu e-mail <span className="text-slate-300">{email}</span> e clique no link para entrar.
              </p>
              <button
                onClick={() => { setMagicStatus('idle'); setEmail('') }}
                className="mt-3 text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
              >
                Usar outro e-mail
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="w-full bg-slate-800 text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 border border-slate-700"
                />
              </div>
              <button
                type="submit"
                disabled={!email.trim() || magicStatus === 'loading'}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl px-4 py-2.5 transition-colors"
              >
                {magicStatus === 'loading' ? 'Enviando...' : 'Enviar link de acesso'}
              </button>
            </form>
          )}

          {errorMsg && (
            <p className="text-red-400 text-xs text-center">{errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
