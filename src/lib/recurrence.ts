import type { CalendarEvent, ParsedRecurrence, RecurrenceFrequency } from '../types'

// Rule format: "FREQ:INTERVAL" or "WEEKLY:INTERVAL:DAY,DAY"
// Examples: "DAILY:1", "WEEKLY:2:MO,WE,FR", "MONTHLY:1", "YEARLY:1"

const WEEKDAY_LABELS: Record<string, string> = {
  MO: 'Seg', TU: 'Ter', WE: 'Qua', TH: 'Qui', FR: 'Sex', SA: 'Sáb', SU: 'Dom',
}

export function parseRecurrenceRule(rule: string): ParsedRecurrence | null {
  if (!rule) return null
  const parts = rule.split(':')
  if (parts.length < 2) return null
  const frequency = parts[0] as RecurrenceFrequency
  const interval = parseInt(parts[1], 10)
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(frequency) || isNaN(interval)) return null
  const weekdays = frequency === 'WEEKLY' && parts[2] ? parts[2].split(',') : undefined
  return { frequency, interval, weekdays }
}

export function formatRecurrenceRule(rec: ParsedRecurrence): string {
  const base = `${rec.frequency}:${rec.interval}`
  if (rec.frequency === 'WEEKLY' && rec.weekdays?.length) {
    return `${base}:${rec.weekdays.join(',')}`
  }
  return base
}

export function recurrenceLabel(rule: string): string {
  const parsed = parseRecurrenceRule(rule)
  if (!parsed) return ''
  const { frequency, interval, weekdays } = parsed
  const every = interval === 1 ? '' : `a cada ${interval} `
  switch (frequency) {
    case 'DAILY':
      return interval === 1 ? 'Todo dia' : `A cada ${interval} dias`
    case 'WEEKLY': {
      const days = weekdays?.map(d => WEEKDAY_LABELS[d] ?? d).join(', ') ?? ''
      const base = interval === 1 ? 'Toda semana' : `A cada ${interval} semanas`
      return days ? `${base} (${days})` : base
    }
    case 'MONTHLY':
      return interval === 1 ? 'Todo mês' : `A cada ${interval} meses`
    case 'YEARLY':
      return interval === 1 ? 'Todo ano' : `A cada ${interval} anos`
    default:
      return `${every}${(frequency as string).toLowerCase()}`
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d
}

const WEEKDAY_JS: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
}

function nextWeekdayOccurrences(
  from: Date,
  weekdays: string[],
  windowEnd: Date,
  interval: number,
): Date[] {
  const targets = weekdays.map(d => WEEKDAY_JS[d] ?? -1).filter(n => n >= 0)
  const results: Date[] = []
  let weekStart = new Date(from)
  // rewind to Monday of the week containing `from`
  const dow = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() - ((dow + 6) % 7))

  while (weekStart <= windowEnd) {
    for (const target of targets) {
      const candidate = new Date(weekStart)
      candidate.setDate(weekStart.getDate() + ((target + 6) % 7))
      if (candidate >= from && candidate <= windowEnd) {
        results.push(candidate)
      }
    }
    weekStart.setDate(weekStart.getDate() + 7 * interval)
  }
  return results
}

export function expandRecurrences(
  items: CalendarEvent[],
  windowStart: string,
  windowEnd: string,
): CalendarEvent[] {
  const winStart = new Date(windowStart)
  const winEnd = new Date(windowEnd)
  const expanded: CalendarEvent[] = []

  for (const item of items) {
    // Always include the original item if it falls in window
    const itemStart = new Date(item.start_time)
    if (itemStart >= winStart && itemStart <= winEnd) {
      expanded.push(item)
    }

    if (!item.recurrence_rule) continue

    const parsed = parseRecurrenceRule(item.recurrence_rule)
    if (!parsed) continue

    const { frequency, interval, weekdays } = parsed
    const origin = new Date(item.start_time)
    const duration = item.end_time
      ? new Date(item.end_time).getTime() - origin.getTime()
      : 0

    // Start generating from day after origin (origin already handled above)
    const genFrom = new Date(origin.getTime() + 1)

    let occurrenceDates: Date[] = []

    if (frequency === 'WEEKLY' && weekdays?.length) {
      occurrenceDates = nextWeekdayOccurrences(genFrom, weekdays, winEnd, interval)
    } else {
      let cursor = new Date(origin)
      // Advance cursor past genFrom
      while (cursor < genFrom) {
        if (frequency === 'DAILY') cursor = addDays(cursor, interval)
        else if (frequency === 'WEEKLY') cursor = addDays(cursor, 7 * interval)
        else if (frequency === 'MONTHLY') cursor = addMonths(cursor, interval)
        else cursor = addYears(cursor, interval)
      }
      while (cursor <= winEnd) {
        if (cursor >= winStart) occurrenceDates.push(new Date(cursor))
        if (frequency === 'DAILY') cursor = addDays(cursor, interval)
        else if (frequency === 'WEEKLY') cursor = addDays(cursor, 7 * interval)
        else if (frequency === 'MONTHLY') cursor = addMonths(cursor, interval)
        else cursor = addYears(cursor, interval)
      }
    }

    for (const d of occurrenceDates) {
      expanded.push({
        ...item,
        id: `${item.id}__${d.toISOString()}`,
        start_time: d.toISOString(),
        end_time: duration ? new Date(d.getTime() + duration).toISOString() : item.end_time,
        recurrence_parent_id: item.id,
      })
    }
  }

  // Sort by start_time
  expanded.sort((a, b) => a.start_time.localeCompare(b.start_time))
  return expanded
}
