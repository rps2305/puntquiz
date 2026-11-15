import { describe, expect, it } from 'vitest'
import { finalMail, isDeliverable, roundMail, welcomeMail } from './mail.templates'

describe('mail templates', () => {
  it('escapes user-controlled text (names, questions)', () => {
    const m = welcomeMail('<script>alert(1)</script>', 'https://x.nl')
    expect(m.html).not.toContain('<script>')
    expect(m.html).toContain('&lt;script&gt;')
    const r = roundMail({ quiz: 'Q', round: 'R', teamMode: false, siteUrl: 'https://x.nl', rows: [{ rank: 1, name: '<b>x</b>', score: 5, mine: true }], items: [{ text: 'Is 1<2?', correct: ['ja'], mine: null, myCorrect: null, team: null, teamCorrect: null }] })
    expect(r.html).toContain('Is 1&lt;2?')
    expect(r.html).not.toContain('<b>x</b>')
  })
  it('round mail shows my answer, correctness, team answer and my row', () => {
    const r = roundMail({ quiz: 'Pub', round: 'Ronde 1', teamMode: true, siteUrl: 'https://x.nl', rows: [{ rank: 1, name: 'Alfa', score: 7.5, mine: true }], items: [{ text: 'Vraag', correct: ['Canberra'], mine: ['Sydney'], myCorrect: false, team: ['Canberra'], teamCorrect: true }] })
    expect(r.subject).toBe('Uitslag Ronde 1 — Pub')
    expect(r.text).toContain('Jij: Sydney ✗')
    expect(r.text).toContain('team: Canberra ✓')
    expect(r.text).toContain('1. Alfa — 7.5  <= jij')
  })
  it('keeps my row visible when I am outside the top 10', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ rank: i + 1, name: `P${i + 1}`, score: 12 - i, mine: i === 11 }))
    expect(finalMail({ quiz: 'Q', teamMode: false, rows, myScore: 1, siteUrl: 'https://x.nl' }).text).toContain('12. P12 — 1  <= jij')
  })
  it('never delivers to test/reserved domains', () => {
    for (const e of ['a@test.dev', 'a@puntquiz.test', 'a@puntquiz.local', 'a@example.com', 'bad', null]) expect(isDeliverable(e as string)).toBe(false)
    expect(isDeliverable('ronald@gmail.com')).toBe(true)
  })
})
