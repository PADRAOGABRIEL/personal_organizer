import { describe, it, expect, vi } from 'vitest'
import type { Project, Task } from '../../types'

// Mock the supabase module before importing useHomeData
vi.mock('../../lib/supabase', () => ({
  supabase: {},
}))

import { computeProjectsWithTaskCounts } from './useHomeData'

describe('computeProjectsWithTaskCounts', () => {
  const projects: Project[] = [
    { id: 'p1', name: 'Work', color: '#6366f1', status: 'active', description: null, created_at: '' },
    { id: 'p2', name: 'Blog', color: '#22c55e', status: 'active', description: null, created_at: '' },
  ]

  const tasks: Task[] = [
    { id: 't1', title: 'A', status: 'todo', priority: 'high', project_id: 'p1', due_date: null, description: null, created_at: '' },
    { id: 't2', title: 'B', status: 'done', priority: 'low', project_id: 'p1', due_date: null, description: null, created_at: '' },
    { id: 't3', title: 'C', status: 'in_progress', priority: 'medium', project_id: 'p1', due_date: null, description: null, created_at: '' },
    { id: 't4', title: 'D', status: 'todo', priority: 'medium', project_id: 'p2', due_date: null, description: null, created_at: '' },
  ]

  it('counts open tasks (non-done) per project', () => {
    const result = computeProjectsWithTaskCounts(projects, tasks)
    const work = result.find(p => p.id === 'p1')!
    expect(work.open_task_count).toBe(2)  // todo + in_progress
    expect(work.total_task_count).toBe(3)
  })

  it('returns 0 counts for projects with no tasks', () => {
    const result = computeProjectsWithTaskCounts(projects, [])
    result.forEach(p => {
      expect(p.open_task_count).toBe(0)
      expect(p.total_task_count).toBe(0)
    })
  })

  it('only includes active projects', () => {
    const withArchived = [...projects, {
      id: 'p3', name: 'Old', color: '#fff', status: 'archived' as const,
      description: null, created_at: ''
    }]
    const result = computeProjectsWithTaskCounts(withArchived, tasks)
    expect(result.find(p => p.id === 'p3')).toBeUndefined()
  })
})
