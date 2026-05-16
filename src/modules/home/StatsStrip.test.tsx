import { render, screen } from '@testing-library/react'
import { StatsStrip } from './StatsStrip'

describe('StatsStrip', () => {
  it('displays provided counts', () => {
    render(
      <StatsStrip activeProjects={5} openTasks={23} dueToday={4} />
    )
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Active Projects')).toBeInTheDocument()
    expect(screen.getByText('Open Tasks')).toBeInTheDocument()
    expect(screen.getByText('Due Today')).toBeInTheDocument()
  })
})
