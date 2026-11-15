import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Injectable, NotFoundException, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { Prisma } from '@prisma/client'
import type { BankQuestion } from '@prisma/client'
import ExcelJS from 'exceljs'
import type { BankQuestionDto, BankUsage, MusicConfigDto } from '@puntquiz/contracts'
import { MediaItem, validateMedia } from './media'
import { normaliseMusic } from './music'
import { toMediaDtos } from './quizzes'
import { AuthedRequest, HostGuard } from './auth'
import { PrismaService } from './prisma.service'
import { BankInput, COLUMNS, ParseResult, jsonToQuestions, normalizeText, parseCsv, questionsToRows, rowsToQuestions, toCsv, validateBank } from './bankio'

type Opts = { id: string; text: string }[]

@Injectable()
export class BankService {
  constructor(private prisma: PrismaService) {}

  private scope(req: AuthedRequest): Prisma.BankQuestionWhereInput {
    return req.user.isAdmin ? {} : { ownerId: req.user.id }
  }

  async usage(ids: string[]): Promise<Map<string, BankUsage>> {
    const uses = await this.prisma.question.findMany({
      where: { bankQuestionId: { in: ids } },
      select: { bankQuestionId: true, round: { select: { quiz: { select: { id: true, title: true, status: true, createdAt: true } } } } },
    })
    const map = new Map<string, BankUsage>()
    for (const id of ids) map.set(id, { count: 0, lastUsed: null, inDraft: false })
    const seen = new Set<string>()
    for (const u of uses) {
      const q = u.round.quiz
      const m = map.get(u.bankQuestionId!)!
      if (q.status === 'DRAFT') { m.inDraft = true; continue }
      const key = `${u.bankQuestionId}:${q.id}`
      if (seen.has(key)) continue
      seen.add(key)
      m.count++
      if (!m.lastUsed || new Date(m.lastUsed.date) < q.createdAt) m.lastUsed = { quizId: q.id, title: q.title, date: q.createdAt.toISOString() }
    }
    return map
  }

  dto(b: BankQuestion, usage: BankUsage): BankQuestionDto {
    return {
      id: b.id, text: b.text, type: b.type, options: b.options as unknown as Opts, correct: b.correct as unknown as string[],
      points: b.points, seconds: b.seconds, explanation: b.explanation, category: b.category, difficulty: b.difficulty,
      tags: b.tags, source: b.source, hint: b.hint, media: toMediaDtos(b.media, true), config: (b.config as unknown as MusicConfigDto) ?? null, usage,
    }
  }

  async list(req: AuthedRequest, f: { q?: string; category?: string; tag?: string; difficulty?: string; unused?: string; limit?: number; offset?: number }) {
    const where: Prisma.BankQuestionWhereInput = { ...this.scope(req) }
    if (f.q) where.OR = [{ text: { contains: f.q, mode: 'insensitive' } }, { tags: { has: f.q.toLowerCase() } }]
    if (f.category) where.category = f.category
    if (f.tag) where.tags = { has: f.tag }
    if (f.difficulty) where.difficulty = Number(f.difficulty)
    let rows = await this.prisma.bankQuestion.findMany({ where, orderBy: { createdAt: 'desc' } })
    const usage = await this.usage(rows.map((r) => r.id))
    if (f.unused) rows = rows.filter((r) => usage.get(r.id)!.count === 0)
    const total = rows.length
    const page = rows.slice(f.offset ?? 0, (f.offset ?? 0) + (f.limit ?? 50))
    return { total, items: page.map((r) => this.dto(r, usage.get(r.id)!)) }
  }

  async meta(req: AuthedRequest) {
    const rows = await this.prisma.bankQuestion.findMany({ where: this.scope(req), select: { category: true, tags: true } })
    return {
      categories: [...new Set(rows.map((r) => r.category).filter((x): x is string => !!x))].sort(),
      tags: [...new Set(rows.flatMap((r) => r.tags))].sort(),
    }
  }

