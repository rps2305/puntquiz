import { Injectable } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import { PrismaService } from './prisma.service'
import { Mail, isDeliverable } from './mail.templates'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * SMTP sender (Gmail by default). Credentials come only from the environment.
 * - sequential queue with a small delay (provider rate limits)
 * - deduped per (user, kind, key) so re-reveals never re-send
 * - daily cap (consumer Gmail allows roughly 500 messages/day)
 */
@Injectable()
export class MailService {
  private tx = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 465),
        secure: Number(process.env.SMTP_PORT ?? 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null
  private from = process.env.MAIL_FROM ?? (process.env.SMTP_USER ? `PuntQuiz <${process.env.SMTP_USER}>` : '')
  private cap = Number(process.env.MAIL_DAILY_CAP ?? 400)
  private chain: Promise<void> = Promise.resolve()

  constructor(private prisma: PrismaService) {}

  get enabled() {
    return !!this.tx
  }

  /** Fire-and-forget: never throws into the caller's request. */
  send(userId: string, to: string | null | undefined, kind: string, key: string, mail: Mail): void {
    if (!this.tx || !isDeliverable(to)) return
    this.chain = this.chain.then(() => this.deliver(userId, to, kind, key, mail)).catch((e) => console.error('mail failed', e?.message ?? e))
  }

  private async deliver(userId: string, to: string, kind: string, key: string, mail: Mail) {
    let logId: string
    try {
      logId = (await this.prisma.mailLog.create({ data: { userId, kind, key } })).id
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return // already sent
      throw e
    }
    const dayStart = new Date()
    dayStart.setUTCHours(0, 0, 0, 0)
    if ((await this.prisma.mailLog.count({ where: { createdAt: { gte: dayStart } } })) > this.cap) {
      await this.prisma.mailLog.delete({ where: { id: logId } })
      console.warn(`mail daily cap (${this.cap}) reached, skipping ${kind}`)
      return
    }
    try {
      await this.tx!.sendMail({ from: this.from, to, subject: mail.subject, html: mail.html, text: mail.text })
    } catch (e) {
      await this.prisma.mailLog.delete({ where: { id: logId } }).catch(() => undefined)
      throw e
    }
    await sleep(250)
  }
}
