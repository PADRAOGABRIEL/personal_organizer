import { render, screen, fireEvent } from '@testing-library/react'
import { TaskRow } from './TaskRow'
import type { Task, Project } from '../../types'

const task: Task = {
  id: '1', title: 'Write tests', status: 'todo', priority: 'high',
  due_date: null, project_id: null, description: null, created_at: '',
}

describe('TaskRow', () => {
  it('renders task title', () => {
    render(<TaskRow task={task} projects={[]} onToggle={vi.fn()} onSelect={vi.fn()} />)
    expect(screen.getByText('Write tests')).toBeInTheDocument()
  })

  it('calls onToggle when checkbox is clicked', () => {
    const onToggle = vi.fn()
    render(<TaskRow task={task} projects={[]} onToggle={onToggle} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith('1')
  })

  it('shows high priority badge', () => {
    render(<TaskRow task={task} projects={[]} onToggle={vi.fn()} onSelect={vi.fn()} />)
    expect(screen.getByText('High')).toBeInTheDocument()
  })
})
