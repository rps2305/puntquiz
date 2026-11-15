import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { CHAT_MAX_LENGTH, type ChatMessageDto } from '@puntquiz/contracts'
import { AuthGuard, AuthedRequest } from './auth'
import { QuizGateway } from './gateway'
import { PrismaService } from './prisma.service'
import { QuizzesService } from './quizzes'

const PER_USER_CAP = 100 // messages per player per quiz
const BURST = { n: 3, ms: 10_000 } // at most 3 messages per 10 seconds

/** Chat between the players of a quiz and the presenter. Persistence is plain REST; sockets only nudge clients to refetch. */
@Controller('live/:id/chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(
    private prisma: PrismaService,
    private quizzes: QuizzesService,
    private gateway: QuizGateway,
  ) {}

  private async quiz(id: string) {
    const q = await this.prisma.quiz.findUnique({ where: { id }, select: { id: true, hostId: true, status: true } })
    if (!q || q.status === 'DRAFT') throw new NotFoundException('Quiz not found')
    return q
  }

  private async isHost(req: AuthedRequest, quizId: string) {
    const q = await this.prisma.quiz.findUnique({ where: { id: quizId }, select: { hostId: true } })
    return !!q && (q.hostId === req.user.id || req.user.isAdmin)
  }

  @Get()
  async list(@Req() req: AuthedRequest, @Param('id') id: string, @Query('host') host?: string): Promise<{ messages: ChatMessageDto[] }> {
    await this.quiz(id)
    const asHost = !!host
    if (asHost) await this.quizzes.assertHost(id, req)
    else if (!(await this.prisma.participation.findUnique({ where: { quizId_userId: { quizId: id, userId: req.user.id } } }))) throw new ForbiddenException('Join the quiz first')
    const rows = await this.prisma.chatMessage.findMany({
      where: asHost ? { quizId: id } : { quizId: id, OR: [{ authorId: req.user.id }, { fromHost: true, OR: [{ toUserId: null }, { toUserId: req.user.id }] }] },
      orderBy: { createdAt: 'asc' },
      take: 400,
    })
    const ids = [...new Set(rows.flatMap((r) => [r.authorId, ...(r.toUserId ? [r.toUserId] : [])]))]
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    const name = new Map(users.map((u) => [u.id, u.name]))
    return {
      messages: rows.map((r) => ({
        id: r.id,
        at: r.createdAt.toISOString(),
        fromHost: r.fromHost,
        fromId: r.authorId,
        from: r.fromHost ? 'Presentator' : (name.get(r.authorId) ?? '?'),
        toId: r.toUserId,
        to: r.toUserId ? (name.get(r.toUserId) ?? '?') : null,
        text: r.body,
        mine: r.authorId === req.user.id,
      })),
    }
  }

  @Post()
  async send(@Req() req: AuthedRequest, @Param('id') id: string, @Body() b: { text?: string; to?: string | null }) {
    await this.quiz(id)
    const text = String(b?.text ?? '').replace(/\s+/g, ' ').trim()
    if (!text) throw new BadRequestException('Typ eerst een bericht')
    if (text.length > CHAT_MAX_LENGTH) throw new BadRequestException(`Maximaal ${CHAT_MAX_LENGTH} tekens`)
    const host = await this.isHost(req, id)
    // Hosts reply (to one player or everyone); everyone else is a player and writes to the presenter.
    if (host) {
      let to: string | null = null
      if (b?.to) {
        const part = await this.prisma.participation.findUnique({ where: { quizId_userId: { quizId: id, userId: b.to } } })
        if (!part) throw new BadRequestException('Unknown player')
        to = b.to
      }
      await this.prisma.chatMessage.create({ data: { quizId: id, authorId: req.user.id, fromHost: true, toUserId: to, body: text } })
      this.gateway.emitChat(id, false)
      return { ok: true }
    }
    if (!(await this.prisma.participation.findUnique({ where: { quizId_userId: { quizId: id, userId: req.user.id } } }))) throw new ForbiddenException('Join the quiz first')
    const mine = await this.prisma.chatMessage.count({ where: { quizId: id, authorId: req.user.id } })
    if (mine >= PER_USER_CAP) throw new BadRequestException('Je hebt het maximale aantal berichten bereikt')
    const recent = await this.prisma.chatMessage.count({ where: { quizId: id, authorId: req.user.id, createdAt: { gt: new Date(Date.now() - BURST.ms) } } })
    if (recent >= BURST.n) throw new BadRequestException('Even rustig aan: wacht een paar seconden')
    await this.prisma.chatMessage.create({ data: { quizId: id, authorId: req.user.id, fromHost: false, body: text } })
    this.gateway.emitChat(id, true)
    return { ok: true }
  }

  @Delete(':msgId')
  async remove(@Req() req: AuthedRequest, @Param('id') id: string, @Param('msgId') msgId: string) {
    await this.quizzes.assertHost(id, req)
    await this.prisma.chatMessage.deleteMany({ where: { id: msgId, quizId: id } })
    this.gateway.emitChat(id, false)
    return { ok: true }
  }
}
