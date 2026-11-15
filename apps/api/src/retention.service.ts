import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { RedisService } from './redis.service'

export const RETENTION_DAYS = Math.max(1, Number(process.env.RETENTION_DAYS ?? 90))
const DAY = 86_400_000

export interface RetentionResult {
  days: number
  quizzesCleaned: number
  logsDeleted: number
  guestsDeleted: number
}

/**
 * Data retention (privacy policy): player data of a quiz (participations, answers, teams, grades, power-ups, audit log)
 * is deleted RETENTION_DAYS after the quiz ended; mail/audit logs older than that go too; guest accounts left without
 * any data are removed. Quiz content (rounds, questions) and registered accounts are NOT touched here.
 */
@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private log = new Logger('Retention')
  private timers: NodeJS.Timeout[] = []

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  onModuleInit() {
    // First run shortly after start, then daily. unref(): never keeps the process alive.
    const first = setTimeout(() => void this.run().catch((e) => this.log.error(e)), 2 * 60_000)
    const daily = setInterval(() => void this.run().catch((e) => this.log.error(e)), DAY)
    first.unref(); daily.unref()
    this.timers.push(first, daily)
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t))
  }

  async run(days = RETENTION_DAYS): Promise<RetentionResult> {
    const cutoff = new Date(Date.now() - days * DAY)
    const expired = await this.prisma.quiz.findMany({ where: { status: 'FINISHED', finishedAt: { lt: cutoff } }, select: { id: true } })
    for (const { id: quizId } of expired) {
      await this.prisma.$transaction([
        this.prisma.grade.deleteMany({ where: { quizId } }),
        this.prisma.powerUpUse.deleteMany({ where: { quizId } }),
        this.prisma.chatMessage.deleteMany({ where: { quizId } }),
        this.prisma.auditLog.deleteMany({ where: { quizId } }),
        this.prisma.participation.deleteMany({ where: { quizId } }), // answers cascade
        this.prisma.team.deleteMany({ where: { quizId } }),
        this.prisma.quiz.update({ where: { id: quizId }, data: { status: 'ARCHIVED' } }),
      ])
      await this.redis.del(`room:${quizId}:state`, `room:${quizId}:revealed`)
    }
    const logs =
      (await this.prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } })).count +
      (await this.prisma.mailLog.deleteMany({ where: { createdAt: { lt: cutoff } } })).count
    const guests = await this.prisma.user.deleteMany({
      where: { isGuest: true, createdAt: { lt: cutoff }, participations: { none: {} }, quizzes: { none: {} }, bank: { none: {} } },
    })
    const result = { days, quizzesCleaned: expired.length, logsDeleted: logs, guestsDeleted: guests.count }
    this.log.log(`retention ${JSON.stringify(result)}`)
    return result
  }
}
