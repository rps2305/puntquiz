import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, Question, Round } from '@prisma/client'
import {
  GRACE_PERIOD_MS,
  type HostAction,
  type HostLiveView,
  type LiveState,
  type PlayerLiveView,
  type RevealedQuestion,
  type StandingRow,
  type StandingsDto,
  type GradeAdminRow,
  type PlayerPowerUps,
  type PictureRoundView,
  type PictureState,
  type GradeItem,
  type TeamDto,
} from '@puntquiz/contracts'
import { PrismaService } from './prisma.service'
import { RedisService } from './redis.service'
import { QuizGateway } from './gateway'
import { PresenceService } from './presence.service'
import { MailService } from './mail.service'
import { BoardRow, RoundItem, finalMail, roundMail } from './mail.templates'
import { FullQuiz, toQuestionDto, toSummary } from './quizzes'
import { EXTRA_TIME_MS, PowerUpType, SCORE_MODIFIERS, cannotUse, fiftyFiftyHidden, modScore, normaliseSettings } from './powerups'
import { MusicConfig, musicMax, musicScore, resolveTeamMusic } from './music'
import { assignGraders, autoGradeOpen, isCorrect, normOpen, rankRows, resolveTeamAnswer, resolveTeamOpen } from './scoring'

interface Flat {
  round: Round
  q: Question
  roundIndex: number
  questionIndex: number
}

const stateKey = (id: string) => `room:${id}:state`
const revealedKey = (id: string) => `room:${id}:revealed`

const INITIAL: LiveState = {
  phase: 'LOBBY',
  pausedFrom: null,
  roundIndex: 0,
  questionIndex: 0,
  questionId: null,
  openedAt: null,
  deadline: null,
  remainingMs: null,
  closedAt: null,
  revealScope: null,
  showStandings: false,
  skipped: [],
  pictures: [],
  activePicture: null,
  version: 0,
}

function flatten(quiz: FullQuiz): Flat[] {
  const out: Flat[] = []
  const rounds = [...quiz.rounds].sort((a, b) => a.number - b.number)
  rounds.forEach((round, roundIndex) => {
    ;[...round.questions]
      .sort((a, b) => a.number - b.number)
      .forEach((q, questionIndex) => out.push({ round, q, roundIndex, questionIndex }))
  })
  return out
}

