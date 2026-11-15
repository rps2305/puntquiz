// Pure import/export logic for the question bank (spec §19). No I/O so it is unit-testable.

import { MusicConfig, validateMusic } from './music'
import { MediaItem, parseYoutubeId, validateMedia } from './media'

export interface BankInput {
  text: string
  type: 'MC' | 'MULTI' | 'OPEN' | 'MUSIC'
  media?: unknown
  hint?: string | null
  config?: Partial<MusicConfig> | null
  options: { id: string; text: string }[]
  correct: string[]
  points?: number
  seconds?: number
  explanation?: string | null
  category?: string | null
  difficulty?: number | null
  tags?: string[]
  source?: string | null
}

export interface ParseResult {
  items: BankInput[]
  errors: { row: number; message: string }[]
}

const IDS = 'abcdefgh'
export const MAX_OPTIONS = 8
export const COLUMNS = [
  'text', 'type',
  ...Array.from({ length: MAX_OPTIONS }, (_, i) => `option${i + 1}`),
  'correct', 'points', 'seconds', 'category', 'difficulty', 'tags', 'explanation', 'source',
  'artist', 'songtitle', 'year', 'artistpoints', 'titlepoints', 'yearpoints', 'media', 'hint',
]

const ALIASES: Record<string, string> = {
  vraag: 'text', question: 'text', tekst: 'text',
  soort: 'type', juist: 'correct', antwoord: 'correct', answer: 'correct', correctanswer: 'correct',
  punten: 'points', seconden: 'seconds', tijd: 'seconds',
  categorie: 'category', hulp: 'hint', tip: 'hint', artiest: 'artist', titel: 'songtitle', jaar: 'year', bijlage: 'media', artiestpunten: 'artistpoints', titelpunten: 'titlepoints', jaarpunten: 'yearpoints', moeilijkheid: 'difficulty', niveau: 'difficulty',
  toelichting: 'explanation', uitleg: 'explanation', bron: 'source',
}
for (let i = 1; i <= MAX_OPTIONS; i++) {
  ALIASES[`optie${i}`] = `option${i}`
  ALIASES[`antwoord${i}`] = `option${i}`
  ALIASES[`answer${i}`] = `option${i}`
}

export const normalizeText = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** RFC 4180 CSV parser; auto-detects `;` (Dutch Excel) vs `,`; strips a BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
    } else if (c === '"' && cell === '') quoted = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