  private data(i: BankInput, ownerId?: string) {
    return {
      ...(ownerId ? { ownerId } : {}),
      text: i.text.trim(), type: i.type, options: i.options as unknown as Prisma.InputJsonValue, correct: i.correct as unknown as Prisma.InputJsonValue,
      points: i.points ?? 10, seconds: i.seconds ?? 30, explanation: i.explanation || null, category: i.category?.trim() || null,
      difficulty: i.difficulty ?? null, tags: [...new Set((i.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))], source: i.source?.trim() || null,
      hint: i.hint?.trim().slice(0, 300) || null,
      media: ((validateMedia(i.media) as { items: MediaItem[] }).items ?? []) as unknown as Prisma.InputJsonValue,
      config: (i.type === 'MUSIC' ? normaliseMusic(i.config ?? {}) : Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
    }
  }

  async create(req: AuthedRequest, i: BankInput) {
    const err = validateBank(i)
    if (err) throw new BadRequestException(err)
    const b = await this.prisma.bankQuestion.create({ data: { ...this.data(i), ownerId: req.user.id } })
    return this.dto(b, { count: 0, lastUsed: null, inDraft: false })
  }

  private async owned(req: AuthedRequest, id: string) {
    const b = await this.prisma.bankQuestion.findFirst({ where: { id, ...this.scope(req) } })
    if (!b) throw new NotFoundException('Question not found')
    return b
  }

  async update(req: AuthedRequest, id: string, i: BankInput) {
    await this.owned(req, id)
    const err = validateBank(i)
    if (err) throw new BadRequestException(err)
    const b = await this.prisma.bankQuestion.update({ where: { id }, data: this.data(i) })
    return this.dto(b, (await this.usage([id])).get(id)!)
  }

  async remove(req: AuthedRequest, id: string) {
    await this.owned(req, id)
    await this.prisma.bankQuestion.delete({ where: { id } }) // quiz copies keep working: FK is SET NULL
    return { ok: true }
  }

  /** Insert items, skipping ones whose normalised text already exists for this owner (or earlier in the batch). */
  async insertMany(ownerId: string, items: BankInput[]) {
    const existing = new Set((await this.prisma.bankQuestion.findMany({ where: { ownerId }, select: { text: true } })).map((e) => normalizeText(e.text)))
    const fresh: BankInput[] = []
    let duplicates = 0
    for (const it of items) {
      const k = normalizeText(it.text)
      if (existing.has(k)) { duplicates++; continue }
      existing.add(k)
      fresh.push(it)
    }
    if (fresh.length) await this.prisma.bankQuestion.createMany({ data: fresh.map((i) => ({ ...this.data(i), ownerId })) })
    return { imported: fresh.length, duplicates }
  }

  async parse(format: string, content: string): Promise<ParseResult> {
    if (format === 'json') {
      try { return jsonToQuestions(JSON.parse(content)) } catch { return { items: [], errors: [{ row: 0, message: 'invalid JSON' }] } }
    }
    if (format === 'csv') return rowsToQuestions(parseCsv(content))
    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(Buffer.from(content, 'base64') as unknown as ArrayBuffer)
      const ws = wb.worksheets[0]
      if (!ws) return { items: [], errors: [{ row: 0, message: 'workbook has no sheets' }] }
      const table: string[][] = []
      ws.eachRow({ includeEmpty: false }, (row) => {
        const cells: string[] = []
        for (let c = 1; c <= row.cellCount; c++) cells.push(String(row.getCell(c).text ?? ''))
        table.push(cells)
      })
      return rowsToQuestions(table)
    }
    throw new BadRequestException('format must be csv, json or xlsx')
  }

  async import(req: AuthedRequest, b: { format: string; content: string; dryRun?: boolean }) {
    if (typeof b?.content !== 'string' || b.content.length > 8_000_000) throw new BadRequestException('content missing or too large')
    const parsed = await this.parse(b.format, b.content)
    if (b.dryRun) return { dryRun: true, valid: parsed.items.length, errors: parsed.errors, preview: parsed.items.slice(0, 5).map((i) => i.text) }
    const r = await this.insertMany(req.user.id, parsed.items)
    return { dryRun: false, ...r, errors: parsed.errors }
  }

