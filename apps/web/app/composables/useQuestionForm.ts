// Shared helpers for the quiz editor and the question bank form (media + music settings).
const lines = (t: string) => String(t ?? '').split('\n').map((x) => x.trim()).filter(Boolean)

export const emptyCfg = () => ({ artist: '', title: '', year: '' as number | string, artistPoints: 0.5, titlePoints: 0.5, yearPoints: 1 })

export const cfgFromDto = (c: any) =>
  c ? { artist: (c.artist ?? []).join('\n'), title: (c.title ?? []).join('\n'), year: c.year ?? '', artistPoints: c.artistPoints, titlePoints: c.titlePoints, yearPoints: c.yearPoints } : emptyCfg()

export const cfgToPayload = (c: any) => ({
  artist: lines(c.artist),
  title: lines(c.title),
  year: c.year ? Number(c.year) : null,
  artistPoints: Number(c.artistPoints ?? 0),
  titlePoints: Number(c.titlePoints ?? 0),
  yearPoints: Number(c.yearPoints ?? 0),
})

export const mediaFromDto = (m: any[] | undefined) =>
  (m ?? []).map((x) => ({ ...x, url: x.kind === 'youtube' ? x.url || `https://youtu.be/${x.videoId}` : x.url || '', _name: x.assetId ? 'geüpload bestand' : '' }))

export const mediaToPayload = (arr: any[] | undefined) =>
  (arr ?? []).map((m) =>
    m.kind === 'youtube'
      ? { kind: 'youtube', url: m.url, start: m.start || undefined, end: m.end || undefined, players: !!m.players }
      : m.assetId
        ? { kind: m.kind, assetId: m.assetId, players: !!m.players }
        : { kind: m.kind, url: m.url, players: !!m.players },
  )
