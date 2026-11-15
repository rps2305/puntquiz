import { Controller, Get, Module, OnModuleInit } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { RetentionService } from './retention.service'
import { BankController, BankService } from './bank'
import { AuthController, AuthGuard, AuthService } from './auth'
import { QuizGateway } from './gateway'
import { LiveController } from './live.controller'
import { LiveService } from './live.service'
import { PresenceService } from './presence.service'
import { MediaController } from './media.controller'
import { MailService } from './mail.service'
import { PrismaService } from './prisma.service'
import { QuizzesController, QuizzesService } from './quizzes'
import { RedisService } from './redis.service'

@Controller()
class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}
  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`
    await this.redis.client.ping()
    return { ok: true, version: process.env.APP_VERSION ?? '0.1.0' }
  }
}

@Module({
  controllers: [AdminController, AuthController, QuizzesController, BankController, MediaController, LiveController, HealthController],
  providers: [RetentionService, PrismaService, MailService, RedisService, AuthService, AuthGuard, QuizzesService, BankService, LiveService, QuizGateway, PresenceService],
})
export class AppModule implements OnModuleInit {
  constructor(private live: LiveService) {}
  onModuleInit() {
    void this.live.recover()
  }
}
