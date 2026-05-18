import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Task } from '../../types'

// Mock supabase before importing components that use it
vi.mock('../../lib/supabase', () => ({
  supabase: {},
}))

import { TaskDetailPanel } from './TaskDetailPanel'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const task: Task = {
  id: '1', title: 'Write tests', status: 'todo', priority: 'high',
  due_date: '2026-05-20', project_id: null, description: 'Some details', created_at: '',
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('TaskDetailPanel', () => {
  it('renders task title and description', () => {
    render(
      <Wrapper>
        <TaskDetailPanel task={task} projects={[]} onClose={vi.fn()} />
      </Wrapper>
    )
    expect(screen.getByDisplayValue('Write tests')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Some details')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <Wrapper>
        <TaskDetailPanel task={task} projects={[]} onClose={onClose} />
      </Wrapper>
    )
    fireEvent.click(screen.getByLabelText('Close panel'))
    expect(onClose).toHaveBeenCalled()
  })
})