export function toCsv(rows: Record<string, string>[], delimiter = ','): string {
  const esc = (v: string) => (/[",;\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return '﻿' + [COLUMNS.join(delimiter), ...rows.map((r) => COLUMNS.map((c) => esc(r[c] ?? '')).join(delimiter))].join('\r\n') + '\r\n'
}

function parseDifficulty(v: string | undefined): number | null | 'bad' {
  const s = (v ?? '').trim().toLowerCase()
  if (!s) return null
  const map: Record<string, number> = { '1': 1, '2': 2, '3': 3, easy: 1, makkelijk: 1, medium: 2, gemiddeld: 2, hard: 3, moeilijk: 3 }
  return map[s] ?? 'bad'
}

/** Resolve `correct` tokens: 1-based option numbers first, otherwise exact (case-insensitive) option text. */
export function resolveCorrect(tokens: string[], options: { id: string; text: string }[]): string[] | null {
  const out: string[] = []
  for (const t of tokens.map((x) => x.trim()).filter(Boolean)) {
    const n = Number(t)
    let opt = Number.isInteger(n) && n >= 1 && n <= options.length ? options[n - 1] : undefined
    opt ??= options.find((o) => normalizeText(o.text) === normalizeText(t)) ?? options.find((o) => o.id === t)
    if (!opt) return null
    if (!out.includes(opt.id)) out.push(opt.id)
  }
  return out
}

/** Validate/normalise one candidate; returns an error message or null. */
export function validateBank(x: BankInput): string | null {
  if (!x.text?.trim()) return 'text is required'
  if (x.text.length > 500) return 'text is too long (max 500)'
  const mv = validateMedia(x.media)
  if ('error' in mv) return mv.error
  if (x.type !== 'MC' && x.type !== 'MULTI' && x.type !== 'OPEN' && x.type !== 'MUSIC') return 'type must be MC, MULTI, OPEN or MUSIC'
  if (x.type === 'MUSIC') return validateMusic(x.config)
  if (x.type === 'OPEN') {
    if (!x.correct.length || x.correct.length > 10 || x.correct.some((a) => !a.trim() || a.length > 100)) return 'OPEN needs 1-10 accepted answers (max 100 chars)'
    if (x.points !== undefined && !(x.points >= 0 && x.points <= 1000)) return 'invalid points'
    if (x.seconds !== undefined && !(x.seconds >= 5 && x.seconds <= 600)) return 'seconds must be 5-600'
    return null
  }
  if (x.options.length < 2 || x.options.length > MAX_OPTIONS) return `needs 2 to ${MAX_OPTIONS} options`
  if (x.options.some((o) => !o.text?.trim())) return 'empty option'
  if (new Set(x.options.map((o) => normalizeText(o.text))).size !== x.options.length) return 'duplicate options'
  if (!x.correct.length || x.correct.some((c) => !x.options.some((o) => o.id === c))) return 'mark at least one correct option'
  if (x.type === 'MC' && x.correct.length !== 1) return 'MC has exactly one correct option (use MULTI for several)'
  if (x.points !== undefined && !(x.points >= 0 && x.points <= 1000)) return 'invalid points'
  if (x.seconds !== undefined && !(x.seconds >= 5 && x.seconds <= 600)) return 'seconds must be 5-600'
  if (x.difficulty != null && ![1, 2, 3].includes(x.difficulty)) return 'difficulty must be 1-3'
  return null
}

/** `media` cell: one or more links separated by `|`; kind is inferred (YouTube, audio extension, else image). */
export function mediaFromCell(cell: string): unknown[] {
  return cell.split('|').map((x) => x.trim()).filter(Boolean).map((u) => {
    if (parseYoutubeId(u)) return { kind: 'youtube', url: u }
    return { kind: /\.(mp3|ogg|m4a|wav)(\?|$)/i.test(u) ? 'audio' : 'image', url: u }
  })
}

export function rowsToQuestions(table: string[][]): ParseResult {
  const result: ParseResult = { items: [], errors: [] }
  if (!table.length) return result
  const header = table[0].map((h) => {
    const k = h.trim().toLowerCase().replace(/[\s_-]+/g, '')
    return ALIASES[k] ?? k
  })
  if (!header.includes('text')) {
    result.errors.push({ row: 1, message: 'missing "text" (or "vraag") column' })
    return result
  }
  table.slice(1).forEach((cells, i) => {
    const row = i + 2
    const get = (k: string) => (cells[header.indexOf(k)] ?? '').trim()
    const optionTexts = Array.from({ length: MAX_OPTIONS }, (_, n) => get(`option${n + 1}`)).filter(Boolean)
    const options = optionTexts.map((text, n) => ({ id: IDS[n], text }))
    const typeRaw = get('type').toUpperCase()
    const isMusic = typeRaw === 'MUSIC'
    const isOpen = typeRaw === 'OPEN'
    // OPEN: the `correct` column lists accepted answers (separated by | or ;) and there are no options.
    const correct = isMusic ? [] : isOpen ? get('correct').split(/[;|]/).map((x) => x.trim()).filter(Boolean) : resolveCorrect(get('correct').split(/[;|]/), options)
    const diff = parseDifficulty(get('difficulty'))
    const item: BankInput = {
      text: get('text'),
      type: isMusic ? 'MUSIC' : isOpen ? 'OPEN' : typeRaw === 'MULTI' || (typeRaw === '' && (correct?.length ?? 0) > 1) ? 'MULTI' : (typeRaw as 'MC') || 'MC',
      options: isOpen || isMusic ? [] : options,
      correct: correct ?? [],
      media: mediaFromCell(get('media')),
      hint: get('hint') || null,
      config: isMusic ? { artist: get('artist').split(/[;|]/).map((x) => x.trim()).filter(Boolean), title: get('songtitle').split(/[;|]/).map((x) => x.trim()).filter(Boolean), year: get('year') ? Number(get('year')) : null, artistPoints: get('artistpoints') ? Number(get('artistpoints').replace(',', '.')) : 1, titlePoints: get('titlepoints') ? Number(get('titlepoints').replace(',', '.')) : 1, yearPoints: get('yearpoints') ? Number(get('yearpoints').replace(',', '.')) : 1 } : null,
      points: get('points') ? Number(get('points').replace(',', '.')) : undefined,
      seconds: get('seconds') ? Number(get('seconds')) : undefined,
      explanation: get('explanation') || null,
      category: get('category') || null,
      difficulty: diff === 'bad' ? null : diff,
      tags: get('tags').split(/[;|]/).map((t) => t.trim()).filter(Boolean),
      source: get('source') || null,
    }
    const err = correct === null ? 'a "correct" value matches no option' : diff === 'bad' ? 'difficulty must be 1-3 (or makkelijk/gemiddeld/moeilijk)' : validateBank(item)
    if (err) result.errors.push({ row, message: err })
    else result.items.push(item)
  })
  return result
}

/** JSON: an array or {questions:[...]}. Options may be strings or {id,text}; `correct` ids, 1-based numbers or option texts. */
export function jsonToQuestions(raw: unknown): ParseResult {
  const result: ParseResult = { items: [], errors: [] }
  const list = Array.isArray(raw) ? raw : (raw as { questions?: unknown })?.questions
  if (!Array.isArray(list)) {
    result.errors.push({ row: 0, message: 'expected an array of questions or {"questions": [...]}' })
    return result
  }
  list.forEach((q: any, i) => {
    const row = i + 1
    const options = (Array.isArray(q?.options) ? q.options : []).map((o: any, n: number) =>
      typeof o === 'string' ? { id: IDS[n], text: o } : { id: String(o?.id ?? IDS[n]), text: String(o?.text ?? '') },
    )
    const tokens = (Array.isArray(q?.correct) ? q.correct : [q?.correct]).filter((x: unknown) => x !== undefined && x !== null).map(String)
    const isOpen = q?.type === 'OPEN'
    const isMusic = q?.type === 'MUSIC'
    const byId = tokens.every((t: string) => options.some((o: { id: string }) => o.id === t))
    const correct = isMusic ? [] : isOpen ? tokens.map((t: string) => t.trim()).filter(Boolean) : byId ? tokens : resolveCorrect(tokens, options)
    const item: BankInput = {
      text: String(q?.text ?? ''),
      type: isMusic ? 'MUSIC' : isOpen ? 'OPEN' : q?.type === 'MULTI' || (!q?.type && (correct?.length ?? 0) > 1) ? 'MULTI' : 'MC',
      options: isOpen || isMusic ? [] : options,
      correct: correct ?? [],
      media: q?.media ?? [],
      hint: q?.hint ? String(q.hint) : null,
      config: isMusic ? q?.config ?? null : null,
      points: q?.points !== undefined ? Number(q.points) : undefined,
      seconds: q?.seconds !== undefined ? Number(q.seconds) : undefined,
      explanation: q?.explanation ?? null,
      category: q?.category ?? null,
      difficulty: q?.difficulty ?? null,
      tags: Array.isArray(q?.tags) ? q.tags.map(String) : [],
      source: q?.source ?? null,
    }
    const err = correct === null ? 'a "correct" value matches no option' : validateBank(item)
    if (err) result.errors.push({ row, message: err })
    else result.items.push(item)
  })
  return result
}

export function questionsToRows(items: (BankInput & { options: { id: string; text: string }[] })[]): Record<string, string>[] {
  return items.map((q) => {
    const r: Record<string, string> = {
      text: q.text,
      type: q.type,
      correct: q.type === 'OPEN' ? q.correct.join('|') : q.correct.map((c) => String(q.options.findIndex((o) => o.id === c) + 1)).join(';'),
      points: q.points !== undefined ? String(q.points) : '',
      seconds: q.seconds !== undefined ? String(q.seconds) : '',
      category: q.category ?? '',
      difficulty: q.difficulty ? String(q.difficulty) : '',
      tags: (q.tags ?? []).join(';'),
      explanation: q.explanation ?? '',
      source: q.source ?? '',
      artist: q.config?.artist?.join('|') ?? '',
      songtitle: q.config?.title?.join('|') ?? '',
      year: q.config?.year ? String(q.config.year) : '',
      artistpoints: q.config ? String(q.config.artistPoints ?? '') : '',
      titlepoints: q.config ? String(q.config.titlePoints ?? '') : '',
      yearpoints: q.config ? String(q.config.yearPoints ?? '') : '',
      hint: q.hint ?? '',
      // only portable links can travel in CSV; uploaded files are included in JSON exports only
      media: ((Array.isArray(q.media) ? q.media : []) as MediaItem[]).map((m) => (m.kind === 'youtube' ? `https://youtu.be/${m.videoId}` : m.url ?? '')).filter(Boolean).join('|'),
    }
    q.options.forEach((o, i) => (r[`option${i + 1}`] = o.text))
    return r
  })
}
