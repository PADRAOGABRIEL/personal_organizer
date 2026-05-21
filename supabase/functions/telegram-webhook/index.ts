import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!

interface TelegramMessage {
  message_id: number
  from: { id: number; first_name: string }
  chat: { id: number }
  text?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

interface EditTask {
  id: string
  title: string
  due_date: string | null
  priority: string
  project_id: string | null
  color: string | null
}

interface Session {
  step: 'title' | 'date' | 'priority' | 'project'
    | 'edit_pick' | 'edit_field' | 'edit_title' | 'edit_date' | 'edit_priority' | 'edit_project'
  title?: string
  due_date?: string | null
  priority?: string
  edit_task_id?: string
  edit_task_title?: string
  edit_task_priority?: string
  edit_task_due_date?: string | null
  edit_tasks?: EditTask[]
}

async function sendMessage(chatId: string, text: string, replyMarkup?: object): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup !== undefined ? { reply_markup: replyMarkup } : {}),
    }),
  })
}

function replyKeyboard(rows: string[][]): object {
  return { keyboard: rows, one_time_keyboard: true, resize_keyboard: true }
}

function removeKeyboard(): object {
  return { remove_keyboard: true }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function hexToCircleEmoji(hex: string | null | undefined): string {
  if (!hex) return '⚪'
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max - min < 0.1) return '⚫'
  let h = 0
  if (max === r) h = ((g - b) / (max - min) + 6) % 6
  else if (max === g) h = (b - r) / (max - min) + 2
  else h = (r - g) / (max - min) + 4
  h = h * 60
  if (h < 30 || h >= 330) return '🔴'
  if (h < 60) return '🟠'
  if (h < 90) return '🟡'
  if (h < 150) return '🟢'
  if (h < 250) return '🔵'
  return '🟣'
}

function priorityEmoji(p: string): string {
  if (p === 'high') return '🔴'
  if (p === 'medium') return '🟠'
  return '🟢'
}

function priorityLabel(p: string): string {
  if (p === 'high') return 'Alta'
  if (p === 'medium') return 'Média'
  return 'Baixa'
}

function parsePriority(text: string): string | null {
  if (text === '🟢 Baixa') return 'low'
  if (text === '🟠 Média') return 'medium'
  if (text === '🔴 Alta') return 'high'
  return null
}

function parseDate(text: string): { date: string | null; valid: boolean } {
  const nowBrazil = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  if (text === 'Hoje') return { date: nowBrazil.toISOString().split('T')[0], valid: true }
  if (text === 'Amanhã') {
    const t = new Date(nowBrazil)
    t.setDate(t.getDate() + 1)
    return { date: t.toISOString().split('T')[0], valid: true }
  }
  if (text === 'Pular') return { date: null, valid: true }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { date: text, valid: true }
  return { date: null, valid: false }
}

async function saveSession(userId: string, session: Session | null): Promise<void> {
  await supabase.from('telegram_config').update({ session }).eq('user_id', userId)
}

async function handleTasks(chatId: string, userId: string, dateStr: string, label: string) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, priority, due_time, project_id')
    .eq('user_id', userId)
    .eq('due_date', dateStr)
    .neq('status', 'done')
    .order('due_time', { ascending: true, nullsFirst: false })

  if (!tasks || tasks.length === 0) {
    await sendMessage(chatId, `Nenhuma tarefa para ${label}.`)
    return
  }

  const projectIds = [...new Set(tasks.map(t => t.project_id).filter(Boolean))]
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('user_id', userId)
    .in('id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000'])

  const projectMap = new Map((projects ?? []).map(p => [p.id, { name: p.name, color: p.color }]))

  const lines = [`📋 <b>${label} (${formatDate(dateStr)})</b>\n`]
  for (const t of tasks) {
    const proj = t.project_id ? projectMap.get(t.project_id) : null
    const projName = proj?.name ?? 'Sem projeto'
    const bullet = hexToCircleEmoji(proj?.color)
    const time = t.due_time ? ` (${t.due_time.slice(0, 5)})` : ''
    lines.push(`${bullet} [${projName}] ${t.title}${time}`)
  }
  lines.push(`\nTotal: ${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''}`)

  await sendMessage(chatId, lines.join('\n'))
}

