import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { HostAdminDto } from '@puntquiz/contracts'
import { AuthGuard, AuthedRequest } from './auth'
import { hostApprovedMail, hostRequestMail } from './mail.templates'
import { MailService } from './mail.service'
import { PrismaService } from './prisma.service'
import { RetentionService } from './retention.service'

const site = () => process.env.PUBLIC_URL ?? ''

@Controller()
@UseGuards(AuthGuard)
export class AdminController {
  constructor(
    private retention: RetentionService,
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private admin(req: AuthedRequest) {
    if (!req.user.isAdmin) throw new ForbiddenException('Admins only')
  }

  /** Run the retention clean-up now (it also runs daily). Admin only; always uses the configured retention period. */
  @Post('admin/retention/run')
  run(@Req() req: AuthedRequest) {
    this.admin(req)
    return this.retention.run()
  }

  // ---- Who may present: new accounts ask, an admin approves ----

  @Post('host/request')
  async request(@Req() req: AuthedRequest) {
    const u = req.user
    if (u.isGuest) throw new ForbiddenException('Maak eerst een account')
    if (u.isAdmin || u.canHost) return { ok: true, already: true }
    const at = u.hostRequestedAt ?? new Date()
    if (!u.hostRequestedAt) {
      await this.prisma.user.update({ where: { id: u.id }, data: { hostRequestedAt: at } })
      const admins = await this.prisma.user.findMany({ where: { isAdmin: true, email: { not: null } } })
      for (const a of admins) this.mail.send(a.id, a.email, 'host-request', `${u.id}:${at.toISOString()}`, hostRequestMail({ name: u.name, email: u.email, siteUrl: site() }))
    }
    return { ok: true }
  }

  @Get('admin/hosts')
  async hosts(@Req() req: AuthedRequest): Promise<HostAdminDto> {
    this.admin(req)
    const pending = await this.prisma.user.findMany({ where: { hostRequestedAt: { not: null }, canHost: false, isAdmin: false, isGuest: false }, orderBy: { hostRequestedAt: 'asc' } })
    const hosts = await this.prisma.user.findMany({ where: { canHost: true, isAdmin: false, isGuest: false }, orderBy: { name: 'asc' } })
    return {
      requests: pending.map((u) => ({ id: u.id, name: u.name, email: u.email, requestedAt: u.hostRequestedAt!.toISOString() })),
      hosts: hosts.map((u) => ({ id: u.id, name: u.name, email: u.email })),
    }
  }

  private async target(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u || u.isGuest) throw new NotFoundException('User not found')
    return u
  }

  @Post('admin/hosts/:id/approve')
  async approve(@Req() req: AuthedRequest, @Param('id') id: string) {
    this.admin(req)
    const u = await this.target(id)
    await this.prisma.user.update({ where: { id }, data: { canHost: true, hostRequestedAt: null } })
    this.mail.send(u.id, u.email, 'host-approved', new Date().toISOString(), hostApprovedMail({ name: u.name, siteUrl: site() }))
    return { ok: true }
  }

  @Post('admin/hosts/:id/deny')
  async deny(@Req() req: AuthedRequest, @Param('id') id: string) {
    this.admin(req)
    await this.target(id)
    await this.prisma.user.update({ where: { id }, data: { hostRequestedAt: null } })
    return { ok: true }
  }

  @Post('admin/hosts/:id/revoke')
  async revoke(@Req() req: AuthedRequest, @Param('id') id: string) {
    this.admin(req)
    const u = await this.target(id)
    if (u.isAdmin) throw new BadRequestException('Admins are managed in Authentik')
    await this.prisma.user.update({ where: { id }, data: { canHost: false, hostRequestedAt: null } })
    return { ok: true }
  }
}
