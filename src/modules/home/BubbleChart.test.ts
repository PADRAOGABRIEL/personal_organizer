import { describe, it, expect } from 'vitest'
import { computeRadius } from './BubbleChart'

describe('computeRadius', () => {
  it('returns MIN_RADIUS when task count is 0', () => {
    expect(computeRadius(0, 20)).toBe(40)
  })

  it('returns MAX_RADIUS when task count equals max', () => {
    expect(computeRadius(20, 20)).toBe(120)
  })

  it('scales linearly between min and max', () => {
    const r = computeRadius(10, 20)
    expect(r).toBeGreaterThan(40)
    expect(r).toBeLessThan(120)
  })
})
