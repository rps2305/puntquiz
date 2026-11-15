import { describe, expect, it } from 'vitest'
import { looseMatch, musicMax, musicScore, resolveTeamMusic, validateMusic } from './music'
import { parseYoutubeId, sniffMime, validateMedia } from './media'

const cfg = { artist: ['The Beatles', 'Beatles'], title: ['Yesterday'], year: 1965, artistPoints: 0.5, titlePoints: 0.5, yearPoints: 1 }

describe('music scoring', () => {
  it('scores artist, title and year independently with fractional points', () => {
    expect(musicScore(cfg, ['beatles', 'Yesterday', '1965']).points).toBe(2)
    expect(musicScore(cfg, ['Beatles', 'Tomorrow', '1970'])).toMatchObject({ artist: true, title: false, year: false, points: 0.5 })
    expect(musicScore(cfg, ['', '', '1965']).points).toBe(1)
    expect(musicScore(cfg, null).points).toBe(0)
  })
  it('year bonus only counts when configured', () => {
    expect(musicMax({ ...cfg, year: null })).toBe(1)
    expect(musicScore({ ...cfg, year: null }, ['Beatles', 'Yesterday', '1965']).points).toBe(1)
  })
  it('tolerates articles and small typos but not short or wrong answers', () => {
    expect(looseMatch(['The Rolling Stones'], 'rolling stones')).toBe(true)
    expect(looseMatch(['Yesterday'], 'Yesterdey')).toBe(true) // 1 edit
    expect(looseMatch(['Queen'], 'Queer')).toBe(false) // short: exact only
    expect(looseMatch(['Bohemian Rhapsody'], 'Bohemian Rapsody')).toBe(true)
    expect(looseMatch(['Yesterday'], 'Tomorrow')).toBe(false)
    expect(looseMatch(['Yesterday'], '')).toBe(false)
  })
  it('team answer is a per-part majority', () => {
    const r = resolveTeamMusic([
      { selected: ['Beatles', 'Yesterday', ''], submittedAt: 3 },
      { selected: ['beatles', 'Help', '1965'], submittedAt: 1 },
      { selected: ['Stones', 'Yesterday', '1965'], submittedAt: 2 },
    ])
    expect(r?.map((x) => x.toLowerCase())).toEqual(['beatles', 'yesterday', '1965'])
    expect(resolveTeamMusic([])).toBeNull()
  })
  it('validates settings', () => {
    expect(validateMusic(cfg)).toBeNull()
    expect(validateMusic({ ...cfg, artist: [], title: [] })).toMatch(/artist or title/)
    expect(validateMusic({ ...cfg, year: 1800 })).toMatch(/year/)
    expect(validateMusic({ ...cfg, artistPoints: -1 })).toMatch(/artistPoints/)
  })
})

describe('media validation', () => {
  it('parses YouTube links and ids', () => {
    expect(parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYoutubeId('https://youtu.be/dQw4w9WgXcQ?t=5')).toBe('dQw4w9WgXcQ')
    expect(parseYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYoutubeId('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(parseYoutubeId('javascript:alert(1)')).toBeNull()
  })
  it('requires start < end and https URLs', () => {
    expect(validateMedia([{ kind: 'youtube', url: 'dQw4w9WgXcQ', start: 30, end: 20 }])).toHaveProperty('error')
    expect(validateMedia([{ kind: 'image', url: 'http://x.nl/a.png' }])).toHaveProperty('error')
    expect(validateMedia([{ kind: 'image', url: 'javascript:alert(1)' }])).toHaveProperty('error')
    const ok = validateMedia([{ kind: 'youtube', url: 'dQw4w9WgXcQ', start: 10, end: 20 }, { kind: 'audio', url: 'https://x.nl/a.mp3' }])
    expect(ok).toMatchObject({ items: [{ kind: 'youtube', videoId: 'dQw4w9WgXcQ', start: 10, end: 20, players: true }, { kind: 'audio', players: false }] })
    expect(validateMedia(Array(4).fill({ kind: 'image', url: 'https://x.nl/a.png' }))).toHaveProperty('error')
  })
  it('sniffs real file types and rejects SVG/HTML', () => {
    expect(sniffMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0]))?.mime).toBe('image/png')
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe('image/jpeg')
    expect(sniffMime(Buffer.from('ID3\u0003\u0000'))?.kind).toBe('audio')
    expect(sniffMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull()
    expect(sniffMime(Buffer.from('<!doctype html><script>'))).toBeNull()
  })
})
