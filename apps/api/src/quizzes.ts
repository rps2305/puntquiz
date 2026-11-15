import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import { Prisma } from '@prisma/client'
import type { Quiz, Round, Question } from '@prisma/client'
import type { MediaDto, MusicConfigDto, OptionDto, QuestionDto, QuizDetailDto, QuizSummaryDto, RoundDto } from '@puntquiz/contracts'
import { AuthedRequest, HostGuard } from './auth'
import { MediaItem, embedUrl, validateMedia } from './media'
import { musicMax, normaliseMusic, validateMusic } from './music'
import { normaliseSettings } from './powerups'
import { PrismaService } from './prisma.service'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I

function newCode() {
  let s = ''
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return s
}

export type FullQuiz = Quiz & { rounds: (Round & { questions: Question[] })[] }

/** Players only get media flagged for phones; the quizmaster (and everyone after reveal) gets all of it. */
export function toMediaDtos(raw: unknown, all: boolean): MediaDto[] {
  const items = (Array.isArray(raw) ? raw : []) as MediaItem[]
  return items
    .filter((m) => all || m.players)
    .map((m) => ({ ...m, src: m.kind === 'youtube' ? embedUrl(m) : m.assetId ? `/api/media/${m.assetId}` : m.url! }))
}

export function toQuestionDto(q: Question, withCorrect: boolean): QuestionDto {
  return {
    id: q.id,
    number: q.number,
    text: q.text,
    type: q.type,
    options: q.options as unknown as OptionDto[],
    points: q.points,
    seconds: q.seconds,
    explanation: withCorrect ? q.explanation : undefined,
    bankQuestionId: withCorrect ? q.bankQuestionId : undefined,
    media: toMediaDtos(q.media, withCorrect),
    hint: withCorrect ? q.hint : undefined,
    music: withCorrect && q.type === 'MUSIC' ? (q.config as unknown as MusicConfigDto) : undefined,
    correct: withCorrect ? (q.correct as unknown as string[]) : undefined,
  }
}

export function toSummary(q: Quiz, questionCount: number): QuizSummaryDto {
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    joinCode: q.joinCode,
    mode: q.mode,
    status: q.status,
    revealMode: q.revealMode,
    maxTeamSize: q.maxTeamSize,
    minTeamSize: q.minTeamSize,
    powerUps: normaliseSettings(q.powerUps),
    joinMethod: 'OPEN',
    questionCount,
  }
}

export function toDetail(q: FullQuiz): QuizDetailDto {
  const rounds: RoundDto[] = q.rounds
    .sort((a, b) => a.number - b.number)
    .map((r) => ({
      id: r.id,
      number: r.number,
      title: r.title,
      category: r.category,
      kind: r.kind,
      openRounds: r.openRounds,
      questions: r.questions.sort((a, b) => a.number - b.number).map((x) => toQuestionDto(x, true)),
    }))
  return { ...toSummary(q, rounds.reduce((n, r) => n + r.questions.length, 0)), rounds }
}

interface QuizInput {
  title: string
  description?: string | null
  mode?: 'INDIVIDUAL' | 'TEAM'
  revealMode?: 'ROUND' | 'QUESTION'
  maxTeamSize?: number
  powerUps?: { types?: string[]; uses?: number } | null
  rounds?: {
    title: string
    category?: string | null
    kind?: 'STANDARD' | 'PICTURE'
    openRounds?: number
    questions: {
      text: string
      type?: 'MC' | 'MULTI' | 'OPEN' | 'MUSIC'
      media?: unknown
      hint?: string | null
      config?: Partial<MusicConfigDto> | null
      options: { id: string; text: string }[]
      correct: string[]
      points?: number
      seconds?: number
      explanation?: string | null
      bankQuestionId?: string | null
    }[]
  }[]
}

