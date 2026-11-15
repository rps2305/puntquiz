import { describe, expect, it } from 'vitest'
import { cannotUse, fiftyFiftyHidden, modScore, normaliseSettings } from './powerups'

describe('score modifiers (spec §8 examples)', () => {
  it('Double Points: x2 when correct, no penalty when wrong', () => {
    expect(modScore(10, 10, 'DOUBLE', true)).toBe(20)
    expect(modScore(0, 10, 'DOUBLE', true)).toBe(0)
  })
  it('Double Down: +20 / -10; unanswered costs nothing; partial music points double', () => {
    expect(modScore(10, 10, 'DOUBLE_DOWN', true)).toBe(20)
    expect(modScore(0, 10, 'DOUBLE_DOWN', true)).toBe(-5 - 0) // minus half of the question's points
    expect(modScore(0, 10, 'DOUBLE_DOWN', false)).toBe(0)
    expect(modScore(0.5, 2, 'DOUBLE_DOWN', true)).toBe(1)
    expect(modScore(7, 10, null, true)).toBe(7)
  })
})

describe('50/50', () => {
  it('hides all but one wrong option, deterministically, never the correct one', () => {
    const ids = ['a', 'b', 'c', 'd']
    const h1 = fiftyFiftyHidden(ids, 'b', 'owner:q1'), h2 = fiftyFiftyHidden(ids, 'b', 'owner:q1')
    expect(h1).toEqual(h2)
    expect(h1).toHaveLength(2)
    expect(h1).not.toContain('b')
    expect(fiftyFiftyHidden(['a', 'b'], 'a', 'x')).toEqual([]) // nothing to remove with 2 options
    expect(fiftyFiftyHidden(['a', 'b', 'c'], 'a', 'x')).toHaveLength(1)
  })
})

describe('rules', () => {
  const base = { type: 'DOUBLE' as const, settings: { types: ['DOUBLE', 'DOUBLE_DOWN', 'FIFTY', 'HINT'] as any, uses: 1 }, questionType: 'MC' as const, optionCount: 4, hasHint: true, usedOnQuestion: [] as any, usedTotal: 0 }
  it('allows a valid use and blocks the rest', () => {
    expect(cannotUse(base)).toBeNull()
    expect(cannotUse({ ...base, settings: null })).toMatch(/not enabled/)
    expect(cannotUse({ ...base, type: 'EXTRA_TIME' })).toMatch(/not enabled/)
    expect(cannotUse({ ...base, usedTotal: 1 })).toMatch(/No uses/)
    expect(cannotUse({ ...base, usedOnQuestion: ['DOUBLE'] })).toMatch(/Already/)
    expect(cannotUse({ ...base, type: 'DOUBLE_DOWN', usedOnQuestion: ['DOUBLE'] })).toMatch(/one score booster/)
    expect(cannotUse({ ...base, type: 'FIFTY', questionType: 'OPEN' })).toMatch(/50\/50/)
    expect(cannotUse({ ...base, type: 'FIFTY', optionCount: 2 })).toMatch(/50\/50/)
    expect(cannotUse({ ...base, type: 'HINT', hasHint: false })).toMatch(/no hint/)
  })
  it('normalises settings', () => {
    expect(normaliseSettings({ types: ['DOUBLE', 'NOPE', 'DOUBLE'], uses: 9 })).toEqual({ types: ['DOUBLE'], uses: 3 })
    expect(normaliseSettings({ types: [] })).toBeNull()
    expect(normaliseSettings(null)).toBeNull()
  })
})
