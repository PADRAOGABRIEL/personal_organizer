import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TopBar } from '../../components/layout/TopBar'
import { getOAuthStartUrl } from '../../lib/googleCalendar'
import { useGoogleConnection, useDisconnectGoogle } from './useGoogleConnection'

export function SettingsPage() {
  const { data, isLoading } = useGoogleConnection()
  const disconnect = useDisconnectGoogle()
  const [params, setParams] = useSearchParams()
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Show feedback after OAuth callback redirect.
  useEffect(() => {
    if (params.get('connected') === '1') {
      setBanner({ kind: 'success', text: 'Google Calendar connected.' })
      const next = new URLSearchParams(params)
      next.delete('connected')
      setParams(next, { replace: true })
    } else if (params.get('error')) {
      setBanner({ kind: 'error', text: `Connection failed: ${params.get('error')}` })
      const next = new URLSearchParams(params)
      next.delete('error')
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  const handleConnect = () => {
    const redirectBack = `${window.location.origin}/settings`
    window.location.href = getOAuthStartUrl(redirectBack)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-900 overflow-y-auto">
      <TopBar />
      <div className="max-w-2xl w-full mx-auto p-6 flex flex-col gap-6">
        <h1 className="text-slate-100 text-xl font-semibold">Settings</h1>

        {banner && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              banner.kind === 'success'
                ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/50'
                : 'bg-red-900/40 text-red-200 border border-red-700/50'
            }`}
          >
            {banner.text}
          </div>
        )}

        <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-slate-100 font-medium">Google Calendar</h2>
              <p className="text-slate-400 text-sm mt-1">
                Tasks with a due date are automatically pushed to your Google Calendar as events.
                Updates flow one-way: app → calendar.
              </p>
              {isLoading ? (
                <p className="text-slate-500 text-xs mt-3">Checking connection…</p>
              ) : data?.connected ? (
                <div className="mt-3 flex flex-col gap-1 text-xs text-slate-400">
                  <span>
                    Connected as{' '}
                    <span className="text-slate-200">{data.email ?? 'unknown account'}</span>
                  </span>
                  <span>Calendar: {data.calendarId}</span>
                  {data.connectedAt && (
                    <span>Last refreshed: {new Date(data.connectedAt).toLocaleString()}</span>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-xs mt-3">Not connected.</p>
              )}
            </div>

            <div className="shrink-0">
              {data?.connected ? (
                <button
                  onClick={() => disconnect.mutate()}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-3 py-1.5 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </section>

        <p className="text-slate-600 text-xs">
          Tasks without a due date are not synced. Done tasks are kept as events with a ✓ prefix.
        </p>
      </div>
    </div>
  )
}
