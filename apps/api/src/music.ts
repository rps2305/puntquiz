// Pure music-question scoring (spec §7): artist, title and an optional year bonus are scored independently,
// so points may be fractional (e.g. 0.5 + 0.5). Deterministic and server-side; no AI involved.
import { normOpen, resolveTeamOpen } from './scoring'

export interface MusicConfig {
  artist: string[]
  title: string[]
  year?: number | null
  artistPoints: number
  titlePoints: number
  yearPoints: number
}

export interface MusicResult {
  artist: boolean
  title: boolean
  year: boolean
  points: number
}

const ARTICLES = /^(the|de|het|een|a|an|der|die|das|le|la|les|el)\s+/

function clean(s: string) {
  return normOpen(s).replace(ARTICLES, '')
}

function distance(a: string, b: string): number {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/**
 * Tolerant but strict enough for pub quizzes: equal after normalisation (case, accents, punctuation, leading article),
 * or a small typo (1 edit for 6-10 characters, 2 for 11+). Short answers must match exactly.
 */
export function looseMatch(accepted: string[], text: string): boolean {
  const t = clean(text)
  if (!t) return false
  return accepted.some((a) => {
    const c = clean(a)
    if (!c) return false
    if (c === t) return true
    const tol = c.length >= 11 ? 2 : c.length >= 6 ? 1 : 0
    return tol > 0 && Math.abs(c.length - t.length) <= tol && distance(c, t) <= tol
  })
}

export const musicMax = (c: MusicConfig) => c.artistPoints + c.titlePoints + (c.year ? c.yearPoints : 0)

/** `selected` is positional: [artist, title, year]. */
export function musicScore(c: MusicConfig, selected: string[] | null | undefined): MusicResult {
  const [artist = '', title = '', year = ''] = selected ?? []
  const a = c.artist.length > 0 && looseMatch(c.artist, artist)
  const t = c.title.length > 0 && looseMatch(c.title, title)
  const y = !!c.year && String(c.year) === year.replace(/\D/g, '').slice(0, 4)
  return { artist: a, title: t, year: y, points: (a ? c.artistPoints : 0) + (t ? c.titlePoints : 0) + (y ? c.yearPoints : 0) }
}

/** Team answer: each part is a majority vote of its own (normalised) text; ties -> earliest. */
export function resolveTeamMusic(votes: { selected: string[]; submittedAt: number }[]): string[] | null {
  const part = (i: number) => resolveTeamOpen(votes.map((v) => ({ text: v.selected[i] ?? '', submittedAt: v.submittedAt }))) ?? ''
  const out = [part(0), part(1), part(2)]
  return out.some(Boolean) ? out : null
}

export function validateMusic(c: Partial<MusicConfig> | null | undefined): string | null {
  if (!c) return 'music settings are required'
  const list = (x: unknown) => (Array.isArray(x) ? x.map((v) => String(v).trim()).filter(Boolean) : [])
  const artist = list(c.artist), title = list(c.title)
  if (!artist.length && !title.length) return 'give at least an accepted artist or title'
  if ([...artist, ...title].some((v) => v.length > 100) || artist.length > 10 || title.length > 10) return 'max 10 accepted answers of 100 characters'
  for (const k of ['artistPoints', 'titlePoints', 'yearPoints'] as const) {
    const v = Number(c[k] ?? 0)
    if (!(v >= 0 && v <= 100)) return `${k} must be between 0 and 100`
  }
  if (c.year != null && c.year !== (null as unknown) && !(Number.isInteger(Number(c.year)) && Number(c.year) >= 1900 && Number(c.year) <= 2100)) return 'year must be between 1900 and 2100'
  return null
}

export function normaliseMusic(c: Partial<MusicConfig>): MusicConfig {
  const list = (x: unknown) => (Array.isArray(x) ? [...new Set(x.map((v) => String(v).trim()).filter(Boolean))] : [])
  return {
    artist: list(c.artist),
    title: list(c.title),
    year: c.year ? Number(c.year) : null,
    artistPoints: Number(c.artistPoints ?? 1),
    titlePoints: Number(c.titlePoints ?? 1),
    yearPoints: Number(c.yearPoints ?? 1),
  }
}
