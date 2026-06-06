import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TopBar } from '../../components/layout/TopBar'
import { getOAuthStartUrl } from '../../lib/googleCalendar'
import { useGoogleConnection, useDisconnectGoogle, useSyncFromGoogle } from './useGoogleConnection'
import { SkeletonBlock } from '../../components/SkeletonBlock'
import { TelegramSection } from './TelegramSection'

export function SettingsPage() {
  const { data, isLoading } = useGoogleConnection()
  const disconnect = useDisconnectGoogle()
  const syncFromGoogle = useSyncFromGoogle()
  const [params, setParams] = useSearchParams()
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (params.get('connected') === '1') {
      setBanner({ kind: 'success', text: 'Google Calendar conectado. Sincronizando eventos…' })
      const next = new URLSearchParams(params)
      next.delete('connected')
      setParams(next, { replace: true })
      // Auto-sync immediately after connecting
      syncFromGoogle.mutate(undefined, {
        onSuccess: (result) =>
          setBanner({ kind: 'success', text: `Conectado e sincronizado: ${result.imported} evento(s) importado(s).` }),
        onError: () =>
          setBanner({ kind: 'success', text: 'Google Calendar conectado.' }),
      })
    } else if (params.get('error')) {
      setBanner({ kind: 'error', text: `Falha na conexão: ${params.get('error')}` })
      const next = new URLSearchParams(params)
      next.delete('error')
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  const handleConnect = () => {
    const redirectBack = `${window.location.origin}/settings`
    window.location.href = getOAuthStartUrl(redirectBack)
  }

  const handleSync = async () => {
    try {
      const result = await syncFromGoogle.mutateAsync()
      setBanner({ kind: 'success', text: `Sincronizado: ${result.imported} evento(s) importado(s).` })
    } catch {
      setBanner({ kind: 'error', text: 'Falha ao sincronizar. Verifique a conexão.' })
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-900 overflow-y-auto">
      <TopBar />
      <div className="max-w-2xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        <h1 className="text-slate-100 text-xl font-semibold">Configurações</h1>

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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-slate-100 font-medium">Google Calendar</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Tarefas com data de entrega são enviadas automaticamente ao seu Google Calendar.
                  A sincronização é bidirecional: eventos do Google também aparecem aqui.
                </p>
                {isLoading ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <SkeletonBlock className="h-3 w-40" />
                    <SkeletonBlock className="h-3 w-56" />
                  </div>
                ) : data?.connected ? (
                  <div className="mt-3 flex flex-col gap-1 text-xs text-slate-400">
                    <span>
                      Conectado como{' '}
                      <span className="text-slate-200">{data.email ?? 'conta desconhecida'}</span>
                    </span>
                    <span>Calendário: {data.calendarId}</span>
                    {data.lastSyncedAt && (
                      <span>Última sincronização: {new Date(data.lastSyncedAt).toLocaleString('pt-BR')}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs mt-3">Não conectado.</p>
                )}
              </div>

              <div className="shrink-0">
                {data?.connected ? (
                  <button
                    onClick={() => disconnect.mutate()}
                    disabled={disconnect.isPending}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Desconectar
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Conectar
                  </button>
                )}
              </div>
            </div>

            {data?.connected && (
              <div className="pt-3 border-t border-slate-700 flex items-center justify-between gap-3">
                <p className="text-slate-500 text-xs">
                  Importa eventos dos próximos 3 meses do seu Google Calendar.
                </p>
                <button
                  onClick={handleSync}
                  disabled={syncFromGoogle.isPending}
                  className="shrink-0 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                >
                  {syncFromGoogle.isPending ? 'Sincronizando…' : '⟳ Sincronizar agora'}
                </button>
              </div>
            )}
          </div>
        </section>

        <p className="text-slate-600 text-xs">
          Tarefas sem data não são sincronizadas. Tarefas concluídas ficam como eventos com prefixo ✓.
        </p>

        <TelegramSection />
      </div>
    </div>
  )
}
