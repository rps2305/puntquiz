import { Injectable } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import { parse } from 'cookie'
import { SOCKET_EVENTS } from '@puntquiz/contracts'
import { AuthService, COOKIE } from './auth'
import { PrismaService } from './prisma.service'
import { PresenceService } from './presence.service'

interface SocketData {
  userId?: string
  quizIds: Set<string>
  ready?: Promise<void>
}

/**
 * WebSocket gateway = push channel only. All state-changing actions go through REST so they are
 * validated server-side and can be retried (offline buffering); sockets just say "refetch".
 * Reconnection/fallback is Socket.IO's own (spec §17).
 */
@Injectable()
@WebSocketGateway({ path: '/socket.io' })
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server

  constructor(
    private auth: AuthService,
    private prisma: PrismaService,
    private presence: PresenceService,
  ) {}

  handleConnection(client: Socket) {
    const data = client.data as SocketData
    data.quizIds = new Set()
    // Handlers await `ready`: the client may emit before this async auth finishes.
    data.ready = (async () => {
      const cookies = parse(client.handshake.headers.cookie ?? '')
      const user = await this.auth.userFromToken(cookies[COOKIE])
      if (!user) {
        client.disconnect(true)
        return
      }
      data.userId = user.id
    })()
  }

  handleDisconnect(client: Socket) {
    const d = client.data as SocketData
    if (!d.userId) return
    for (const q of d.quizIds ?? []) {
      this.presence.remove(q, d.userId) // no-op for hosts that were never added
      this.server.to(`host:${q}`).emit(SOCKET_EVENTS.answered, { presenceChanged: true })
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.join)
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { quizId: string }) {
    const d = client.data as SocketData
    await d.ready
    if (!d.userId || !body?.quizId) return { ok: false }
    const quiz = await this.prisma.quiz.findUnique({ where: { id: body.quizId } })
    if (!quiz) return { ok: false }
    const part = await this.prisma.participation.findUnique({
      where: { quizId_userId: { quizId: quiz.id, userId: d.userId } },
    })
    const user = await this.prisma.user.findUnique({ where: { id: d.userId } })
    const isHost = quiz.hostId === d.userId || !!user?.isAdmin
    if (!part && !isHost) return { ok: false }
    await client.join(`quiz:${quiz.id}`)
    if (isHost) await client.join(`host:${quiz.id}`)
    if (!d.quizIds.has(quiz.id)) {
      d.quizIds.add(quiz.id)
      if (part) this.presence.add(quiz.id, d.userId) // presenters are not counted as online players
    }
    this.server.to(`host:${quiz.id}`).emit(SOCKET_EVENTS.answered, { presenceChanged: true })
    return { ok: true }
  }

  emitChanged(quizId: string, version: number) {
    this.server.to(`quiz:${quizId}`).emit(SOCKET_EVENTS.changed, { version })
  }
  emitHostRefresh(quizId: string) {
    this.server.to(`host:${quizId}`).emit(SOCKET_EVENTS.answered, { presenceChanged: true })
  }
  emitAnswered(quizId: string, answered: number) {
    this.server.to(`host:${quizId}`).emit(SOCKET_EVENTS.answered, { answered })
  }
}