  /** Save a quiz's questions to the bank and link the quiz copies, so reuse tracking starts with this quiz. */
  async fromQuiz(req: AuthedRequest, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, include: { rounds: { include: { questions: true } } } })
    if (!quiz) throw new NotFoundException('Quiz not found')
    if (quiz.hostId !== req.user.id && !req.user.isAdmin) throw new ForbiddenException('Not your quiz')
    const existing = await this.prisma.bankQuestion.findMany({ where: { ownerId: req.user.id }, select: { id: true, text: true } })
    const byText = new Map(existing.map((e) => [normalizeText(e.text), e.id]))
    let added = 0
    let linked = 0
    for (const r of quiz.rounds) {
      for (const q of r.questions) {
        let id = byText.get(normalizeText(q.text))
        if (!id) {
          const b = await this.prisma.bankQuestion.create({
            data: { ownerId: req.user.id, text: q.text, type: q.type, options: q.options as Prisma.InputJsonValue, correct: q.correct as Prisma.InputJsonValue, points: q.points, seconds: q.seconds, explanation: q.explanation, category: r.category, tags: [], hint: q.hint, media: (q.media ?? []) as Prisma.InputJsonValue, config: (q.config ?? Prisma.JsonNull) as Prisma.InputJsonValue },
          })
          id = b.id
          byText.set(normalizeText(q.text), id)
          added++
        }
        if (q.bankQuestionId !== id) { await this.prisma.question.update({ where: { id: q.id }, data: { bankQuestionId: id } }); linked++ }
      }
    }
    return { added, linked }
  }

  async export(req: AuthedRequest, format: string, res: Response) {
    const rows = await this.prisma.bankQuestion.findMany({ where: this.scope(req), orderBy: { createdAt: 'asc' } })
    const items = rows.map((b) => ({ ...this.data({ ...(b as unknown as BankInput), options: b.options as unknown as Opts, correct: b.correct as unknown as string[] }), tags: b.tags, options: b.options as unknown as Opts, correct: b.correct as unknown as string[], type: b.type, difficulty: b.difficulty, text: b.text, media: b.media, hint: b.hint, config: b.config })) as unknown as (BankInput & { options: Opts })[]
    const name = `puntquiz-vragenbank-${new Date().toISOString().slice(0, 10)}`
    if (format === 'json') {
      res.setHeader('content-disposition', `attachment; filename="${name}.json"`)
      return res.json({ format: 'puntquiz.bank.v1', questions: items.map((q) => ({ text: q.text, type: q.type, options: q.options, correct: q.correct, points: q.points, seconds: q.seconds, explanation: q.explanation, category: q.category, difficulty: q.difficulty, tags: q.tags, source: q.source, media: q.media, hint: q.hint, config: q.config })) })
    }
    const table = questionsToRows(items)
    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Vragenbank')
      ws.addRow(COLUMNS)
      for (const r of table) ws.addRow(COLUMNS.map((c) => r[c] ?? ''))
      ws.getRow(1).font = { bold: true }
      res.setHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('content-disposition', `attachment; filename="${name}.xlsx"`)
      return res.send(Buffer.from(await wb.xlsx.writeBuffer()))
    }
    if (format !== 'csv') throw new BadRequestException('format must be csv, json or xlsx')
    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', `attachment; filename="${name}.csv"`)
    return res.send(toCsv(table))
  }
}

@Controller('bank')
@UseGuards(HostGuard)
export class BankController {
  constructor(private bank: BankService) {}

  private noGuest(req: AuthedRequest) {
    if (req.user.isGuest) throw new ForbiddenException('Create an account to use the question bank')
  }

  @Get()
  list(@Req() req: AuthedRequest, @Query() q: { q?: string; category?: string; tag?: string; difficulty?: string; unused?: string; limit?: string; offset?: string }) {
    this.noGuest(req)
    return this.bank.list(req, { ...q, limit: Math.min(Number(q.limit) || 50, 200), offset: Number(q.offset) || 0 })
  }

  @Get('meta')
  meta(@Req() req: AuthedRequest) { this.noGuest(req); return this.bank.meta(req) }

  @Get('export')
  export(@Req() req: AuthedRequest, @Query('format') format = 'json', @Res() res: Response) { this.noGuest(req); return this.bank.export(req, format, res) }

  @Post('import')
  import(@Req() req: AuthedRequest, @Body() b: { format: string; content: string; dryRun?: boolean }) { this.noGuest(req); return this.bank.import(req, b) }

  @Post('from-quiz/:quizId')
  fromQuiz(@Req() req: AuthedRequest, @Param('quizId') id: string) { this.noGuest(req); return this.bank.fromQuiz(req, id) }

  @Post()
  create(@Req() req: AuthedRequest, @Body() b: BankInput) { this.noGuest(req); return this.bank.create(req, b) }

  @Put(':id')
  update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() b: BankInput) { this.noGuest(req); return this.bank.update(req, id, b) }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) { this.noGuest(req); return this.bank.remove(req, id) }
}