@Injectable()
export class LiveService {
  private timers = new Map<string, NodeJS.Timeout>()

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private gateway: QuizGateway,
    private presence: PresenceService,
    private mail: MailService,
  ) {}

  // ---------- helpers ----------

  async quiz(id: string): Promise<FullQuiz> {
    const q = await this.prisma.quiz.findUnique({ where: { id }, include: { rounds: { include: { questions: true } } } })
    if (!q) throw new NotFoundException('Quiz not found')
    return q
  }

  async state(quizId: string): Promise<LiveState> {
    let s = (await this.redis.getJson<LiveState>(stateKey(quizId))) ?? { ...INITIAL }
    // Lazy deadline enforcement: the server decides when time is up (spec §3), even after a restart.
    if (s.phase === 'QUESTION_OPEN' && s.deadline && Date.now() >= s.deadline) {
      s = await this.save(quizId, { ...s, phase: 'QUESTION_CLOSED', closedAt: s.deadline, deadline: null, timedOut: true })
    }
    return s
  }

  private async save(quizId: string, s: LiveState): Promise<LiveState> {
    const next = { ...s, version: s.version + 1 }
    await this.redis.setJson(stateKey(quizId), next)
    this.gateway.emitChanged(quizId, next.version)
    return next
  }

  private async revealedIds(quizId: string): Promise<string[]> {
    return (await this.redis.getJson<string[]>(revealedKey(quizId))) ?? []
  }

  private schedule(quizId: string, deadline: number | null) {
    const old = this.timers.get(quizId)
    if (old) clearTimeout(old)
    this.timers.delete(quizId)
    if (!deadline) return
    const t = setTimeout(() => {
      this.timers.delete(quizId)
      void this.state(quizId) // lazy path closes + emits
    }, Math.max(0, deadline - Date.now()) + 50)
    this.timers.set(quizId, t)
  }

  private audit(quizId: string, actorId: string | null, action: string, data?: Prisma.InputJsonValue) {
    this.prisma.auditLog.create({ data: { quizId, actorId, action, data } }).catch(() => undefined)
  }

  /** Resume timers for quizzes that were live when the API restarted. */
  async recover() {
    const live = await this.prisma.quiz.findMany({ where: { status: 'LIVE' }, select: { id: true } })
    for (const { id } of live) {
      const s = await this.state(id)
      if (s.phase === 'QUESTION_OPEN') this.schedule(id, s.deadline)
    }
  }

  // ---------- joining & teams ----------

  async findByCode(code: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { joinCode: code.trim().toUpperCase() },
      include: { rounds: { include: { _count: { select: { questions: true } } } } },
    })
    if (!quiz || quiz.status === 'DRAFT' || quiz.status === 'ARCHIVED') throw new NotFoundException('Quiz not found')
    return quiz
  }

  async join(code: string, userId: string) {
    const quiz = await this.findByCode(code)
    const existing = await this.prisma.participation.findUnique({ where: { quizId_userId: { quizId: quiz.id, userId } } })
    if (existing) return { quizId: quiz.id, participationId: existing.id }
    const s = await this.state(quiz.id)
    if (quiz.status === 'FINISHED') throw new BadRequestException('This quiz has finished')
    if (quiz.mode === 'TEAM' && s.phase !== 'LOBBY')
      throw new BadRequestException('Teams are locked: this quiz has already started')
    const p = await this.prisma.participation.create({ data: { quizId: quiz.id, userId } })
    this.gateway.emitChanged(quiz.id, s.version)
    return { quizId: quiz.id, participationId: p.id }
  }

  private async lobbyGuard(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } })
    if (!quiz) throw new NotFoundException('Quiz not found')
    if (quiz.mode !== 'TEAM') throw new BadRequestException('This is an individual quiz')
    const s = await this.state(quizId)
    if (s.phase !== 'LOBBY') throw new BadRequestException('Teams are locked once the quiz has started')
    const part = await this.prisma.participation.findUnique({ where: { quizId_userId: { quizId, userId } } })
    if (!part) throw new ForbiddenException('Join the quiz first')
    return { quiz, part, s }
  }

  private async pruneEmptyTeams(quizId: string) {
    await this.prisma.team.deleteMany({ where: { quizId, participations: { none: {} } } })
  }

  async createTeam(quizId: string, userId: string, name: string) {
    const { part, s } = await this.lobbyGuard(quizId, userId)
    const clean = String(name ?? '').trim().slice(0, 30)
    if (clean.length < 2) throw new BadRequestException('Team name must be at least 2 characters')
    try {
      const team = await this.prisma.team.create({ data: { quizId, name: clean } })
      await this.prisma.participation.update({ where: { id: part.id }, data: { teamId: team.id } })
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') throw new ConflictException('That team name is taken')
      throw e
    }
    await this.pruneEmptyTeams(quizId)
    this.gateway.emitChanged(quizId, s.version)
  }

  async joinTeam(quizId: string, userId: string, teamId: string) {
    const { quiz, part, s } = await this.lobbyGuard(quizId, userId)
    const team = await this.prisma.team.findFirst({ where: { id: teamId, quizId }, include: { _count: { select: { participations: true } } } })
    if (!team) throw new NotFoundException('Team not found')
    if (part.teamId !== team.id && team._count.participations >= quiz.maxTeamSize) throw new BadRequestException('Team is full')
    await this.prisma.participation.update({ where: { id: part.id }, data: { teamId } })
    await this.pruneEmptyTeams(quizId)
    this.gateway.emitChanged(quizId, s.version)
  }

  async leaveTeam(quizId: string, userId: string) {
    const { part, s } = await this.lobbyGuard(quizId, userId)
    await this.prisma.participation.update({ where: { id: part.id }, data: { teamId: null } })
    await this.pruneEmptyTeams(quizId)
    this.gateway.emitChanged(quizId, s.version)
  }

  // ---------- host actions ----------

  private async teamWarnings(quiz: { id: string; mode: string; minTeamSize: number }) {
    if (quiz.mode !== 'TEAM') return []
    const teams = await this.prisma.team.findMany({ where: { quizId: quiz.id }, include: { _count: { select: { participations: true } } } })
    const warn = teams.filter((t) => t._count.participations < quiz.minTeamSize).map((t) => `${t.name} (${t._count.participations})`)
    const unteamed = await this.prisma.participation.count({ where: { quizId: quiz.id, teamId: null } })
    if (unteamed) warn.push(`${unteamed} speler(s) zonder team`)
    return warn
  }

  async act(quizId: string, actorId: string, action: HostAction, force = false, roundParam?: number) {
    const quiz = await this.quiz(quizId)
    const flat = flatten(quiz)
    const s = await this.state(quizId)
    const now = Date.now()
    const cur = flat.find((f) => f.q.id === s.questionId)
    const bad = (m: string) => new BadRequestException(m)

    // Picture rounds are not stepped through question by question: they open as a sheet (see withPictures)
    // and stay answerable while the regular rounds continue.
    const seq = flat.filter((f) => f.round.kind !== 'PICTURE')
    const roundsSorted = [...quiz.rounds].sort((a, b) => a.number - b.number)
    const withPictures = (base: LiveState, target: Flat): LiveState => {
      const pics: PictureState[] = [...(base.pictures ?? [])]
      roundsSorted.forEach((r, i) => {
        if (r.kind === 'PICTURE' && i < target.roundIndex && !pics.some((p) => p.roundIndex === i))
          pics.push({ roundIndex: i, untilRoundIndex: Math.min(i + r.openRounds, roundsSorted.length - 1), closed: false, revealed: false })
      })
      // Play has moved beyond the last round in which a picture round may still be answered: close it.
      return { ...base, pictures: pics.map((p) => (!p.closed && target.roundIndex > p.untilRoundIndex ? { ...p, closed: true } : p)) }
    }
    const open = (f: Flat, base: LiveState): LiveState => ({
      ...base,
      phase: 'QUESTION_OPEN',
      pausedFrom: null,
      roundIndex: f.roundIndex,
      questionIndex: f.questionIndex,
      questionId: f.q.id,
      openedAt: now,
      deadline: now + f.q.seconds * 1000,
      remainingMs: null,
      closedAt: null,
      revealScope: null,
      showStandings: false,
      timedOut: false,
      activePicture: null,
    })

    let ns: LiveState
    let mailAfter: (() => Promise<void>) | null = null
    // While a picture round is being graded, the host's normal Reveal button finishes that grading.
    const eff: HostAction = action === 'reveal' && s.phase === 'GRADING' && s.activePicture != null ? 'reveal_picture' : action
    switch (eff) {
      case 'start': {
        if (s.phase !== 'LOBBY') throw bad('Quiz already started')
        if (quiz.status !== 'SCHEDULED') throw bad('Publish the quiz first')
        if (!flat.length) throw bad('Quiz has no questions')
        const warn = await this.teamWarnings(quiz)
        if (warn.length && !force) throw new ConflictException({ message: 'Teams below minimum size', warnings: warn })
        await this.prisma.quiz.update({ where: { id: quizId }, data: { status: 'LIVE' } })
        ns = open(seq[0], withPictures(s, seq[0]))
        break
      }
      case 'close': {
        if (s.phase !== 'QUESTION_OPEN') throw bad('No open question')
        ns = { ...s, phase: 'QUESTION_CLOSED', closedAt: now, deadline: null, timedOut: false }
        break
      }
      case 'next': {
        if (s.phase !== 'QUESTION_CLOSED' && s.phase !== 'REVEAL') throw bad('Close the current question first')
        const idx = seq.findIndex((f) => f.q.id === s.questionId)
        const nxt = seq[idx + 1]
        if (!nxt && (s.pictures ?? []).some((p) => !p.revealed)) throw bad('Reveal the picture round(s) first')
        if (!nxt) {
          await this.prisma.quiz.update({ where: { id: quizId }, data: { status: 'FINISHED', finishedAt: new Date() } })
          ns = { ...s, phase: 'FINISHED', showStandings: true, revealScope: null, deadline: null }
          // Everything is revealed at the end.
          await this.redis.setJson(revealedKey(quizId), flat.map((f) => f.q.id))
          mailAfter = () => this.mailFinal(quizId)
        } else ns = open(nxt, withPictures(s, nxt))
        break
      }
      case 'force_reveal':
      case 'reveal': {
        const wasOpen = s.phase === 'QUESTION_OPEN'
        if (!cur || (!(wasOpen && action === 'force_reveal') && s.phase !== 'QUESTION_CLOSED' && s.phase !== 'REVEAL' && s.phase !== 'GRADING'))
          throw bad('Close the current question first')
        const scope = quiz.revealMode === 'ROUND' ? 'round' : 'question'
        const inScopeOf = (f: Flat) => (scope === 'round' ? f.roundIndex === cur.roundIndex && f.questionIndex <= cur.questionIndex : f.q.id === cur.q.id)
        // Open questions: peer review first. Standings only count graded answers (spec §6), so reveal waits for it.
        const pending = await this.prepareGrading(quizId, flat.filter(inScopeOf), new Set(s.skipped ?? []))
        if (pending > 0) {
          if (s.phase !== 'GRADING') {
            ns = { ...s, phase: 'GRADING', revealScope: null, ...(wasOpen ? { closedAt: now, deadline: null } : {}) }
            break
          }
          if (!force) throw bad(`${pending} answer(s) still need grading`)
          await this.prisma.grade.updateMany({
            where: { quizId, verdict: null, questionId: { in: flat.filter(inScopeOf).map((f) => f.q.id) } },
            data: { verdict: false, source: 'DEFAULT', gradedAt: new Date() },
          })
        }
        const ids = new Set(await this.revealedIds(quizId))
        for (const f of flat) if (inScopeOf(f)) ids.add(f.q.id)
        await this.redis.setJson(revealedKey(quizId), [...ids])
        const roundCount = quiz.rounds.length
        const lastInRound = !flat.some((f) => f.roundIndex === cur.roundIndex && f.questionIndex > cur.questionIndex)
        // Interim standings default to the halfway point (spec §6).
        const half = roundCount >= 2 && lastInRound && cur.roundIndex === Math.ceil(roundCount / 2) - 1
        if (lastInRound) mailAfter = () => this.mailRound(quizId, cur.roundIndex)
        ns = {
          ...s,
          phase: 'REVEAL',
          revealScope: scope,
          activePicture: null,
          showStandings: s.showStandings || half,
          // Force reveal closes an open question first (emergency grip, spec §15).
          ...(wasOpen ? { closedAt: now, deadline: null } : {}),
        }
        break
      }
      case 'close_picture': {
        const pics = s.pictures ?? []
        const p = pics.find((x) => (roundParam == null ? !x.closed : x.roundIndex === roundParam) && !x.closed)
        if (!p) throw bad('No open picture round')
        ns = { ...s, pictures: pics.map((x) => (x === p ? { ...x, closed: true } : x)) }
        break
      }
      case 'reveal_picture': {
        // Allowed between questions only, so a running question timer is never disturbed.
        if (!cur || (s.phase !== 'QUESTION_CLOSED' && s.phase !== 'REVEAL' && s.phase !== 'GRADING')) throw bad('Close the current question first')
        const pics = s.pictures ?? []
        const target = roundParam ?? s.activePicture ?? pics.find((x) => !x.revealed)?.roundIndex
        const p = pics.find((x) => x.roundIndex === target && !x.revealed)
        if (!p) throw bad('No picture round to reveal')
        const scopeFlat = flat.filter((f) => f.roundIndex === p.roundIndex)
        const skipSet = new Set(s.skipped ?? [])
        const pendingPic = await this.prepareGrading(quizId, scopeFlat, skipSet)
        const closedPics = pics.map((x) => (x === p ? { ...x, closed: true } : x))
        if (pendingPic > 0) {
          if (s.phase !== 'GRADING') {
            ns = { ...s, phase: 'GRADING', activePicture: p.roundIndex, revealScope: null, pictures: closedPics }
            break
          }
          if (!force) throw bad(`${pendingPic} answer(s) still need grading`)
          await this.prisma.grade.updateMany({ where: { quizId, verdict: null, questionId: { in: scopeFlat.map((f) => f.q.id) } }, data: { verdict: false, source: 'DEFAULT', gradedAt: new Date() } })
        }
        const revealedNow = new Set(await this.revealedIds(quizId))
        for (const f of scopeFlat) revealedNow.add(f.q.id)
        await this.redis.setJson(revealedKey(quizId), [...revealedNow])
        mailAfter = () => this.mailRound(quizId, p.roundIndex)
        // Back to where the main flow was, so the interrupted question can still be revealed afterwards.
        const back = (await this.revealedIds(quizId)).includes(cur.q.id) ? 'REVEAL' : 'QUESTION_CLOSED'
        ns = { ...s, phase: back, revealScope: 'picture', activePicture: p.roundIndex, pictures: pics.map((x) => (x === p ? { ...x, closed: true, revealed: true } : x)) }
        break
      }
      case 'reopen': {
        // Only before the answer was revealed: after that, scores are already visible to players.
        if (!cur || s.phase !== 'QUESTION_CLOSED') throw bad('Only a closed question can be reopened')
        if ((await this.revealedIds(quizId)).includes(cur.q.id)) throw bad('This question was already revealed')
        await this.prisma.grade.deleteMany({ where: { quizId, questionId: cur.q.id } }) // answers can change again: judge afresh
        ns = { ...open(cur, s), skipped: (s.skipped ?? []).filter((x) => x !== cur.q.id) }
        break
      }
      case 'skip': {
        if (!cur || (s.phase !== 'QUESTION_OPEN' && s.phase !== 'QUESTION_CLOSED')) throw bad('No question to skip')
        // A skipped question never counts, so power-ups spent on it are refunded.
        await this.prisma.powerUpUse.deleteMany({ where: { quizId, questionId: cur.q.id } })
        ns = {
          ...s,
          phase: 'QUESTION_CLOSED',
          closedAt: s.closedAt ?? now,
          deadline: null,
          skipped: [...new Set([...(s.skipped ?? []), cur.q.id])],
        }
        break
      }
      case 'standings':
        ns = { ...s, showStandings: !s.showStandings }
        break
      case 'break': {
        if (s.phase !== 'QUESTION_CLOSED' && s.phase !== 'REVEAL') throw bad('A break can only start between questions')
        ns = { ...s, phase: 'BREAK', pausedFrom: s.phase }
        break
      }
      case 'pause': {
        if (s.phase === 'LOBBY' || s.phase === 'FINISHED' || s.phase === 'PAUSED' || s.phase === 'BREAK') throw bad('Cannot pause now')
        ns = {
          ...s,
          phase: 'PAUSED',
          pausedFrom: s.phase,
          remainingMs: s.phase === 'QUESTION_OPEN' && s.deadline ? Math.max(0, s.deadline - now) : null,
          deadline: null,
        }
        break
      }
      case 'resume': {
        if ((s.phase !== 'PAUSED' && s.phase !== 'BREAK') || !s.pausedFrom) throw bad('Nothing to resume')
        const back = s.pausedFrom
        ns = {
          ...s,
          phase: back,
          pausedFrom: null,
          deadline: back === 'QUESTION_OPEN' ? now + (s.remainingMs ?? 0) : null,
          remainingMs: null,
        }
        break
      }
      case 'end': {
        if (s.phase === 'LOBBY' || s.phase === 'FINISHED') throw bad('Quiz is not running')
        await this.prisma.quiz.update({ where: { id: quizId }, data: { status: 'FINISHED', finishedAt: new Date() } })
        await this.redis.setJson(revealedKey(quizId), flat.map((f) => f.q.id))
        await this.prisma.grade.updateMany({ where: { quizId, verdict: null }, data: { verdict: false, source: 'DEFAULT', gradedAt: new Date() } })
        mailAfter = () => this.mailFinal(quizId)
        ns = { ...s, phase: 'FINISHED', deadline: null, remainingMs: null, showStandings: true, revealScope: null, closedAt: s.closedAt ?? now }
        break
      }
      default:
        throw bad('Unknown action')
    }
    this.audit(quizId, actorId, `host:${action}`, { force })
    const saved = await this.save(quizId, ns)
    this.schedule(quizId, saved.phase === 'QUESTION_OPEN' ? saved.deadline : null)
    if (mailAfter) void mailAfter().catch((e) => console.error('result mail failed', e))
    return saved
  }

  /** Correct a wrong answer key after the fact (spec §15). Scores are computed on demand, so they follow automatically. */
  async overrideCorrect(quizId: string, actorId: string, b: { questionId: string; correct: string[]; reason: string }) {
    const quiz = await this.quiz(quizId)
    const f = flatten(quiz).find((x) => x.q.id === b?.questionId)
    if (!f) throw new NotFoundException('Question not found')
    if (f.q.type !== 'MC' && f.q.type !== 'MULTI') throw new BadRequestException('Open answers use the grade override; music scores follow the accepted answers')
    const s = await this.state(quizId)
    if (s.phase === 'LOBBY') throw new BadRequestException('Quiz has not started')
    const reason = String(b.reason ?? '').trim()
    if (reason.length < 3) throw new BadRequestException('A reason is required (it is logged)')
    const ids = (f.q.options as unknown as { id: string }[]).map((o) => o.id)
    const correct = [...new Set(b.correct ?? [])]
    if (!correct.length || correct.some((c) => !ids.includes(c))) throw new BadRequestException('Choose valid correct options')
    if (f.q.type === 'MC' && correct.length !== 1) throw new BadRequestException('Multiple choice has exactly one correct option')
    const before = f.q.correct as unknown as string[]
    await this.prisma.question.update({ where: { id: f.q.id }, data: { correct } })
    this.audit(quizId, actorId, 'host:override', { questionId: f.q.id, before, after: correct, reason })
    await this.save(quizId, s) // bump version so every client refetches
    return { ok: true }
  }

  // ---------- answers ----------

  async submitAnswer(quizId: string, userId: string, body: { questionId: string; selected: string[]; answeredAt?: number }) {
    const part = await this.prisma.participation.findUnique({ where: { quizId_userId: { quizId, userId } } })
    if (!part) throw new ForbiddenException('Join the quiz first')
    const s = await this.state(quizId)
    const now = Date.now()
    // A picture round question can be answered at any time while its sheet is open (not only when it is the current question).
    const flat0 = flatten(await this.quiz(quizId))
    const pic = flat0.find((x) => x.q.id === body.questionId && x.round.kind === 'PICTURE')
    let isPicture = false
    if (pic) {
      const p = (s.pictures ?? []).find((x) => x.roundIndex === pic.roundIndex)
      if (!p) throw new BadRequestException('This picture round has not started yet')
      if (p.closed || p.revealed) throw new BadRequestException('This picture round is closed')
      if (s.phase === 'LOBBY' || s.phase === 'FINISHED') throw new BadRequestException('Not available now')
      isPicture = true
    } else if (s.questionId !== body.questionId) throw new BadRequestException('That question is not current')
    if (s.phase === 'PAUSED') throw new BadRequestException('The quiz is paused')

    let acceptedAt = now
    if (isPicture || s.phase === 'QUESTION_OPEN') {
      // normal path
    } else if (
      // Extra Time: the timer ran out (the host did not close it) but this owner still has its 15 extra seconds.
      s.phase === 'QUESTION_CLOSED' &&
      s.timedOut &&
      s.closedAt &&
      now <= s.closedAt + EXTRA_TIME_MS &&
      (await this.prisma.powerUpUse.count({ where: { ownerKey: this.ownerKey(part), questionId: s.questionId!, type: 'EXTRA_TIME' } })) > 0
    ) {
      acceptedAt = now
    } else if (
      s.phase === 'QUESTION_CLOSED' &&
      s.closedAt &&
      now - s.closedAt <= GRACE_PERIOD_MS &&
      typeof body.answeredAt === 'number' &&
      body.answeredAt <= s.closedAt
    ) {
      // 60s reconnect grace (spec §15): the answer was given before close but delivered late.
      acceptedAt = Math.max(body.answeredAt, s.openedAt ?? 0)
    } else {
      throw new BadRequestException('This question is closed')
    }

    const quiz = await this.quiz(quizId)
    const f = flatten(quiz).find((x) => x.q.id === body.questionId)
    if (!f) throw new NotFoundException('Question not found')
    let sel: string[]
    if (f.q.type === 'MUSIC') {
      // Positional [artist, title, year]; each part is optional but at least one must be filled.
      const [artist = '', title = '', yearRaw = ''] = (body.selected ?? []).slice(0, 3).map((x) => String(x ?? '').trim().slice(0, 100))
      const year = yearRaw.replace(/\D/g, '').slice(0, 4)
      if (!artist && !title && !year) throw new BadRequestException('Type an answer')
      sel = [artist, title, year]
    } else if (f.q.type === 'OPEN') {
      const text = String(body.selected?.[0] ?? '').trim().slice(0, 200)
      if (!text) throw new BadRequestException('Type an answer')
      sel = [text]
    } else {
      const ids = (f.q.options as unknown as { id: string }[]).map((o) => o.id)
      sel = [...new Set(body.selected ?? [])]
      if (sel.some((x) => !ids.includes(x))) throw new BadRequestException('Unknown option')
      if (f.q.type === 'MC' && sel.length > 1) throw new BadRequestException('Select exactly one option')
      if (sel.length && (await this.prisma.powerUpUse.count({ where: { ownerKey: this.ownerKey(part), questionId: f.q.id, type: 'FIFTY' } })) > 0) {
        const hidden = fiftyFiftyHidden(ids, (f.q.correct as unknown as string[])[0], `${this.ownerKey(part)}:${f.q.id}`)
        if (sel.some((x) => hidden.includes(x))) throw new BadRequestException('That option was removed by 50/50')
      }
      if (sel.length === 0) throw new BadRequestException('Select at least one option')
    }

    const submittedAt = new Date(acceptedAt)
    const prev = await this.prisma.answer.findUnique({ where: { participationId_questionId: { participationId: part.id, questionId: f.q.id } } })
    // An older delayed submission never overwrites a newer final answer.
    if (prev && prev.submittedAt.getTime() > acceptedAt) return { ok: true, selected: prev.selected as unknown as string[] }
    await this.prisma.answer.upsert({
      where: { participationId_questionId: { participationId: part.id, questionId: f.q.id } },
      create: { participationId: part.id, questionId: f.q.id, selected: sel, submittedAt },
      update: { selected: sel, submittedAt },
    })
    this.audit(quizId, userId, 'answer', { questionId: f.q.id, selected: sel, late: s.phase !== 'QUESTION_OPEN' })
    if (isPicture) this.gateway.emitHostRefresh(quizId)
    else this.gateway.emitAnswered(quizId, await this.prisma.answer.count({ where: { questionId: f.q.id } }))
    return { ok: true, selected: sel }
  }

  // ---------- peer review of open answers (spec §7) ----------

  /**
   * Creates Grade rows for open questions in scope (idempotent). Exact matches with an accepted answer are
   * auto-accepted; the rest get a random grader (a team, or a player in an individual quiz) who is never the author.
   * Returns how many grades are still pending.
   */
  private async prepareGrading(quizId: string, scope: Flat[], skip: Set<string>): Promise<number> {
    const openQs = scope.filter((f) => f.q.type === 'OPEN' && !skip.has(f.q.id))
    if (!openQs.length) return 0
    const qids = openQs.map((f) => f.q.id)
    const parts = await this.prisma.participation.findMany({ where: { quizId } })
    const answers = await this.prisma.answer.findMany({ where: { questionId: { in: qids }, participation: { quizId } } })
    const existing = new Set((await this.prisma.grade.findMany({ where: { quizId, questionId: { in: qids } }, select: { questionId: true, gradeeKey: true } })).map((g) => `${g.questionId}:${g.gradeeKey}`))
    const pool = [...new Set(parts.map((p) => p.teamId ?? p.id))]
    const now = new Date()
    const rows: Prisma.GradeCreateManyInput[] = []
    for (const f of openQs) {
      const accepted = f.q.correct as unknown as string[]
      const votes = new Map<string, { text: string; submittedAt: number }[]>()
      for (const p of parts) {
        const a = answers.find((x) => x.questionId === f.q.id && x.participationId === p.id)
        const text = ((a?.selected as unknown as string[]) ?? [])[0]
        if (!text) continue
        const key = p.teamId ?? p.id
        votes.set(key, [...(votes.get(key) ?? []), { text, submittedAt: a!.submittedAt.getTime() }])
      }
      const fresh: { key: string; text: string }[] = []
      for (const [key, v] of votes) {
        const text = resolveTeamOpen(v)
        if (text && !existing.has(`${f.q.id}:${key}`)) fresh.push({ key, text })
      }
      const needPeer = fresh.filter((x) => !autoGradeOpen(accepted, x.text))
      const graders = assignGraders(needPeer.map((x) => x.key), pool)
      for (const x of fresh) {
        const auto = autoGradeOpen(accepted, x.text)
        rows.push({
          questionId: f.q.id, quizId, gradeeKey: x.key, answer: x.text,
          graderKey: auto ? null : graders.get(x.key) ?? null,
          verdict: auto ? true : null, source: auto ? 'AUTO' : 'PEER', gradedAt: auto ? now : null,
        })
      }
    }
    if (rows.length) await this.prisma.grade.createMany({ data: rows, skipDuplicates: true })
    return this.prisma.grade.count({ where: { quizId, questionId: { in: qids }, verdict: null } })
  }

  async submitGrade(quizId: string, userId: string, gradeId: string, verdict: boolean) {
    const part = await this.prisma.participation.findUnique({ where: { quizId_userId: { quizId, userId } } })
    if (!part) throw new ForbiddenException('Join the quiz first')
    const s = await this.state(quizId)
    if (s.phase !== 'GRADING') throw new BadRequestException('Grading is not open')
    const g = await this.prisma.grade.findFirst({ where: { id: gradeId, quizId } })
    if (!g || g.graderKey !== (part.teamId ?? part.id)) throw new ForbiddenException('This answer is not assigned to you')
    if (g.source === 'HOST') return { ok: true } // the quizmaster already decided
    await this.prisma.grade.update({ where: { id: g.id }, data: { verdict: !!verdict, source: 'PEER', gradedAt: new Date() } })
    this.audit(quizId, userId, 'grade', { gradeId, verdict: !!verdict })
    this.gateway.emitChanged(quizId, s.version)
    return { ok: true }
  }

  /** Quizmaster can always correct a grade (spec §7); recorded in the audit log. */
  async hostGrade(quizId: string, actorId: string, gradeId: string, verdict: boolean, reason?: string) {
    const g = await this.prisma.grade.findFirst({ where: { id: gradeId, quizId } })
    if (!g) throw new NotFoundException('Grade not found')
    await this.prisma.grade.update({ where: { id: g.id }, data: { verdict: !!verdict, source: 'HOST', gradedAt: new Date() } })
    this.audit(quizId, actorId, 'host:grade', { gradeId, before: g.verdict, after: !!verdict, reason: reason ?? null })
    this.gateway.emitChanged(quizId, (await this.state(quizId)).version)
    return { ok: true }
  }

  // ---------- e-mail (opt-in) ----------

  async setEmailPref(quizId: string, userId: string, enabled: boolean) {
    const part = await this.prisma.participation.findUnique({ where: { quizId_userId: { quizId, userId } }, include: { user: true } })
    if (!part) throw new ForbiddenException('Join the quiz first')
    if (enabled && (part.user.isGuest || !part.user.email)) throw new BadRequestException('You need an account with an e-mail address to receive results')
    await this.prisma.participation.update({ where: { id: part.id }, data: { emailResults: !!enabled } })
    return { emailResults: !!enabled }
  }

  private async mailTargets(quizId: string) {
    return this.prisma.participation.findMany({
      where: { quizId, emailResults: true, user: { isGuest: false, email: { not: null } } },
      include: { user: true },
    })
  }

  /** Round results + current standings to everyone who opted in. Deduped per round. */
  private async mailRound(quizId: string, roundIndex: number) {
    if (!this.mail.enabled) return
    const parts = await this.mailTargets(quizId)
    if (!parts.length) return
    const quiz = await this.quiz(quizId)
    const flat = flatten(quiz)
    const skip = new Set((await this.state(quizId)).skipped ?? [])
    const revealed = new Set(await this.revealedIds(quizId))
    const qs = flat.filter((f) => f.roundIndex === roundIndex && revealed.has(f.q.id) && !skip.has(f.q.id))
    if (!qs.length) return
    const round = qs[0].round
    const answers = await this.prisma.answer.findMany({ where: { questionId: { in: qs.map((f) => f.q.id) }, participation: { quizId } }, include: { participation: true } })
    const grades = await this.prisma.grade.findMany({ where: { quizId, questionId: { in: qs.map((f) => f.q.id) } } })
    const st = await this.standings(quizId, '')
    const teamMode = quiz.mode === 'TEAM'
    for (const p of parts) {
      const items: RoundItem[] = qs.map((f) => {
        const opts = f.q.options as unknown as { id: string; text: string }[]
        const texts = (ids: string[] | null) => (ids ? ids.map((i) => opts.find((o) => o.id === i)?.text ?? i) : null)
        const correct = f.q.correct as unknown as string[]
        const qa = answers.filter((a) => a.questionId === f.q.id)
        const mine = (qa.find((a) => a.participationId === p.id)?.selected as unknown as string[]) ?? null
        if (f.q.type === 'MUSIC') {
          const cfg = f.q.config as unknown as MusicConfig
          const max = musicMax(cfg)
          const line = (a: string[] | null) => (a && a.some(Boolean) ? [`${a[0] || '?'} – ${a[1] || '?'}${a[2] ? ` (${a[2]})` : ''}`] : null)
          const teamSel = p.teamId ? resolveTeamMusic(qa.filter((a) => a.participation.teamId === p.teamId).map((a) => ({ selected: a.selected as unknown as string[], submittedAt: a.submittedAt.getTime() }))) : null
          const key = `${cfg.artist[0] ?? '?'} – ${cfg.title[0] ?? '?'}${cfg.year ? ` (${cfg.year})` : ''}`
          const mr = musicScore(cfg, mine)
          return { text: f.q.text, correct: [key], mine: line(mine), myCorrect: mr.points === max && max > 0, team: line(teamSel), teamCorrect: p.teamId ? musicScore(cfg, teamSel).points === max && max > 0 : null }
        }
        if (f.q.type === 'OPEN') {
          const g = grades.find((x) => x.questionId === f.q.id && x.gradeeKey === (p.teamId ?? p.id))
          const ownOk = !p.teamId || (!!mine?.[0] && !!g && normOpen(mine[0]) === normOpen(g.answer))
          return { text: f.q.text, correct, mine, myCorrect: g?.verdict === true && ownOk, team: g ? [g.answer] : null, teamCorrect: p.teamId ? g?.verdict === true : null }
        }
        const team = p.teamId
          ? resolveTeamAnswer(qa.filter((a) => a.participation.teamId === p.teamId).map((a) => ({ selected: a.selected as unknown as string[], submittedAt: a.submittedAt.getTime() })))?.answer ?? null
          : null
        return { text: f.q.text, correct: texts(correct)!, mine: texts(mine), myCorrect: isCorrect(correct, mine), team: texts(team), teamCorrect: p.teamId ? isCorrect(correct, team) : null }
      })
      const rows: BoardRow[] = (teamMode ? st.rows : st.personal).map((r) => ({ rank: r.rank, name: r.name, score: r.score, mine: teamMode ? r.id === p.teamId : r.id === p.id }))
      this.mail.send(p.userId, p.user.email, 'round', round.id, roundMail({ quiz: quiz.title, round: round.title, teamMode, items, rows, siteUrl: process.env.PUBLIC_URL ?? '' }))
    }
  }

  private async mailFinal(quizId: string) {
    if (!this.mail.enabled) return
    const parts = await this.mailTargets(quizId)
    if (!parts.length) return
    const quiz = await this.quiz(quizId)
    const st = await this.standings(quizId, '')
    const teamMode = quiz.mode === 'TEAM'
    for (const p of parts) {
      const rows: BoardRow[] = (teamMode ? st.rows : st.personal).map((r) => ({ rank: r.rank, name: r.name, score: r.score, mine: teamMode ? r.id === p.teamId : r.id === p.id }))
      const myScore = st.personal.find((r) => r.id === p.id)?.score ?? null
      this.mail.send(p.userId, p.user.email, 'final', quizId, finalMail({ quiz: quiz.title, teamMode, rows, myScore, siteUrl: process.env.PUBLIC_URL ?? '' }))
    }
  }

  // ---------- power-ups (spec §8) ----------

  private ownerKey(p: { id: string; teamId: string | null }) {
    return p.teamId ?? p.id
  }

  /** `${ownerKey}:${questionId}` -> the score booster used on that question. */
  private async modifierMap(quizId: string, questionIds: string[]) {
    const rows = await this.prisma.powerUpUse.findMany({ where: { quizId, questionId: { in: questionIds }, type: { in: SCORE_MODIFIERS } } })
    return new Map<string, PowerUpType>(rows.map((r) => [`${r.ownerKey}:${r.questionId}`, r.type as PowerUpType]))
  }

  async usePowerUp(quizId: string, userId: string, type: PowerUpType) {
    const part = await this.prisma.participation.findUnique({ where: { quizId_userId: { quizId, userId } } })
    if (!part) throw new ForbiddenException('Join the quiz first')
    const quiz = await this.quiz(quizId)
    const s = await this.state(quizId)
    const f = flatten(quiz).find((x) => x.q.id === s.questionId)
    if (!f || s.phase !== 'QUESTION_OPEN') throw new BadRequestException('Power-ups can only be used while a question is open')
    const owner = this.ownerKey(part)
    const mine = await this.prisma.powerUpUse.findMany({ where: { ownerKey: owner, quizId } })
    const err = cannotUse({
      type,
      settings: normaliseSettings(quiz.powerUps),
      questionType: f.q.type,
      optionCount: (f.q.options as unknown as unknown[]).length,
      hasHint: !!f.q.hint,
      usedOnQuestion: mine.filter((m) => m.questionId === f.q.id).map((m) => m.type as PowerUpType),
      usedTotal: mine.filter((m) => m.type === type).length,
    })
    if (err) throw new BadRequestException(err)
    try {
      await this.prisma.powerUpUse.create({ data: { quizId, ownerKey: owner, actorId: part.id, questionId: f.q.id, type } })
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') throw new BadRequestException('Already used on this question')
      throw e
    }
    this.audit(quizId, userId, 'powerup', { type, questionId: f.q.id, owner })
    this.gateway.emitHostRefresh(quizId)
    return { ok: true }
  }

  private async powerUpsView(quiz: FullQuiz, flat: Flat[], s: LiveState, part: { id: string; teamId: string | null } | null): Promise<PlayerPowerUps | null> {
    const settings = normaliseSettings(quiz.powerUps)
    if (!settings || !part) return null
    const owner = this.ownerKey(part)
    const f = flat.find((x) => x.q.id === s.questionId)
    const mine = await this.prisma.powerUpUse.findMany({ where: { ownerKey: owner, quizId: quiz.id } })
    const usedOnQuestion = (f ? mine.filter((m) => m.questionId === f.q.id).map((m) => m.type as PowerUpType) : [])
    const remaining: Record<string, number> = {}
    const canUse: Record<string, boolean> = {}
    for (const t of settings.types) {
      const usedTotal = mine.filter((m) => m.type === t).length
      remaining[t] = Math.max(0, settings.uses - usedTotal)
      canUse[t] = !!f && s.phase === 'QUESTION_OPEN' && !cannotUse({ type: t, settings, questionType: f.q.type, optionCount: (f.q.options as unknown as unknown[]).length, hasHint: !!f.q.hint, usedOnQuestion, usedTotal })
    }
    let hidden: string[] = []
    if (f && usedOnQuestion.includes('FIFTY')) {
      const ids = (f.q.options as unknown as { id: string }[]).map((o) => o.id)
      hidden = fiftyFiftyHidden(ids, (f.q.correct as unknown as string[])[0], `${owner}:${f.q.id}`)
    }
    let extraUntil: number | null = null
    if (f && usedOnQuestion.includes('EXTRA_TIME')) {
      if (s.phase === 'QUESTION_OPEN' && s.deadline) extraUntil = s.deadline + EXTRA_TIME_MS
      else if (s.phase === 'QUESTION_CLOSED' && s.timedOut && s.closedAt && Date.now() <= s.closedAt + EXTRA_TIME_MS) extraUntil = s.closedAt + EXTRA_TIME_MS
    }
    return {
      owner: quiz.mode === 'TEAM' && part.teamId ? 'TEAM' : 'PLAYER',
      types: settings.types,
      remaining,
      usedOnQuestion,
      canUse,
      hidden,
      hint: f && usedOnQuestion.includes('HINT') ? f.q.hint : null,
      extraUntil,
    }
  }

  // ---------- views ----------

  private async teamsDto(quizId: string): Promise<{ teams: TeamDto[]; participants: number; unteamed: number }> {
    const teams = await this.prisma.team.findMany({
      where: { quizId },
      orderBy: { createdAt: 'asc' },
      include: { participations: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
    })
    const participants = await this.prisma.participation.count({ where: { quizId } })
    const inTeams = teams.reduce((n, t) => n + t.participations.length, 0)
    return {
      participants,
      unteamed: participants - inTeams,
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        members: t.participations.map((p) => ({ participationId: p.id, name: p.user.name, avatar: p.user.avatar })),
      })),
    }
  }

  async playerView(quizId: string, userId: string, asHost = false): Promise<PlayerLiveView> {
    const quiz = await this.quiz(quizId)
    const flat = flatten(quiz)
    const s = await this.state(quizId)
    const part = await this.prisma.participation.findUnique({ where: { quizId_userId: { quizId, userId } } })
    if (!part && !asHost) throw new ForbiddenException('Join the quiz first')

    const cur = flat.find((f) => f.q.id === s.questionId)
    const revealedIds = new Set(await this.revealedIds(quizId))
    const curRevealed = cur && revealedIds.has(cur.q.id)
    const question = cur ? toQuestionDto(cur.q, asHost || !!curRevealed) : null

    let revealed: RevealedQuestion[] = []
    if (s.revealScope && cur) {
      const skip = new Set(s.skipped ?? [])
      const scoped = flat.filter(
        (f) =>
          !skip.has(f.q.id) &&
          (s.revealScope === 'picture'
            ? f.roundIndex === s.activePicture && revealedIds.has(f.q.id)
            : s.revealScope === 'round' ? f.roundIndex === cur.roundIndex && revealedIds.has(f.q.id) : f.q.id === cur.q.id),
      )
      const answers = await this.prisma.answer.findMany({
        where: { questionId: { in: scoped.map((f) => f.q.id) }, participation: { quizId } },
        include: { participation: true },
      })
      const grades = await this.prisma.grade.findMany({ where: { quizId, questionId: { in: scoped.map((f) => f.q.id) } } })
      revealed = scoped.map((f) => {
        const correct = f.q.correct as unknown as string[]
        const qa = answers.filter((a) => a.questionId === f.q.id)
        const mine = qa.find((a) => a.participationId === part?.id)
        const mySel = (mine?.selected as unknown as string[]) ?? null
        if (f.q.type === 'MUSIC') {
          const cfg = f.q.config as unknown as MusicConfig
          const max = musicMax(cfg)
          const mine = part ? musicScore(cfg, mySel) : null
          const teamSel = part?.teamId
            ? resolveTeamMusic(qa.filter((a) => a.participation.teamId === part.teamId).map((a) => ({ selected: a.selected as unknown as string[], submittedAt: a.submittedAt.getTime() })))
            : null
          const team = part?.teamId ? musicScore(cfg, teamSel) : null
          return {
            question: toQuestionDto(f.q, true),
            myAnswer: mySel,
            myCorrect: mine ? mine.points === max && max > 0 : null,
            teamAnswer: teamSel,
            teamCorrect: team ? team.points === max && max > 0 : null,
            histogram: {},
            musicResult: { mine, team, max },
          }
        }
        if (f.q.type === 'OPEN') {
          const g = part ? grades.find((x) => x.questionId === f.q.id && x.gradeeKey === (part.teamId ?? part.id)) : undefined
          const ownOk = !part?.teamId || (!!mySel?.[0] && !!g && normOpen(mySel[0]) === normOpen(g.answer))
          return {
            question: toQuestionDto(f.q, true),
            myAnswer: mySel,
            myCorrect: part ? g?.verdict === true && ownOk : null,
            teamAnswer: g ? [g.answer] : null,
            teamCorrect: part?.teamId ? g?.verdict === true : null,
            histogram: {},
          }
        }
        let teamAnswer: string[] | null = null
        if (part?.teamId) {
          const votes = qa
            .filter((a) => a.participation.teamId === part.teamId)
            .map((a) => ({ selected: a.selected as unknown as string[], submittedAt: a.submittedAt.getTime() }))
          teamAnswer = resolveTeamAnswer(votes)?.answer ?? null
        }
        const histogram: Record<string, number> = {}
        for (const a of qa) for (const o of a.selected as unknown as string[]) histogram[o] = (histogram[o] ?? 0) + 1
        return {
          question: toQuestionDto(f.q, true),
          myAnswer: mySel,
          myCorrect: part ? isCorrect(correct, mySel) : null,
          teamAnswer,
          teamCorrect: part?.teamId ? isCorrect(correct, teamAnswer) : null,
          histogram,
        }
      })
    }

    // Which booster did I / my team use on each revealed question, and what did it end up scoring?
    if (revealed.length && part) {
      const mods = await this.modifierMap(quizId, revealed.map((r) => r.question.id))
      for (const r of revealed) {
        const type = mods.get(`${this.ownerKey(part)}:${r.question.id}`)
        if (!type) continue
        const teamed = !!part.teamId
        const base =
          r.question.type === 'MUSIC'
            ? ((teamed ? r.musicResult?.team : r.musicResult?.mine)?.points ?? 0)
            : (teamed ? r.teamCorrect : r.myCorrect) ? r.question.points : 0
        r.powerUp = { type, earned: modScore(base, r.question.points, type, teamed ? r.teamAnswer !== null : r.myAnswer !== null) }
      }
    }

    let myAnswer: string[] | null = null
    if (cur && part) {
      const a = await this.prisma.answer.findUnique({ where: { participationId_questionId: { participationId: part.id, questionId: cur.q.id } } })
      myAnswer = (a?.selected as unknown as string[]) ?? null
    }

    // Picture rounds that are open (or closed but not yet revealed): all questions at once, answerable until they close.
    const pictures: PictureRoundView[] = []
    for (const p of (s.pictures ?? []).filter((x) => !x.revealed)) {
      const qs = flat.filter((f) => f.roundIndex === p.roundIndex)
      const mine = part ? await this.prisma.answer.findMany({ where: { participationId: part.id, questionId: { in: qs.map((f) => f.q.id) } } }) : []
      pictures.push({
        roundIndex: p.roundIndex,
        title: qs[0]?.round.title ?? '',
        closesAfterRound: p.untilRoundIndex + 1,
        closed: p.closed,
        questions: qs.map((f) => toQuestionDto(f.q, asHost)),
        answers: Object.fromEntries(mine.map((a) => [a.questionId, a.selected as unknown as string[]])),
      })
    }

    // Answers this player (or their team) must judge while the host waits for peer review.
    let grading: GradeItem[] | null = null
    if (s.phase === 'GRADING' && part) {
      const mine = await this.prisma.grade.findMany({ where: { quizId, graderKey: part.teamId ?? part.id, source: { not: 'HOST' } }, orderBy: { createdAt: 'asc' } })
      grading = mine.map((g) => {
        const f = flat.find((x) => x.q.id === g.questionId)
        return { id: g.id, question: f?.q.text ?? '', reference: (f?.q.correct as unknown as string[]) ?? [], answer: g.answer, verdict: g.verdict }
      })
    }

    const t = await this.teamsDto(quizId)
    const rounds = [...quiz.rounds].sort((a, b) => a.number - b.number)
    return {
      grading,
      pictures,
      quiz: {
        ...toSummary(quiz, flat.length),
        hasOpenQuestions: flat.some((f) => f.q.type === 'OPEN'),
        rounds: rounds.map((r) => ({ number: r.number, title: r.title, category: r.category, questionCount: r.questions.length, kind: r.kind, openRounds: r.openRounds })),
      },
      live: s,
      serverNow: Date.now(),
      question,
      revealed,
      myAnswer,
      me: part ? { participationId: part.id, teamId: part.teamId, emailResults: part.emailResults } : null,
      powerUps: await this.powerUpsView(quiz, flat, s, part),
      ...t,
    }
  }

  async hostView(quizId: string, userId: string): Promise<HostLiveView> {
    const base = await this.playerView(quizId, userId, true)
    const quiz = await this.quiz(quizId)
    const answered = base.live.questionId ? await this.prisma.answer.count({ where: { questionId: base.live.questionId } }) : 0
    const flatQ = flatten(quiz).find((f) => f.q.id === base.live.questionId)
    return {
      ...base,
      answered,
      online: this.presence.online(quizId),
      currentCorrect: flatQ ? (flatQ.q.correct as unknown as string[]) : null,
      teamsTooSmall: await this.teamWarnings(quiz),
      gradingAdmin: await this.gradingAdmin(quizId, quiz, base.live),
      powerUpsUsed: await this.powerUpsUsed(quizId, base.live.questionId),
      pictureProgress: await this.pictureProgress(quizId, base.pictures.map((p) => p.questions.map((q) => q.id)).flat()),
    }
  }

  private async pictureProgress(quizId: string, questionIds: string[]): Promise<Record<string, number> | null> {
    if (!questionIds.length) return null
    const rows = await this.prisma.answer.groupBy({ by: ['questionId'], where: { questionId: { in: questionIds }, participation: { quizId } }, _count: true })
    return Object.fromEntries(rows.map((r) => [r.questionId, r._count]))
  }

  private async powerUpsUsed(quizId: string, questionId: string | null): Promise<Record<string, number> | null> {
    if (!questionId) return null
    const rows = await this.prisma.powerUpUse.findMany({ where: { quizId, questionId } })
    if (!rows.length) return null
    return rows.reduce<Record<string, number>>((m, r) => ((m[r.type] = (m[r.type] ?? 0) + 1), m), {})
  }

  private async gradingAdmin(quizId: string, quiz: FullQuiz, live: LiveState): Promise<GradeAdminRow[] | null> {
    if (!flatten(quiz).some((f) => f.q.type === 'OPEN')) return null
    const flat = flatten(quiz)
    const cur = flat.find((f) => f.q.id === live.questionId)
    if (!cur) return null
    // The quizmaster can check open answers as soon as the question is closed (idempotent; peers still judge the rest at the end of the round).
    if (live.phase === 'QUESTION_CLOSED' && cur.q.type === 'OPEN' && !(live.skipped ?? []).includes(cur.q.id)) await this.prepareGrading(quizId, [cur], new Set(live.skipped ?? []))
    const ri = live.revealScope === 'picture' || (live.phase === 'GRADING' && live.activePicture != null) ? live.activePicture ?? cur.roundIndex : cur.roundIndex
    const qids = flat.filter((f) => f.roundIndex === ri && f.q.type === 'OPEN').map((f) => f.q.id)
    const grades = await this.prisma.grade.findMany({ where: { quizId, questionId: { in: qids } }, orderBy: { createdAt: 'asc' } })
    if (!grades.length) return null
    const parts = await this.prisma.participation.findMany({ where: { quizId }, include: { user: true, team: true } })
    const label = (key: string | null) => {
      if (!key) return null
      const p = parts.find((x) => x.id === key)
      if (p) return p.user.name
      return parts.find((x) => x.teamId === key)?.team?.name ?? null
    }
    return grades.map((g) => ({
      id: g.id,
      question: flat.find((f) => f.q.id === g.questionId)?.q.text ?? '',
      answer: g.answer,
      gradee: label(g.gradeeKey) ?? '?',
      grader: label(g.graderKey),
      verdict: g.verdict,
      source: g.source,
    }))
  }

  /** Standings count only revealed questions, so no one learns results early (spec §6). */
  async standings(quizId: string, userId: string, asHost = false): Promise<StandingsDto> {
    const quiz = await this.quiz(quizId)
    const flat = flatten(quiz)
    const revealed = new Set(await this.revealedIds(quizId))
    const skippedIds = new Set((await this.state(quizId)).skipped ?? [])
    const qs = flat.filter((f) => revealed.has(f.q.id) && !skippedIds.has(f.q.id))
    const parts = await this.prisma.participation.findMany({ where: { quizId }, include: { user: true } })
    const answers = await this.prisma.answer.findMany({ where: { questionId: { in: qs.map((f) => f.q.id) }, participation: { quizId } } })
    const myPart = parts.find((p) => p.userId === userId)
    void asHost

    const personalScores = new Map<string, number>()
    for (const p of parts) personalScores.set(p.id, 0)
    const teamScores = new Map<string, number>()
    const teamIds = new Set(parts.map((p) => p.teamId).filter((x): x is string => !!x))
    for (const t of teamIds) teamScores.set(t, 0)

    const gradeRows = await this.prisma.grade.findMany({ where: { quizId, questionId: { in: qs.map((f) => f.q.id) } } })
    const gmap = new Map(gradeRows.map((g) => [`${g.questionId}:${g.gradeeKey}`, g]))

    const mods = await this.modifierMap(quizId, qs.map((f) => f.q.id))
    const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v)
    const teamOf = (pid: string) => parts.find((p) => p.id === pid)?.teamId ?? null

    for (const f of qs) {
      const correct = f.q.correct as unknown as string[]
      const qa = answers.filter((a) => a.questionId === f.q.id)
      const cfg = f.q.config as unknown as MusicConfig
      const answerOf = (pid: string) => qa.find((a) => a.participationId === pid)
      // Base points (before any power-up) for one participation / one team.
      const personalBase = (p: { id: string; teamId: string | null }) => {
        const a = answerOf(p.id)
        if (!a) return 0
        const sel = a.selected as unknown as string[]
        if (f.q.type === 'OPEN') {
          // Peer-reviewed: judged once per team; a teammate scores personally only if their own answer is the judged one.
          const g = gmap.get(`${f.q.id}:${p.teamId ?? p.id}`)
          return g?.verdict === true && (!p.teamId || normOpen(sel[0] ?? '') === normOpen(g.answer)) ? f.q.points : 0
        }
        if (f.q.type === 'MUSIC') return musicScore(cfg, sel).points // independent parts, fractional points
        return isCorrect(correct, sel) ? f.q.points : 0
      }
      const teamBase = (t: string) => {
        if (f.q.type === 'OPEN') return gmap.get(`${f.q.id}:${t}`)?.verdict === true ? f.q.points : 0
        const votes = qa.filter((a) => teamOf(a.participationId) === t).map((a) => ({ selected: a.selected as unknown as string[], submittedAt: a.submittedAt.getTime() }))
        if (f.q.type === 'MUSIC') return musicScore(cfg, resolveTeamMusic(votes)).points
        const res = resolveTeamAnswer(votes)
        return res && isCorrect(correct, res.answer) ? f.q.points : 0
      }
      // Power-ups: pooled per team in team quizzes (they change the team score), personal in individual quizzes.
      for (const p of parts) {
        const mod = p.teamId ? null : mods.get(`${p.id}:${f.q.id}`) ?? null
        add(personalScores, p.id, modScore(personalBase(p), f.q.points, mod, !!answerOf(p.id)))
      }
      for (const t of teamIds) {
        const answered = qa.some((a) => teamOf(a.participationId) === t)
        add(teamScores, t, modScore(teamBase(t), f.q.points, mods.get(`${t}:${f.q.id}`) ?? null, answered))
      }
    }

    const personal: StandingRow[] = rankRows(
      parts.map((p) => ({ id: p.id, name: p.user.name, score: personalScores.get(p.id) ?? 0, isMine: p.userId === userId })),
    )
    let rows = personal
    if (quiz.mode === 'TEAM') {
      const teams = await this.prisma.team.findMany({ where: { quizId } })
      rows = rankRows(
        teams.map((t) => ({ id: t.id, name: t.name, score: teamScores.get(t.id) ?? 0, isMine: t.id === myPart?.teamId })),
      )
    }
    return { mode: quiz.mode, rows, personal, gradedQuestions: qs.length }
  }
}
