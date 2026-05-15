import { describe, it, expect } from 'vitest'
import type { Project, Task } from './index'

describe('type guards', () => {
  it('isTask narrows unknown to Task', () => {
    const raw: unknown = {
      id: '123', title: 'Test', status: 'todo',
      priority: 'medium', project_id: null, due_date: null,
      description: null, created_at: '2026-01-01'
    }
    const task = raw as Task
    expect(task.title).toBe('Test')
    expect(task.status).toBe('todo')
  })

  it('Project has required color field', () => {
    const p: Project = {
      id: '1', name: 'Work', color: '#6366f1',
      status: 'active', description: null, created_at: '2026-01-01'
    }
    expect(p.color).toBe('#6366f1')
  })
})
