// Pure power-up rules (spec §8). Server-authoritative: the client only asks, the server decides and scores.

export type PowerUpType = 'FIFTY' | 'DOUBLE' | 'DOUBLE_DOWN' | 'EXTRA_TIME' | 'HINT'
export const POWER_UP_TYPES: PowerUpType[] = ['FIFTY', 'DOUBLE', 'DOUBLE_DOWN', 'EXTRA_TIME', 'HINT']
export const EXTRA_TIME_MS = 15_000

/** Score modifiers: at most one per question (they would otherwise stack unfairly). */
export const SCORE_MODIFIERS: PowerUpType[] = ['DOUBLE', 'DOUBLE_DOWN']

export interface PowerUpSettings {
  types: PowerUpType[]
  uses: number
}

export function normaliseSettings(raw: unknown): PowerUpSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { types?: unknown; uses?: unknown }
  const types = [...new Set((Array.isArray(r.types) ? r.types : []).filter((t): t is PowerUpType => POWER_UP_TYPES.includes(t as PowerUpType)))]
  if (!types.length) return null
  const uses = Math.min(3, Math.max(1, Math.round(Number(r.uses ?? 1)) || 1))
  return { types, uses }
}

/**
 * Points for one question after a modifier.
 * DOUBLE: correct => x2, wrong costs nothing. DOUBLE_DOWN: correct => x2, a submitted wrong answer => minus half the
 * question's points (spec example +20 / -10). An unanswered question never costs points.
 */
export function modScore(base: number, max: number, mod: PowerUpType | null, answered: boolean): number {
  if (mod === 'DOUBLE') return base * 2
  if (mod === 'DOUBLE_DOWN') return base > 0 ? base * 2 : answered ? -max / 2 : 0
  return base
}

/** 50/50: keep the correct option plus one wrong one. Deterministic per (owner, question) so a refresh never reveals more. */
export function fiftyFiftyHidden(optionIds: string[], correctId: string, seed: string): string[] {
  const wrong = optionIds.filter((o) => o !== correctId)
  if (wrong.length < 2) return []
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const keep = wrong[Math.abs(h) % wrong.length]
  return wrong.filter((o) => o !== keep)
}

export interface CanUseInput {
  type: PowerUpType
  settings: PowerUpSettings | null
  questionType: 'MC' | 'MULTI' | 'OPEN' | 'MUSIC'
  optionCount: number
  hasHint: boolean
  usedOnQuestion: PowerUpType[]
  usedTotal: number
}

/** Why a power-up cannot be used right now (null = allowed). */
export function cannotUse(i: CanUseInput): string | null {
  if (!i.settings || !i.settings.types.includes(i.type)) return 'This power-up is not enabled for this quiz'
  if (i.usedOnQuestion.includes(i.type)) return 'Already used on this question'
  if (i.usedTotal >= i.settings.uses) return 'No uses left'
  if (SCORE_MODIFIERS.includes(i.type) && i.usedOnQuestion.some((u) => SCORE_MODIFIERS.includes(u))) return 'Only one score booster per question'
  if (i.type === 'FIFTY' && !(i.questionType === 'MC' && i.optionCount >= 3)) return '50/50 only works on multiple-choice questions with three or more options'
  if (i.type === 'HINT' && !i.hasHint) return 'This question has no hint'
  return null
}
