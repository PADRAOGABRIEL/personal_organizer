import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!

async function sendMessage(chatId: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function priorityLabel(p: string): string {
  if (p === 'high') return '🔴'
  if (p === 'medium') return '🟠'
  return '🟢'
}

Deno.serve(async () => {
  const nowBrazil = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const currentHour = nowBrazil.getHours()
  const todayStr = nowBrazil.toISOString().split('T')[0]

  // Fetch all configured users whose summary_hour matches current hour
  // and who haven't already received today's summary
  const { data: configs, error } = await supabase
    .from('telegram_config')
    .select('user_id, chat_id, summary_hour, last_summary_date')
    .eq('summary_hour', currentHour)
    .or(`last_summary_date.is.null,last_summary_date.neq.${todayStr}`)

  if (error) {
    console.error('[daily-summary] fetch configs error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!configs || configs.length === 0) {
    return new Response(JSON.stringify({ skipped: 'no_users_at_this_hour', currentHour }), { status: 200 })
  }

  const results: Array<{ userId: string; status: string }> = []

  for (const config of configs) {
    try {
      const targetDate = new Date(nowBrazil)
      if (config.summary_hour >= 18) targetDate.setDate(targetDate.getDate() + 1)
      const targetStr = targetDate.toISOString().split('T')[0]
      const dayLabel = config.summary_hour >= 18 ? 'Amanhã' : 'Hoje'

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, priority, due_time, project_id')
        .eq('user_id', config.user_id)
        .eq('due_date', targetStr)
        .neq('status', 'done')
        .order('due_time', { ascending: true, nullsFirst: false })

      const { data: overdue } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', config.user_id)
        .lt('due_date', todayStr)
        .neq('status', 'done')

      const overdueCount = overdue?.length ?? 0
      const lines: string[] = []

      if (!tasks || tasks.length === 0) {
        lines.push(`📋 <b>${dayLabel} (${formatDate(targetStr)})</b>`)
        lines.push('\nNenhuma tarefa agendada.')
      } else {
        const projectIds = [...new Set(tasks.map(t => t.project_id).filter(Boolean))]
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .eq('user_id', config.user_id)
          .in('id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000'])

        const projectMap = new Map((projects ?? []).map(p => [p.id, p.name]))

        const byProject = new Map<string, typeof tasks>()
        for (const t of tasks) {
          const key = t.project_id ? (projectMap.get(t.project_id) ?? 'Sem projeto') : 'Sem projeto'
          if (!byProject.has(key)) byProject.set(key, [])
          byProject.get(key)!.push(t)
        }

        lines.push(`📋 <b>${dayLabel} (${formatDate(targetStr)})</b>\n`)

        for (const [projName, projTasks] of byProject) {
          lines.push(`📌 <b>${projName}</b>`)
          for (const t of projTasks) {
            const time = t.due_time ? ` (${t.due_time.slice(0, 5)})` : ''
            lines.push(`${priorityLabel(t.priority)} ${t.title}${time}`)
          }
          lines.push('')
        }

        lines.push(`Total: ${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''}`)
      }

      if (overdueCount > 0) {
        lines.push(`\n⚠️ ${overdueCount} tarefa${overdueCount !== 1 ? 's' : ''} atrasada${overdueCount !== 1 ? 's' : ''}`)
      }

      await sendMessage(config.chat_id, lines.join('\n'))

      await supabase
        .from('telegram_config')
        .update({ last_summary_date: todayStr })
        .eq('user_id', config.user_id)

      results.push({ userId: config.user_id, status: 'sent' })
    } catch (err) {
      console.error(`[daily-summary] error for user ${config.user_id}:`, err)
      results.push({ userId: config.user_id, status: 'error' })
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
