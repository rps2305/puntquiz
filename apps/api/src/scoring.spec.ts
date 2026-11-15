import { describe, expect, it } from 'vitest'
import { isCorrect, rankRows, resolveTeamAnswer } from './scoring'

describe('isCorrect', () => {
  it('matches single and multi answers regardless of order', () => {
    expect(isCorrect(['a'], ['a'])).toBe(true)
    expect(isCorrect(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(isCorrect(['a', 'b'], ['a'])).toBe(false)
    expect(isCorrect(['a'], [])).toBe(false)
    expect(isCorrect(['a'], null)).toBe(false)
  })
})

describe('resolveTeamAnswer (Majority Vote)', () => {
  it('picks the most chosen answer (spec §5 Canberra example)', () => {
    const r = resolveTeamAnswer([
      { selected: ['canberra'], submittedAt: 1 },
      { selected: ['canberra'], submittedAt: 2 },
      { selected: ['sydney'], submittedAt: 3 },
      { selected: ['canberra'], submittedAt: 4 },
    ])
    expect(r?.answer).toEqual(['canberra'])
  })
  it('ignores members who did not answer', () => {
    const r = resolveTeamAnswer([
      { selected: [], submittedAt: 1 },
      { selected: ['a'], submittedAt: 5 },
    ])
    expect(r?.answer).toEqual(['a'])
  })
  it('breaks ties by earliest final answer', () => {
    const r = resolveTeamAnswer([
      { selected: ['a'], submittedAt: 10 },
      { selected: ['b'], submittedAt: 5 },
    ])
    expect(r?.answer).toEqual(['b'])
  })
  it('returns null when nobody answered', () => {
    expect(resolveTeamAnswer([])).toBeNull()
  })
})

describe('rankRows', () => {
  it('shares rank on ties and supports fractional points', () => {
    const rows = rankRows([
      { id: 'a', score: 10 },
      { id: 'b', score: 10 },
      { id: 'c', score: 7.5 },
    ])
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3])
    expect(rows[0].tied).toBe(true)
    expect(rows[2].tied).toBe(false)
  })
})

import { assignGraders, autoGradeOpen, normOpen, resolveTeamOpen } from './scoring'

describe('open questions', () => {
  it('normalises case, accents, punctuation and spacing', () => {
    expect(normOpen('  Zürich!! ')).toBe('zurich')
    expect(autoGradeOpen(['Parijs'], ' parijs. ')).toBe(true)
    expect(autoGradeOpen(['Parijs', 'Paris'], 'PARIS')).toBe(true)
    expect(autoGradeOpen(['Parijs'], 'Parys')).toBe(false)
    expect(autoGradeOpen(['Parijs'], '')).toBe(false)
  })
  it('team answer: majority over normalised text, earliest wording, tie -> earliest', () => {
    expect(resolveTeamOpen([{ text: 'Parijs', submittedAt: 5 }, { text: 'parijs ', submittedAt: 3 }, { text: 'Lyon', submittedAt: 1 }])).toBe('parijs ')
    expect(resolveTeamOpen([{ text: 'A', submittedAt: 9 }, { text: 'B', submittedAt: 2 }])).toBe('B')
    expect(resolveTeamOpen([{ text: '  ', submittedAt: 1 }])).toBeNull()
  })
  it('never lets anyone grade their own answer', () => {
    for (let seed = 1; seed < 200; seed++) {
      let x = seed
      const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647)
      const pool = ['a', 'b', 'c', 'd', 'e']
      const m = assignGraders(['a', 'c', 'e'], pool, rng)
      for (const [gradee, grader] of m) { expect(grader).not.toBeNull(); expect(grader).not.toBe(gradee) }
    }
  })
  it('two participants grade each other; a single one has no grader', () => {
    const m = assignGraders(['a', 'b'], ['a', 'b'])
    expect(m.get('a')).toBe('b'); expect(m.get('b')).toBe('a')
    expect(assignGraders(['a'], ['a']).get('a')).toBeNull()
  })
})
