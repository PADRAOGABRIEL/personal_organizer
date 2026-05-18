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
      <MonthGrid year={2026} month={4} items={{}} onSelectDay={noop} selectedDay={null} projects={[]} />
    )
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('calls onSelectDay when a day is clicked', () => {
    const onSelectDay = vi.fn()
    render(
      <MonthGrid year={2026} month={4} items={{}} onSelectDay={onSelectDay} selectedDay={null} projects={[]} />
    )
    // Click the 15th
    fireEvent.click(screen.getByText('15'))
    expect(onSelectDay).toHaveBeenCalledWith('2026-05-15')
  })

  it('highlights today with an indigo indicator', () => {
    const today = new Date()
    const year = today.getFullYear()
    // MonthGrid / getCalendarDays uses 0-based month (same as Date)
    const month = today.getMonth()
    render(
      <MonthGrid year={year} month={month} items={{}} selectedDay={null} onSelectDay={noop} projects={[]} />
    )
    const todayDate = String(today.getDate())
    // Find the span that contains today's date number and has the indigo today indicator class
    const allSpans = Array.from(document.querySelectorAll('span'))
    const todaySpan = allSpans.find(
      span => span.textContent?.trim() === todayDate && span.className.includes('bg-indigo-600')
    )
    expect(todaySpan).toBeDefined()
  })
})
