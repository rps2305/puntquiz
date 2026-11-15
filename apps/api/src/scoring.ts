// Pure scoring logic — server-authoritative (spec §3, §15). No I/O here so it is unit-testable.

export interface Vote {
  selected: string[]
  /** ms epoch of the member's FINAL answer change. */
  submittedAt: number
}

export function answerKey(selected: string[]): string {
  return [...new Set(selected)].sort().join('|')
}

export function isCorrect(correct: string[], selected: string[] | null | undefined): boolean {
  if (!selected || selected.length === 0) return false
  return answerKey(correct) === answerKey(selected)
}

/**
 * Majority Vote (spec §5): tally over whoever actually answered. Ties are broken by the
 * earliest final-answer timestamp among the tied options.
 */
export function resolveTeamAnswer(votes: Vote[]): { answer: string[]; tally: Record<string, number> } | null {
  const valid = votes.filter((v) => v.selected.length > 0)
  if (valid.length === 0) return null
  const groups = new Map<string, { selected: string[]; count: number; earliest: number }>()
  for (const v of valid) {
    const key = answerKey(v.selected)
    const g = groups.get(key)
    if (g) {
      g.count++
      g.earliest = Math.min(g.earliest, v.submittedAt)
    } else {
      groups.set(key, { selected: [...new Set(v.selected)].sort(), count: 1, earliest: v.submittedAt })
    }
  }
  const tally: Record<string, number> = {}
  for (const [k, g] of groups) tally[k] = g.count
  const best = [...groups.values()].sort((a, b) => b.count - a.count || a.earliest - b.earliest)[0]
  return { answer: best.selected, tally }
}

/** Competition ranking: equal scores share a rank (1,1,3). Ties are never forced apart (spec §6). */
export function rankRows<T extends { score: number }>(rows: T[]): (T & { rank: number; tied: boolean })[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score)
  const out = sorted.map((r) => {
    const first = sorted.findIndex((x) => x.score === r.score)
    const tied = sorted.filter((x) => x.score === r.score).length > 1
    return { ...r, rank: first + 1, tied }
  })
  return out
}

// ---------- Open questions & peer review (spec §7) ----------

export const normOpen = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()

/** Exact match (ignoring case, accents, punctuation, spacing) against any accepted answer => auto-correct, no peer needed. */
export function autoGradeOpen(accepted: string[], text: string): boolean {
  const t = normOpen(text)
  return t.length > 0 && accepted.some((a) => normOpen(a) === t)
}

/** Team answer for a free-text question: majority over normalised text; ties -> earliest final answer. Returns the original wording. */
export function resolveTeamOpen(votes: { text: string; submittedAt: number }[]): string | null {
  const groups = new Map<string, { text: string; count: number; earliest: number }>()
  for (const v of votes) {
    const k = normOpen(v.text)
    if (!k) continue
    const g = groups.get(k)
    if (g) {
      g.count++
      if (v.submittedAt < g.earliest) { g.earliest = v.submittedAt; g.text = v.text }
    } else groups.set(k, { text: v.text, count: 1, earliest: v.submittedAt })
  }
  const best = [...groups.values()].sort((a, b) => b.count - a.count || a.earliest - b.earliest)[0]
  return best ? best.text : null
}

/**
 * Random derangement: shuffle the pool, each gradee is graded by the next entry in that circular order,
 * so nobody grades their own answer. Returns null for a gradee when fewer than 2 candidates exist (host grades).
 */
export function assignGraders(gradees: string[], pool: string[], rng: () => number = Math.random): Map<string, string | null> {
  const out = new Map<string, string | null>()
  const order = [...new Set(pool)]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  for (const g of gradees) {
    if (order.length < 2) { out.set(g, null); continue }
    const at = order.indexOf(g)
    // The next entry in the circular order; a gradee outside the pool just gets a random grader.
    out.set(g, at >= 0 ? order[(at + 1) % order.length] : order[Math.floor(rng() * order.length)])
  }
  return out
}