async function handleWeek(chatId: string, userId: string) {
  const today = new Date()
  const in7 = new Date(today)
  in7.setDate(today.getDate() + 7)
  const todayStr = today.toISOString().split('T')[0]
  const in7Str = in7.toISOString().split('T')[0]

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, priority, due_date, due_time, project_id')
    .eq('user_id', userId)
    .gte('due_date', todayStr)
    .lte('due_date', in7Str)
    .neq('status', 'done')
    .order('due_date', { ascending: true })

  if (!tasks || tasks.length === 0) {
    await sendMessage(chatId, 'Nenhuma tarefa nos próximos 7 dias.')
    return
  }

  const projectIds = [...new Set(tasks.map(t => t.project_id).filter(Boolean))]
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('user_id', userId)
    .in('id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000'])

  const projectMap = new Map((projects ?? []).map(p => [p.id, { name: p.name, color: p.color }]))

  const lines = [`📅 <b>Próximos 7 dias</b>\n`]
  for (const t of tasks) {
    const proj = t.project_id ? projectMap.get(t.project_id) : null
    const bullet = hexToCircleEmoji(proj?.color)
    const time = t.due_time ? ` (${t.due_time.slice(0, 5)})` : ''
    lines.push(`${bullet} ${formatDate(t.due_date!)} — ${t.title}${time}`)
  }
  lines.push(`\nTotal: ${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''}`)

  await sendMessage(chatId, lines.join('\n'))
}

async function handleEdit(chatId: string, userId: string) {
  const nowBrazil = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const todayStr = nowBrazil.toISOString().split('T')[0]
  const in7 = new Date(nowBrazil)
  in7.setDate(in7.getDate() + 7)
  const in7Str = in7.toISOString().split('T')[0]

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, priority, due_date, project_id')
    .eq('user_id', userId)
    .or(`due_date.lte.${in7Str},due_date.is.null`)
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(10)

  if (!tasks || tasks.length === 0) {
    await sendMessage(chatId, 'Nenhuma tarefa para editar.')
    return
  }

  const projectIds = [...new Set(tasks.map(t => t.project_id).filter(Boolean))]
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('user_id', userId)
    .in('id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000'])

  const projectMap = new Map((projects ?? []).map(p => [p.id, { name: p.name, color: p.color }]))

  const editTasks: EditTask[] = tasks.map(t => {
    const proj = t.project_id ? projectMap.get(t.project_id) : null
    return {
      id: t.id,
      title: t.title,
      due_date: t.due_date ?? null,
      priority: t.priority,
      project_id: t.project_id ?? null,
      color: proj?.color ?? null,
    }
  })

  const lines = ['✏️ <b>Qual tarefa editar?</b>\n']
  for (let i = 0; i < editTasks.length; i++) {
    const t = editTasks[i]
    const bullet = hexToCircleEmoji(t.color)
    let dateTag = ''
    if (t.due_date) {
      if (t.due_date < todayStr) dateTag = ' (atrasada)'
      else if (t.due_date === todayStr) dateTag = ' (hoje)'
      else dateTag = ` (${formatDateShort(t.due_date)})`
    }
    lines.push(`${i + 1}. ${bullet} ${t.title}${dateTag}`)
  }

  const numRows: string[][] = []
  const nums = editTasks.map((_, i) => String(i + 1))
  for (let i = 0; i < nums.length; i += 3) numRows.push(nums.slice(i, i + 3))

  await saveSession(userId, { step: 'edit_pick', edit_tasks: editTasks })
  await sendMessage(chatId, lines.join('\n'), replyKeyboard(numRows))
}

function taskSummaryLine(title: string, dueDate: string | null, priority: string, projectName: string): string {
  const dateInfo = dueDate ? `📅 ${formatDateShort(dueDate)}  ·  ` : ''
  return `<b>${title}</b>\n${dateInfo}${priorityEmoji(priority)} ${priorityLabel(priority)}  ·  📁 ${projectName}`
}

const PRIORITY_KEYBOARD = [['🟢 Baixa', '🟠 Média', '🔴 Alta']]
const DATE_KEYBOARD = [['Hoje', 'Amanhã', 'Pular']]
const FIELD_KEYBOARD = [['Título', 'Data', 'Prioridade'], ['Projeto', '✅ Concluir']]

