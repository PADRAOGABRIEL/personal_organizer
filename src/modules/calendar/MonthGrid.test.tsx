import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { MonthGrid } from './MonthGrid'

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const noop = () => {}

describe('MonthGrid', () => {
  it('renders Mon-Sun day headers', () => {
    render(
      <MonthGrid year={2026} month={4} items={{}} onSelectDay={noop} selectedDay={null} />
    )
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('calls onSelectDay when a day is clicked', () => {
    const onSelectDay = vi.fn()
    render(
      <MonthGrid year={2026} month={4} items={{}} onSelectDay={onSelectDay} selectedDay={null} />
    )
    // Click the 15th
    fireEvent.click(screen.getByText('15'))
    expect(onSelectDay).toHaveBeenCalledWith('2026-05-15')
  })
})
