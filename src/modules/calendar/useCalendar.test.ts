import { describe, it, expect, vi } from 'vitest'
import { getCalendarDays, getItemsForDay } from './useCalendar'
import type { Task, CalendarEvent } from '../../types'

// Mock the supabase module before importing useCalendar
vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

describe('getCalendarDays', () => {
  it('returns 35 or 42 days for a month grid starting on Monday', () => {
    const days = getCalendarDays(2026, 4) // May 2026
    expect(days.length).toBeGreaterThanOrEqual(35)
    expect(days.length % 7).toBe(0)
  })

  it('includes the 1st of the month', () => {
    const days = getCalendarDays(2026, 4)
    expect(days.some(d => d.date === '2026-05-01')).toBe(true)
  })
})

describe('getItemsForDay', () => {
  const task: Task = {
    id: '1', title: 'Meeting', status: 'todo', priority: 'medium',
    due_date: '2026-05-15', due_time: null, duration_minutes: null, project_id: null, description: null, created_at: '',
  }
  const event: CalendarEvent = {
    id: '2', title: 'Lunch', start_time: '2026-05-15T12:00:00Z',
    end_time: null, all_day: false, project_id: null, description: null, created_at: '',
  }

  it('returns tasks due on that date', () => {
    const items = getItemsForDay('2026-05-15', [task], [])
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Meeting')
  })

  it('returns events starting on that date', () => {
    const items = getItemsForDay('2026-05-15', [], [event])
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Lunch')
  })

  it('does not return done tasks', () => {
    const done = { ...task, status: 'done' as const }
    const items = getItemsForDay('2026-05-15', [done], [])
    expect(items).toHaveLength(0)
  })
})