function validate(input: QuizInput) {
  if (!input.title?.trim()) throw new BadRequestException('Title is required')
  for (const [ri, r] of (input.rounds ?? []).entries()) {
    if (!r.title?.trim()) throw new BadRequestException(`Round ${ri + 1} needs a title`)
    if (r.kind === 'PICTURE') {
      if (ri === (input.rounds ?? []).length - 1) throw new BadRequestException(`Round ${ri + 1}: a picture round stays open during later rounds, so it cannot be the last round`)
      if (!r.questions.length) throw new BadRequestException(`Round ${ri + 1}: a picture round needs at least one question`)
      const n = Number(r.openRounds ?? 1)
      if (!Number.isInteger(n) || n < 1 || n > 3) throw new BadRequestException(`Round ${ri + 1}: a picture round stays open for 1 to 3 following rounds`)
    }
    for (const [qi, q] of r.questions.entries()) {
      const where = `Round ${ri + 1}, question ${qi + 1}`
      if (!q.text?.trim()) throw new BadRequestException(`${where}: text is required`)
      const mv = validateMedia(q.media)
      if ('error' in mv) throw new BadRequestException(`${where}: ${mv.error}`)
      if (q.type === 'MUSIC') {
        const err = validateMusic(q.config)
        if (err) throw new BadRequestException(`${where}: ${err}`)
        if (q.seconds !== undefined && !(q.seconds >= 5 && q.seconds <= 600)) throw new BadRequestException(`${where}: seconds must be between 5 and 600`)
        continue
      }
      if (q.type === 'OPEN') {
        // Open text: `correct` = accepted answers (auto-accepted on exact match, others go to peer review)
        const acc = (q.correct ?? []).map((a) => String(a).trim()).filter(Boolean)
        if (!acc.length || acc.length > 10 || acc.some((a) => a.length > 100)) throw new BadRequestException(`${where}: give 1-10 accepted answers (max 100 characters)`)
        if (q.points !== undefined && !(q.points >= 0)) throw new BadRequestException(`${where}: invalid points`)
        if (q.seconds !== undefined && !(q.seconds >= 5 && q.seconds <= 600)) throw new BadRequestException(`${where}: seconds must be between 5 and 600`)
        continue
      }
      const ids = q.options.map((o) => o.id)
      if (q.options.length < 2 || q.options.some((o) => !o.text?.trim()))
        throw new BadRequestException(`${where}: needs at least 2 non-empty options`)
      if (new Set(ids).size !== ids.length) throw new BadRequestException(`${where}: duplicate option ids`)
      if (!q.correct?.length || q.correct.some((c) => !ids.includes(c)))
        throw new BadRequestException(`${where}: mark at least one correct option`)
      if ((q.type ?? 'MC') === 'MC' && q.correct.length !== 1)
        throw new BadRequestException(`${where}: multiple choice has exactly one correct option`)
      if (q.points !== undefined && !(q.points >= 0)) throw new BadRequestException(`${where}: invalid points`)
      if (q.seconds !== undefined && !(q.seconds >= 5 && q.seconds <= 600))
        throw new BadRequestException(`${where}: seconds must be between 5 and 600`)
    }
  }
}

@Injectable()
export class QuizzesService {
  constructor(readonly prisma: PrismaService) {}

  async full(id: string): Promise<FullQuiz> {
    const q = await this.prisma.quiz.findUnique({
      where: { id },
      include: { rounds: { include: { questions: true } } },
    })
    if (!q) throw new NotFoundException('Quiz not found')
    return q
  }

  async assertHost(id: string, req: AuthedRequest) {
    const q = await this.full(id)
    if (q.hostId !== req.user.id && !req.user.isAdmin) throw new ForbiddenException('Not your quiz')
    return q
  }

