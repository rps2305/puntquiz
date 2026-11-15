// Media attachments for questions (spec §7): images, audio, YouTube (with in/out timestamps), external URLs.
// Everything user-supplied is validated; uploads are sniffed by content, never trusted by filename or declared type.

export type MediaKind = 'image' | 'audio' | 'youtube'

export interface MediaItem {
  kind: MediaKind
  /** Uploaded asset (served by our API) ... */
  assetId?: string
  /** ... or an https URL (image/audio). */
  url?: string
  /** YouTube video id + optional in/out seconds. */
  videoId?: string
  start?: number
  end?: number
  /** Show/play on the players' phones. Audio defaults to false: music plays on the venue's speakers. */
  players: boolean
}

export const MAX_MEDIA_PER_QUESTION = 3
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024

const YT_ID = /^[\w-]{11}$/

export function parseYoutubeId(input: string): string | null {
  const s = input.trim()
  if (YT_ID.test(s)) return s
  try {
    const u = new URL(s)
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '')
    if (host === 'youtu.be') return YT_ID.test(u.pathname.slice(1, 12)) ? u.pathname.slice(1, 12) : null
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1]
      return v && YT_ID.test(v) ? v : null
    }
  } catch {
    /* not a URL */
  }
  return null
}

function safeUrl(u: string): string | null {
  try {
    const x = new URL(u.trim())
    return x.protocol === 'https:' && u.length <= 500 ? x.toString() : null
  } catch {
    return null
  }
}

export function embedUrl(m: MediaItem): string {
  const p = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
  if (m.start) p.set('start', String(m.start))
  if (m.end) p.set('end', String(m.end))
  return `https://www.youtube-nocookie.com/embed/${m.videoId}?${p}`
}

/** Returns normalised items or an error string. */
export function validateMedia(raw: unknown): { items: MediaItem[] } | { error: string } {
  if (raw == null) return { items: [] }
  if (!Array.isArray(raw)) return { error: 'media must be a list' }
  if (raw.length > MAX_MEDIA_PER_QUESTION) return { error: `max ${MAX_MEDIA_PER_QUESTION} media items per question` }
  const items: MediaItem[] = []
  for (const [i, r] of raw.entries()) {
    const w = `media ${i + 1}`
    const kind = r?.kind as MediaKind
    if (kind !== 'image' && kind !== 'audio' && kind !== 'youtube') return { error: `${w}: unknown kind` }
    const players = r.players === undefined ? kind !== 'audio' : !!r.players
    if (kind === 'youtube') {
      const videoId = parseYoutubeId(String(r.videoId ?? r.url ?? ''))
      if (!videoId) return { error: `${w}: not a valid YouTube link` }
      const start = r.start === undefined || r.start === null || r.start === '' ? undefined : Number(r.start)
      const end = r.end === undefined || r.end === null || r.end === '' ? undefined : Number(r.end)
      for (const v of [start, end]) if (v !== undefined && !(Number.isInteger(v) && v >= 0 && v <= 36000)) return { error: `${w}: start/end must be whole seconds` }
      if (start !== undefined && end !== undefined && end <= start) return { error: `${w}: end must be after start` }
      items.push({ kind, videoId, ...(start ? { start } : {}), ...(end ? { end } : {}), players })
      continue
    }
    if (r.assetId) {
      if (!/^[0-9a-f-]{36}$/.test(String(r.assetId))) return { error: `${w}: invalid asset` }
      items.push({ kind, assetId: String(r.assetId), players })
    } else {
      const url = safeUrl(String(r.url ?? ''))
      if (!url) return { error: `${w}: give an https:// link or upload a file` }
      items.push({ kind, url, players })
    }
  }
  return { items }
}

/** Detect the real file type from magic bytes. Returns null for anything we do not accept (e.g. SVG/HTML). */
export function sniffMime(b: Buffer): { mime: string; kind: 'image' | 'audio' } | null {
  const at = (i: number, s: string) => b.length >= i + s.length && b.subarray(i, i + s.length).toString('latin1') === s
  if (b.length > 12 && b[0] === 0x89 && at(1, 'PNG')) return { mime: 'image/png', kind: 'image' }
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', kind: 'image' }
  if (at(0, 'GIF87a') || at(0, 'GIF89a')) return { mime: 'image/gif', kind: 'image' }
  if (at(0, 'RIFF') && at(8, 'WEBP')) return { mime: 'image/webp', kind: 'image' }
  if (at(0, 'ID3') || (b.length > 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { mime: 'audio/mpeg', kind: 'audio' }
  if (at(0, 'OggS')) return { mime: 'audio/ogg', kind: 'audio' }
  if (at(4, 'ftyp')) return { mime: 'audio/mp4', kind: 'audio' }
  if (at(0, 'RIFF') && at(8, 'WAVE')) return { mime: 'audio/wav', kind: 'audio' }
  return null
}
