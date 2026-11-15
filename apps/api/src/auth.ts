import {
  BadRequestException,
  Query,
  ForbiddenException,
  Body,
  CanActivate,
  ConflictException,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'node:crypto'
import type { User } from '@prisma/client'
import type { UserDto } from '@puntquiz/contracts'
import { PrismaService } from './prisma.service'
import { MailService } from './mail.service'
import { welcomeMail } from './mail.templates'

export const COOKIE = 'pq_session'
const THIRTY_DAYS = 30 * 24 * 3600 * 1000
const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production')
}

export type AuthedRequest = Request & { user: User }

export function toUserDto(u: User): UserDto {
  return { id: u.id, name: u.name, email: u.email, isGuest: u.isGuest, avatar: u.avatar }
}

@Injectable()
export class AuthService {
  constructor(readonly prisma: PrismaService) {}

  sign(userId: string) {
    return jwt.sign({ sub: userId }, SECRET, { expiresIn: '30d' })
  }

  /** Sliding ~30-day session (spec §16): re-issued on every authenticated visit. */
  setCookie(res: Response, userId: string) {
    res.cookie(COOKIE, this.sign(userId), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: THIRTY_DAYS,
      path: '/',
    })
  }

  async userFromToken(token: string | undefined): Promise<User | null> {
    if (!token) return null
    try {
      const p = jwt.verify(token, SECRET) as { sub: string }
      return await this.prisma.user.findUnique({ where: { id: p.sub } })
    } catch {
      return null
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>()
    const user = await this.auth.userFromToken(req.cookies?.[COOKIE])
    if (!user) throw new UnauthorizedException('Not signed in')
    ;(req as AuthedRequest).user = user
    return true
  }
}

/** Tiny in-memory limiter for auth endpoints (spec §16 rate limiting). */
const hits = new Map<string, number[]>()
function limit(req: Request, max = 20) {
  const key = `${req.ip}:${req.path}`
  const now = Date.now()
  const arr = (hits.get(key) ?? []).filter((t) => now - t < 60_000)
  arr.push(now)
  hits.set(key, arr)
  if (arr.length > max) throw new BadRequestException('Too many attempts, try again in a minute')
}

const LOCAL_AUTH = process.env.LOCAL_AUTH !== 'false'
function requireLocal() {
  if (!LOCAL_AUTH) throw new ForbiddenException('Password login is disabled; use single sign-on')
}