  async create(host: string, input: QuizInput) {
    validate(input)
    for (let i = 0; i < 5; i++) {
      try {
        const quiz = await this.prisma.quiz.create({
          data: {
            title: input.title.trim(),
            description: input.description ?? null,
            mode: input.mode ?? 'INDIVIDUAL',
            revealMode: input.revealMode ?? 'ROUND',
            maxTeamSize: Math.min(Math.max(input.maxTeamSize ?? 5, 3), 12),
            powerUps: (normaliseSettings(input.powerUps) ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
            hostId: host,
            joinCode: newCode(),
          },
        })
        await this.replaceContent(quiz.id, input)
        return this.full(quiz.id)
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e // retry on join-code collision only
      }
    }
    throw new BadRequestException('Could not allocate a join code')
  }

  async update(id: string, input: QuizInput) {
    validate(input)
    const q = await this.full(id)
    if (q.status === 'LIVE' || q.status === 'FINISHED')
      throw new BadRequestException('A quiz that has started can no longer be edited')
    await this.prisma.quiz.update({
      where: { id },
      data: {
        title: input.title.trim(),
        description: input.description ?? null,
        mode: input.mode ?? q.mode,
        revealMode: input.revealMode ?? q.revealMode,
        maxTeamSize: Math.min(Math.max(input.maxTeamSize ?? q.maxTeamSize, 3), 12),
        ...('powerUps' in input ? { powerUps: (normaliseSettings(input.powerUps) ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue } : {}),
      },
    })
    if (input.rounds) await this.replaceContent(id, input)
    return this.full(id)
  }

  private async replaceContent(quizId: string, input: QuizInput) {
    const assetIds = (input.rounds ?? []).flatMap((r) => r.questions.flatMap((q) => ((validateMedia(q.media) as { items: MediaItem[] }).items ?? []).map((m) => m.assetId))).filter((x): x is string => !!x)
    if (assetIds.length) {
      const have = new Set((await this.prisma.mediaAsset.findMany({ where: { id: { in: assetIds } }, select: { id: true } })).map((a) => a.id))
      if (assetIds.some((a) => !have.has(a))) throw new BadRequestException('An uploaded media file was not found; upload it again')
    }
    const wanted = (input.rounds ?? []).flatMap((r) => r.questions.map((q) => q.bankQuestionId)).filter((x): x is string => !!x)
    const validBank = new Set((await this.prisma.bankQuestion.findMany({ where: { id: { in: wanted } }, select: { id: true } })).map((b) => b.id))
    await this.prisma.$transaction(async (tx) => {
      await tx.round.deleteMany({ where: { quizId } })
      for (const [ri, r] of (input.rounds ?? []).entries()) {
        const round = await tx.round.create({
          data: { quizId, number: ri + 1, title: r.title.trim(), category: r.category ?? null, kind: r.kind === 'PICTURE' ? 'PICTURE' : 'STANDARD', openRounds: r.kind === 'PICTURE' ? Math.min(3, Math.max(1, Math.round(Number(r.openRounds ?? 1)))) : 0 },
        })
        await tx.question.createMany({
          data: r.questions.map((q, qi) => ({
            bankQuestionId: q.bankQuestionId && validBank.has(q.bankQuestionId) ? q.bankQuestionId : null,
            hint: q.hint?.trim().slice(0, 300) || null,
            media: ((validateMedia(q.media) as { items: MediaItem[] }).items.length ? (validateMedia(q.media) as { items: MediaItem[] }).items : undefined) as unknown as Prisma.InputJsonValue | undefined,
            config: (q.type === 'MUSIC' ? normaliseMusic(q.config ?? {}) : undefined) as unknown as Prisma.InputJsonValue | undefined,
            roundId: round.id,
            number: qi + 1,
            text: q.text.trim(),
            type: q.type ?? 'MC',
            options: (q.type === 'OPEN' || q.type === 'MUSIC' ? [] : q.options.map((o) => ({ id: o.id, text: o.text.trim() }))) as Prisma.InputJsonValue,
            correct: (q.type === 'OPEN' ? q.correct.map((a) => String(a).trim()).filter(Boolean) : q.type === 'MUSIC' ? [] : q.correct) as Prisma.InputJsonValue,
            points: q.type === 'MUSIC' ? musicMax(normaliseMusic(q.config ?? {})) : (q.points ?? 10),
            seconds: q.seconds ?? 30,
            explanation: q.explanation ?? null,
          })),
        })
      }
    })
  }
}

@Controller('quizzes')
@UseGuards(HostGuard)
export class QuizzesController {
  constructor(private quizzes: QuizzesService) {}

  @Get()
  async mine(@Req() req: AuthedRequest) {
    const list = await this.quizzes.prisma.quiz.findMany({
      where: req.user.isAdmin ? {} : { hostId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { rounds: { include: { _count: { select: { questions: true } } } } },
    })
    return list.map((q) => toSummary(q, q.rounds.reduce((n, r) => n + r._count.questions, 0)))
  }

  @Post()
  async create(@Req() req: AuthedRequest, @Body() body: QuizInput) {
    if (req.user.isGuest) throw new ForbiddenException('Create an account to build quizzes')
    return toDetail(await this.quizzes.create(req.user.id, body))
  }

  /** Import a quiz from the export format (JSON backup / scripting, spec §19). */
  @Post('import')
  async importQuiz(@Req() req: AuthedRequest, @Body() body: QuizInput) {
    if (req.user.isGuest) throw new ForbiddenException('Create an account to build quizzes')
    return toDetail(await this.quizzes.create(req.user.id, { ...body, title: body.title }))
  }

  @Get(':id/export')
  async exportQuiz(@Req() req: AuthedRequest, @Param('id') id: string, @Res() res: Response) {
    const q = toDetail(await this.quizzes.assertHost(id, req))
    const out = {
      format: 'puntquiz.quiz.v1',
      title: q.title,
      description: q.description,
      mode: q.mode,
      revealMode: q.revealMode,
      maxTeamSize: q.maxTeamSize,
      powerUps: q.powerUps,
      rounds: q.rounds.map((r) => ({
        title: r.title,
        category: r.category,
        kind: r.kind,
        openRounds: r.openRounds,
        questions: r.questions.map((x) => ({ text: x.text, type: x.type, options: x.options, correct: x.correct, points: x.points, seconds: x.seconds, explanation: x.explanation ?? null, media: x.media?.map(({ src: _s, ...m }) => m), hint: x.hint ?? undefined, config: x.music ?? undefined })),
      })),
    }
    res.setHeader('content-disposition', `attachment; filename="${q.title.replace(/[^\w.-]+/g, '_')}.json"`)
    res.json(out)
  }

  @Get(':id')
  async get(@Req() req: AuthedRequest, @Param('id') id: string) {
    return toDetail(await this.quizzes.assertHost(id, req))
  }

  @Put(':id')
  async update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: QuizInput) {
    await this.quizzes.assertHost(id, req)
    return toDetail(await this.quizzes.update(id, body))
  }

  @Post(':id/publish')
  async publish(@Req() req: AuthedRequest, @Param('id') id: string) {
    const q = await this.quizzes.assertHost(id, req)
    if (q.status !== 'DRAFT' && q.status !== 'SCHEDULED') throw new BadRequestException('Already started')
    if (q.rounds.every((r) => r.questions.length === 0)) throw new BadRequestException('Add at least one question first')
    await this.quizzes.prisma.quiz.update({ where: { id }, data: { status: 'SCHEDULED' } })
    return toDetail(await this.quizzes.full(id))
  }
}