const HELP_TEXT = `📱 <b>Comandos disponíveis:</b>

/tasks — Tarefas de hoje
/tomorrow — Tarefas de amanhã
/week — Próximos 7 dias
/add — Criar nova tarefa (fluxo guiado)
/edit — Editar uma tarefa existente
/cancel — Cancelar ação atual
/help — Esta mensagem`

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let update: TelegramUpdate
  try {
    update = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const message = update.message
  if (!message?.text) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const text = message.text.trim()
  const chatId = String(message.chat.id)

  // /start is handled before config lookup
  if (text.startsWith('/start')) {
    const token = text.split(' ')[1]?.trim()

    if (token) {
      const { data: linkToken } = await supabase
        .from('telegram_link_tokens')
        .select('user_id, expires_at, used_at')
        .eq('token', token)
        .maybeSingle()

      if (!linkToken || linkToken.used_at || new Date(linkToken.expires_at) < new Date()) {
        await sendMessage(chatId, '❌ Link inválido ou expirado. Gere um novo link nas Configurações do app.')
      } else {
        await supabase.from('telegram_config').upsert(
          { user_id: linkToken.user_id, chat_id: chatId, summary_hour: 20 },
          { onConflict: 'user_id' }
        )
        await supabase.from('telegram_link_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('token', token)
        await sendMessage(chatId, `✅ Conta conectada com sucesso!\n\n${HELP_TEXT}`)
      }
    } else {
      const { data: existing } = await supabase
        .from('telegram_config')
        .select('user_id')
        .eq('chat_id', chatId)
        .maybeSingle()

      if (existing) {
        await sendMessage(chatId, `✅ Sua conta já está conectada!\n\n${HELP_TEXT}`)
      } else {
        await sendMessage(chatId,
          `👋 Olá! Para conectar sua conta, acesse as <b>Configurações</b> do app e clique em "Conectar Telegram".`)
      }
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  // Look up user config by chat_id
  const { data: config } = await supabase
    .from('telegram_config')
    .select('user_id, session')
    .eq('chat_id', chatId)
    .maybeSingle()

  if (!config) {
    await sendMessage(chatId,
      `Para usar o bot, abra as <b>Configurações</b> do app e cole seu Chat ID:\n\n<code>${chatId}</code>`)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const userId = config.user_id
  const session = config.session as Session | null

  const nowBrazil = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const today = nowBrazil.toISOString().split('T')[0]
  const tomorrowDate = new Date(nowBrazil)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0]

  try {
    if (text === '/cancel') {
      await saveSession(userId, null)
      await sendMessage(chatId, '❌ Ação cancelada.', removeKeyboard())
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    if (session) {
      if (text.startsWith('/')) {
        await sendMessage(chatId,
          '⚠️ Você está no meio de uma ação. Use /cancel para cancelar ou continue respondendo.')
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }

      // ── ADD FLOW ──────────────────────────────────────────────────
      if (session.step === 'title') {
        await saveSession(userId, { step: 'date', title: text })
        await sendMessage(chatId, '📅 Quando é a tarefa?', replyKeyboard(DATE_KEYBOARD))

      } else if (session.step === 'date') {
        const { date, valid } = parseDate(text)
        if (!valid) {
          await sendMessage(chatId,
            '⚠️ Data inválida. Use os botões ou digite no formato YYYY-MM-DD.',
            replyKeyboard(DATE_KEYBOARD))
        } else {
          await saveSession(userId, { ...session, step: 'priority', due_date: date })
          await sendMessage(chatId, '⚡ Qual a prioridade?', replyKeyboard(PRIORITY_KEYBOARD))
        }

      } else if (session.step === 'priority') {
        const priority = parsePriority(text)
        if (!priority) {
          await sendMessage(chatId, '⚠️ Escolha uma das opções:', replyKeyboard(PRIORITY_KEYBOARD))
        } else {
          const { data: projects } = await supabase
            .from('projects').select('id, name').eq('user_id', userId).eq('status', 'active').order('name')

          if (!projects || projects.length === 0) {
            await saveSession(userId, null)
            const { data: task, error } = await supabase
              .from('tasks')
              .insert({ user_id: userId, title: session.title, due_date: session.due_date ?? null, priority, project_id: null, status: 'todo' })
              .select().single()
            if (error) {
              await sendMessage(chatId, `❌ Erro ao criar tarefa: ${error.message}`, removeKeyboard())
            } else {
              const dateInfo = task.due_date ? `📅 ${formatDateShort(task.due_date)}  ·  ` : ''
              await sendMessage(chatId,
                `✅ Tarefa criada!\n<b>${task.title}</b>\n${dateInfo}${priorityEmoji(priority)} ${priorityLabel(priority)}  ·  📁 Sem projeto`,
                removeKeyboard())
            }
          } else {
            await saveSession(userId, { ...session, step: 'project', priority })
            const names = projects.map(p => p.name)
            const rows: string[][] = []
            for (let i = 0; i < names.length; i += 2) rows.push(names.slice(i, i + 2))
            rows.push(['Sem projeto'])
            await sendMessage(chatId, '📁 Qual o projeto?', replyKeyboard(rows))
          }
        }

      } else if (session.step === 'project') {
        const { data: projects } = await supabase
          .from('projects').select('id, name').eq('user_id', userId).eq('status', 'active').order('name')

        let projectId: string | null = null
        let projectName = 'Sem projeto'

        if (text !== 'Sem projeto') {
          const match = (projects ?? []).find(p => p.name === text)
          if (!match) {
            const names = (projects ?? []).map(p => p.name)
            const rows: string[][] = []
            for (let i = 0; i < names.length; i += 2) rows.push(names.slice(i, i + 2))
            rows.push(['Sem projeto'])
            await sendMessage(chatId, '⚠️ Projeto não encontrado. Escolha uma opção:', replyKeyboard(rows))
            return new Response(JSON.stringify({ ok: true }), { status: 200 })
          }
          projectId = match.id
          projectName = match.name
        }

        await saveSession(userId, null)
        const { data: task, error } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            title: session.title,
            due_date: session.due_date ?? null,
            priority: session.priority ?? 'medium',
            project_id: projectId,
            status: 'todo',
          })
          .select().single()

        if (error) {
          await sendMessage(chatId, `❌ Erro ao criar tarefa: ${error.message}`, removeKeyboard())
        } else {
          const dateInfo = task.due_date ? `📅 ${formatDateShort(task.due_date)}  ·  ` : ''
          await sendMessage(chatId,
            `✅ Tarefa criada!\n<b>${task.title}</b>\n${dateInfo}${priorityEmoji(session.priority ?? 'medium')} ${priorityLabel(session.priority ?? 'medium')}  ·  📁 ${projectName}`,
            removeKeyboard())
        }

      // ── EDIT FLOW ─────────────────────────────────────────────────
      } else if (session.step === 'edit_pick') {
        const idx = parseInt(text, 10) - 1
        const tasks = session.edit_tasks ?? []
        if (isNaN(idx) || idx < 0 || idx >= tasks.length) {
          const numRows: string[][] = []
          const nums = tasks.map((_, i) => String(i + 1))
          for (let i = 0; i < nums.length; i += 3) numRows.push(nums.slice(i, i + 3))
          await sendMessage(chatId, '⚠️ Escolha um número da lista:', replyKeyboard(numRows))
        } else {
          const t = tasks[idx]

          let projectName = 'Sem projeto'
          if (t.project_id) {
            const { data: proj } = await supabase.from('projects').select('name').eq('id', t.project_id).single()
            if (proj) projectName = proj.name
          }

          await saveSession(userId, {
            step: 'edit_field',
            edit_task_id: t.id,
            edit_task_title: t.title,
            edit_task_priority: t.priority,
            edit_task_due_date: t.due_date,
            edit_tasks: tasks,
          })
          await sendMessage(chatId,
            `📝 ${taskSummaryLine(t.title, t.due_date, t.priority, projectName)}\n\nO que deseja alterar?`,
            replyKeyboard(FIELD_KEYBOARD))
        }

      } else if (session.step === 'edit_field') {
        if (text === 'Título') {
          await saveSession(userId, { ...session, step: 'edit_title' })
          await sendMessage(chatId, `✏️ Novo título para <b>${session.edit_task_title}</b>?`, removeKeyboard())

        } else if (text === 'Data') {
          await saveSession(userId, { ...session, step: 'edit_date' })
          await sendMessage(chatId, `📅 Nova data para <b>${session.edit_task_title}</b>?`, replyKeyboard(DATE_KEYBOARD))

        } else if (text === 'Prioridade') {
          await saveSession(userId, { ...session, step: 'edit_priority' })
          await sendMessage(chatId, `⚡ Nova prioridade para <b>${session.edit_task_title}</b>?`, replyKeyboard(PRIORITY_KEYBOARD))

        } else if (text === 'Projeto') {
          await saveSession(userId, { ...session, step: 'edit_project' })
          const { data: projects } = await supabase
            .from('projects').select('id, name').eq('user_id', userId).eq('status', 'active').order('name')
          const names = (projects ?? []).map(p => p.name)
          const rows: string[][] = []
          for (let i = 0; i < names.length; i += 2) rows.push(names.slice(i, i + 2))
          rows.push(['Sem projeto'])
          await sendMessage(chatId, `📁 Novo projeto para <b>${session.edit_task_title}</b>?`, replyKeyboard(rows))

        } else if (text === '✅ Concluir') {
          const { error } = await supabase.from('tasks').update({ status: 'done' }).eq('id', session.edit_task_id).eq('user_id', userId)
          await saveSession(userId, null)
          if (error) {
            await sendMessage(chatId, `❌ Erro: ${error.message}`, removeKeyboard())
          } else {
            await sendMessage(chatId, `✅ <b>${session.edit_task_title}</b> marcada como concluída!`, removeKeyboard())
          }
        } else {
          await sendMessage(chatId, '⚠️ Escolha uma opção:', replyKeyboard(FIELD_KEYBOARD))
        }

      } else if (session.step === 'edit_title') {
        const { error } = await supabase.from('tasks').update({ title: text }).eq('id', session.edit_task_id).eq('user_id', userId)
        await saveSession(userId, null)
        if (error) {
          await sendMessage(chatId, `❌ Erro: ${error.message}`, removeKeyboard())
        } else {
          await sendMessage(chatId, `✅ Título atualizado!\n<b>${text}</b>`, removeKeyboard())
        }

      } else if (session.step === 'edit_date') {
        const { date, valid } = parseDate(text)
        if (!valid) {
          await sendMessage(chatId,
            '⚠️ Data inválida. Use os botões ou digite no formato YYYY-MM-DD.',
            replyKeyboard(DATE_KEYBOARD))
        } else {
          const { error } = await supabase.from('tasks').update({ due_date: date }).eq('id', session.edit_task_id).eq('user_id', userId)
          await saveSession(userId, null)
          if (error) {
            await sendMessage(chatId, `❌ Erro: ${error.message}`, removeKeyboard())
          } else {
            const dateInfo = date ? `📅 ${formatDateShort(date)}` : 'sem data'
            await sendMessage(chatId,
              `✅ Data atualizada!\n<b>${session.edit_task_title}</b> → ${dateInfo}`,
              removeKeyboard())
          }
        }

      } else if (session.step === 'edit_priority') {
        const priority = parsePriority(text)
        if (!priority) {
          await sendMessage(chatId, '⚠️ Escolha uma das opções:', replyKeyboard(PRIORITY_KEYBOARD))
        } else {
          const { error } = await supabase.from('tasks').update({ priority }).eq('id', session.edit_task_id).eq('user_id', userId)
          await saveSession(userId, null)
          if (error) {
            await sendMessage(chatId, `❌ Erro: ${error.message}`, removeKeyboard())
          } else {
            await sendMessage(chatId,
              `✅ Prioridade atualizada!\n<b>${session.edit_task_title}</b> → ${priorityEmoji(priority)} ${priorityLabel(priority)}`,
              removeKeyboard())
          }
        }

      } else if (session.step === 'edit_project') {
        const { data: projects } = await supabase
          .from('projects').select('id, name').eq('user_id', userId).eq('status', 'active').order('name')

        let projectId: string | null = null
        let projectName = 'Sem projeto'

        if (text !== 'Sem projeto') {
          const match = (projects ?? []).find(p => p.name === text)
          if (!match) {
            const names = (projects ?? []).map(p => p.name)
            const rows: string[][] = []
            for (let i = 0; i < names.length; i += 2) rows.push(names.slice(i, i + 2))
            rows.push(['Sem projeto'])
            await sendMessage(chatId, '⚠️ Projeto não encontrado. Escolha uma opção:', replyKeyboard(rows))
            return new Response(JSON.stringify({ ok: true }), { status: 200 })
          }
          projectId = match.id
          projectName = match.name
        }

        const { error } = await supabase.from('tasks').update({ project_id: projectId }).eq('id', session.edit_task_id).eq('user_id', userId)
        await saveSession(userId, null)
        if (error) {
          await sendMessage(chatId, `❌ Erro: ${error.message}`, removeKeyboard())
        } else {
          await sendMessage(chatId,
            `✅ Projeto atualizado!\n<b>${session.edit_task_title}</b> → 📁 ${projectName}`,
            removeKeyboard())
        }
      }

    } else {
      if (text === '/help') {
        await sendMessage(chatId, HELP_TEXT)
      } else if (text === '/tasks') {
        await handleTasks(chatId, userId, today, 'Hoje')
      } else if (text === '/tomorrow') {
        await handleTasks(chatId, userId, tomorrowStr, 'Amanhã')
      } else if (text === '/week') {
        await handleWeek(chatId, userId)
      } else if (text === '/add' || text.startsWith('/add ')) {
        await saveSession(userId, { step: 'title' })
        await sendMessage(chatId, '📝 Qual o título da tarefa? (ou /cancel para cancelar)')
      } else if (text === '/edit') {
        await handleEdit(chatId, userId)
      } else {
        await sendMessage(chatId, HELP_TEXT)
      }
    }
  } catch (err) {
    console.error('[telegram-webhook] error:', err)
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
