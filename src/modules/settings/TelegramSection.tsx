import { useState, useEffect } from 'react'
import { useTelegramConfig, useSaveTelegramConfig, useDisconnectTelegram, useGenerateTelegramLink } from './useTelegramConfig'
import { SkeletonBlock } from '../../components/SkeletonBlock'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DETECTED_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

function hourLabel(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

export function TelegramSection() {
  const { data: config, isLoading } = useTelegramConfig()
  const save = useSaveTelegramConfig()
  const disconnect = useDisconnectTelegram()
  const generateLink = useGenerateTelegramLink()

  const [summaryHour, setSummaryHour] = useState(20)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [deepLink, setDeepLink] = useState<string | null>(null)

  useEffect(() => {
    if (config) {
      setSummaryHour(config.summary_hour)
      if (config.timezone !== DETECTED_TZ) {
        void save.mutateAsync({ chat_id: config.chat_id, summary_hour: config.summary_hour, timezone: DETECTED_TZ })
      }
    }
  }, [config])

  const handleGenerateLink = async () => {
    const link = await generateLink.mutateAsync()
    setDeepLink(link)
  }

  const handleUpdateHour = async (hour: number) => {
    if (!config) return
    setSummaryHour(hour)
    await save.mutateAsync({ chat_id: config.chat_id, summary_hour: hour, timezone: DETECTED_TZ })
  }

  if (isLoading) return (
    <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-3 w-64" />
        <SkeletonBlock className="h-8 w-36 mt-1" />
      </div>
    </section>
  )

  return (
    <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-slate-100 font-medium">Telegram Bot</h2>
          <p className="text-slate-400 text-sm mt-1">
            Receba resumos diários e gerencie tarefas pelo Telegram.
          </p>

          {!config ? (
            <div className="mt-4 flex flex-col gap-3">
              {!deepLink ? (
                <>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Clique no botão abaixo para gerar um link de conexão. O link abre o bot
                    automaticamente e vincula sua conta.
                  </p>
                  <button
                    onClick={handleGenerateLink}
                    disabled={generateLink.isPending}
                    className="self-start px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {generateLink.isPending ? 'Gerando...' : 'Conectar Telegram'}
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-slate-400 text-xs">
                    Link gerado! Clique para abrir o bot no Telegram. O link expira em 15 minutos.
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                    >
                      Abrir no Telegram
                    </a>
                    <button
                      onClick={handleGenerateLink}
                      disabled={generateLink.isPending}
                      className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Gerar novo
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs">
                    Após abrir o bot e enviar /start, recarregue esta página.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <div className="text-xs text-slate-400">
                Chat ID: <span className="text-slate-200">{config.chat_id}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <label className="text-slate-400 text-xs shrink-0">Horário do resumo</label>
                  <select
                    value={summaryHour}
                    onChange={e => handleUpdateHour(Number(e.target.value))}
                    className="bg-slate-900 text-slate-100 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700"
                  >
                    {HOURS.map(h => (
                      <option key={h} value={h}>{hourLabel(h)}</option>
                    ))}
                  </select>
                </div>
                <p className="text-slate-600 text-xs">{DETECTED_TZ}</p>
              </div>
            </div>
          )}
        </div>

        {config && (
          <div className="shrink-0">
            {!confirmDisconnect ? (
              <button
                onClick={() => setConfirmDisconnect(true)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                Desconectar
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <span className="text-slate-400 text-xs">Confirmar?</span>
                <div className="flex gap-1">
                  <button
                    onClick={async () => { await disconnect.mutateAsync(); setConfirmDisconnect(false) }}
                    disabled={disconnect.isPending}
                    className="px-3 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setConfirmDisconnect(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Não
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-slate-600 text-xs font-medium mb-1">Comandos do bot:</p>
        <p className="text-slate-600 text-xs">
          /tasks — hoje &nbsp;·&nbsp; /tomorrow — amanhã &nbsp;·&nbsp; /week — 7 dias &nbsp;·&nbsp;
          /add — criar tarefa &nbsp;·&nbsp; /edit — editar tarefa &nbsp;·&nbsp; /cancel — cancelar
        </p>
      </div>
    </section>
  )
}
