import { describe, it, expect, vi } from 'vitest'
import type { Task } from '../../types'

// Mock the supabase module before importing useTasks
vi.mock('../../lib/supabase', () => ({
  supabase: {},
}))

import { groupTasksByHorizon } from './useTasks'

const makeTask = (overrides: Partial<Task>): Task => ({
  id: '1', title: 'Test', status: 'todo', priority: 'medium',
  due_date: null, due_time: null, duration_minutes: null, project_id: null, description: null, created_at: '',
  ...overrides,
})

describe('groupTasksByHorizon', () => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 8)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

  it('groups overdue tasks', () => {
    const task = makeTask({ due_date: yesterday.toISOString().split('T')[0] })
    const groups = groupTasksByHorizon([task])
    expect(groups.overdue).toHaveLength(1)
  })

  it('groups today tasks', () => {
    const task = makeTask({ due_date: todayStr })
    const groups = groupTasksByHorizon([task])
    expect(groups.today).toHaveLength(1)
  })

  it('groups this-week tasks (tomorrow through 7 days out)', () => {
    const task = makeTask({ due_date: tomorrow.toISOString().split('T')[0] })
    const groups = groupTasksByHorizon([task])
    expect(groups.thisWeek).toHaveLength(1)
  })

  it('groups later tasks (>7 days)', () => {
    const task = makeTask({ due_date: nextWeek.toISOString().split('T')[0] })
    const groups = groupTasksByHorizon([task])
    expect(groups.later).toHaveLength(1)
  })

  it('groups tasks with no due date separately', () => {
    const task = makeTask({ due_date: null })
    const groups = groupTasksByHorizon([task])
    expect(groups.noDueDate).toHaveLength(1)
  })

  it('excludes done tasks from all groups', () => {
    const task = makeTask({ status: 'done', due_date: todayStr })
    const groups = groupTasksByHorizon([task])
    expect(groups.today).toHaveLength(0)
  })
})