const OIDC = {
  publicIssuer: process.env.OIDC_PUBLIC_ISSUER,
  internal: process.env.OIDC_INTERNAL_URL,
  clientId: process.env.OIDC_CLIENT_ID ?? 'puntquiz',
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  publicUrl: process.env.PUBLIC_URL,
  adminGroup: process.env.OIDC_ADMIN_GROUP ?? 'puntquiz-admins',
}
const oidcEnabled = !!(OIDC.publicIssuer && OIDC.internal && OIDC.clientSecret && OIDC.publicUrl)
const OIDC_COOKIE = 'pq_oidc'
const b64url = (b: Buffer) => b.toString('base64url')

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanName(n: unknown) {
  const s = String(n ?? '').trim().slice(0, 40)
  if (s.length < 2) throw new BadRequestException('Name must be at least 2 characters')
  return s
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private mail: MailService,
  ) {}

  private welcome(u: User) {
    this.mail.send(u.id, u.email, 'welcome', 'welcome', welcomeMail(u.name, OIDC.publicUrl ?? process.env.PUBLIC_URL ?? ''))
  }

  private get prisma() {
    return this.auth.prisma
  }

  @Post('guest')
  async guest(@Body() b: { name: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    limit(req)
    const user = await this.prisma.user.create({ data: { name: cleanName(b.name), isGuest: true } })
    this.auth.setCookie(res, user.id)
    return toUserDto(user)
  }

  @Post('register')
  async register(
    @Body() b: { email: string; name: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    requireLocal()
    limit(req)
    const email = String(b.email ?? '').trim().toLowerCase()
    if (!EMAIL.test(email)) throw new BadRequestException('Invalid email address')
    if (String(b.password ?? '').length < 8) throw new BadRequestException('Password must be at least 8 characters')
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email already registered')
    const passwordHash = await bcrypt.hash(b.password, 11)
    const name = cleanName(b.name)
    // A guest can upgrade to a real account later (spec §16): keep their participations.
    const current = await this.auth.userFromToken(req.cookies?.[COOKIE])
    const isFirst = (await this.prisma.user.count({ where: { isGuest: false } })) === 0
    const user =
      current?.isGuest
        ? await this.prisma.user.update({
            where: { id: current.id },
            data: { email, name, passwordHash, isGuest: false, isAdmin: isFirst },
          })
        : await this.prisma.user.create({ data: { email, name, passwordHash, isAdmin: isFirst } })
    this.auth.setCookie(res, user.id)
    this.welcome(user)
    return toUserDto(user)
  }

  @Post('login')
  async login(
    @Body() b: { email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    requireLocal()
    limit(req)
    const user = await this.prisma.user.findUnique({ where: { email: String(b.email ?? '').trim().toLowerCase() } })
    if (!user?.passwordHash || !(await bcrypt.compare(String(b.password ?? ''), user.passwordHash))) {
      throw new UnauthorizedException('Wrong email or password')
    }
    this.auth.setCookie(res, user.id)
    return toUserDto(user)
  }

  @Get('config')
  config() {
    return { oidc: oidcEnabled, localAuth: LOCAL_AUTH, mail: this.mail.enabled }
  }

  /** Step 1: authorization-code flow with PKCE; state/verifier ride in a short-lived signed cookie. */
  @Get('oidc/login')
  async oidcLogin(@Query('next') next: string | undefined, @Req() req: Request, @Res() res: Response) {
    if (!oidcEnabled) throw new BadRequestException('Single sign-on is not configured')
    limit(req)
    const verifier = b64url(randomBytes(32))
    const state = b64url(randomBytes(16))
    const current = await this.auth.userFromToken(req.cookies?.[COOKIE])
    const safeNext = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/'
    const flow = jwt.sign({ state, verifier, next: safeNext, guestId: current?.isGuest ? current.id : null }, SECRET, { expiresIn: '10m' })
    res.cookie(OIDC_COOKIE, flow, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 10 * 60 * 1000, path: '/api/auth/oidc' })
    const q = new URLSearchParams({
      response_type: 'code',
      client_id: OIDC.clientId,
      redirect_uri: `${OIDC.publicUrl}/api/auth/oidc/callback`,
      scope: 'openid profile email',
      state,
      code_challenge: b64url(createHash('sha256').update(verifier).digest()),
      code_challenge_method: 'S256',
    })
    res.redirect(`${OIDC.publicIssuer}/application/o/authorize/?${q}`)
  }

  /** Step 2: exchange the code over the back channel, read userinfo, link/create the user, start our session. */
  @Get('oidc/callback')
  async oidcCallback(@Query() q: { code?: string; state?: string; error?: string }, @Req() req: Request, @Res() res: Response) {
    if (!oidcEnabled) throw new BadRequestException('Single sign-on is not configured')
    const fail = (m: string) => res.redirect(`/login?error=${encodeURIComponent(m)}`)
    if (q.error) return fail('Inloggen geannuleerd')
    let flow: { state: string; verifier: string; next: string; guestId: string | null }
    try {
      flow = jwt.verify(req.cookies?.[OIDC_COOKIE] ?? '', SECRET) as typeof flow
    } catch {
      return fail('Inlogsessie verlopen, probeer opnieuw')
    }
    res.clearCookie(OIDC_COOKIE, { path: '/api/auth/oidc' })
    if (!q.code || q.state !== flow.state) return fail('Ongeldige inlogpoging')

    try {
      const tokenRes = await fetch(`${OIDC.internal}/application/o/token/`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: q.code,
          redirect_uri: `${OIDC.publicUrl}/api/auth/oidc/callback`,
          client_id: OIDC.clientId,
          client_secret: OIDC.clientSecret!,
          code_verifier: flow.verifier,
        }),
      })
      if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`)
      const tokens = (await tokenRes.json()) as { access_token: string }
      const infoRes = await fetch(`${OIDC.internal}/application/o/userinfo/`, { headers: { authorization: `Bearer ${tokens.access_token}` } })
      if (!infoRes.ok) throw new Error(`userinfo ${infoRes.status}`)
      const info = (await infoRes.json()) as { sub: string; email?: string; name?: string; preferred_username?: string; groups?: string[] }
      const { user, fresh } = await this.upsertOidcUser(info, flow.guestId)
      if (fresh) this.welcome(user)
      this.auth.setCookie(res, user.id)
      return res.redirect(flow.next)
    } catch (e) {
      console.error('OIDC callback failed', e)
      return fail('Inloggen via single sign-on mislukt')
    }
  }

  private async upsertOidcUser(
    info: { sub: string; email?: string; name?: string; preferred_username?: string; groups?: string[] },
    guestId: string | null,
  ) {
    const email = info.email?.trim().toLowerCase() || null
    const name = (info.name || info.preferred_username || email?.split('@')[0] || 'Speler').slice(0, 40)
    const isAdmin = (info.groups ?? []).includes(OIDC.adminGroup)
    let user = await this.prisma.user.findUnique({ where: { oidcSub: info.sub } })
    if (!user && email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } })
      if (byEmail && !byEmail.oidcSub) user = byEmail // link an existing local account
    }
    if (!user && guestId) {
      const guest = await this.prisma.user.findUnique({ where: { id: guestId } })
      // Guest upgrade (spec §16): keep participations. Skip if the email already belongs to someone else.
      if (guest?.isGuest && !(email && (await this.prisma.user.findUnique({ where: { email } })))) user = guest
    }
    if (!user) return { fresh: true, user: await this.prisma.user.create({ data: { oidcSub: info.sub, email, name, isAdmin, isGuest: false } }) }
    const wasGuest = user.isGuest
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { oidcSub: info.sub, email: user.email ?? email, isGuest: false, isAdmin: isAdmin || (user.oidcSub ? false : user.isAdmin), name: user.isGuest ? name : user.name },
    })
    return { fresh: wasGuest, user: updated }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE, { path: '/' })
    return { ok: true }
  }

  @Get('me')
  async me(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.userFromToken(req.cookies?.[COOKIE])
    if (!user) return null
    this.auth.setCookie(res, user.id)
    return toUserDto(user)
  }
}

export { UseGuards }
