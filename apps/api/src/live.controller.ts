import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { HostAction, PowerUpType } from '@puntquiz/contracts'
import { AuthGuard, AuthedRequest } from './auth'
import { LiveService } from './live.service'
import { QuizzesService } from './quizzes'

@Controller()
export class LiveController {
  constructor(
    private live: LiveService,
    private quizzes: QuizzesService,
  ) {}

  /** Public: lets the landing page show which quiz a code belongs to. */
  @Get('play/:code')
  async info(@Param('code') code: string) {
    const q = await this.live.findByCode(code)
    return { id: q.id, title: q.title, mode: q.mode, status: q.status, joinCode: q.joinCode }
  }

  @Post('play/:code/join')
  @UseGuards(AuthGuard)
  join(@Req() req: AuthedRequest, @Param('code') code: string) {
    return this.live.join(code, req.user.id)
  }

  @Get('live/:id')
  @UseGuards(AuthGuard)
  async view(@Req() req: AuthedRequest, @Param('id') id: string, @Query('host') host?: string) {
    if (host) {
      await this.quizzes.assertHost(id, req)
      return this.live.hostView(id, req.user.id)
    }
    return this.live.playerView(id, req.user.id)
  }

  @Get('live/:id/standings')
  @UseGuards(AuthGuard)
  async standings(@Req() req: AuthedRequest, @Param('id') id: string) {
    const q = await this.quizzes.full(id)
    const isHost = q.hostId === req.user.id || req.user.isAdmin
    return this.live.standings(id, req.user.id, isHost)
  }

  @Post('live/:id/answer')
  @UseGuards(AuthGuard)
  answer(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() b: { questionId: string; selected: string[]; answeredAt?: number },
  ) {
    return this.live.submitAnswer(id, req.user.id, b)
  }

  @Post('live/:id/action')
  @UseGuards(AuthGuard)
  async action(@Req() req: AuthedRequest, @Param('id') id: string, @Body() b: { action: HostAction; force?: boolean; round?: number }) {
    await this.quizzes.assertHost(id, req)
    return this.live.act(id, req.user.id, b.action, !!b.force, typeof b.round === 'number' ? b.round : undefined)
  }

  @Post('live/:id/email-pref')
  @UseGuards(AuthGuard)
  emailPref(@Req() req: AuthedRequest, @Param('id') id: string, @Body() b: { enabled: boolean }) {
    return this.live.setEmailPref(id, req.user.id, !!b?.enabled)
  }

  @Post('live/:id/powerup')
  @UseGuards(AuthGuard)
  powerUp(@Req() req: AuthedRequest, @Param('id') id: string, @Body() b: { type: PowerUpType }) {
    return this.live.usePowerUp(id, req.user.id, b.type)
  }

  @Post('live/:id/grade')
  @UseGuards(AuthGuard)
  grade(@Req() req: AuthedRequest, @Param('id') id: string, @Body() b: { gradeId: string; verdict: boolean }) {
    return this.live.submitGrade(id, req.user.id, b.gradeId, !!b.verdict)
  }

  @Post('live/:id/grade-override')
  @UseGuards(AuthGuard)
  async gradeOverride(@Req() req: AuthedRequest, @Param('id') id: string, @Body() b: { gradeId: string; verdict: boolean; reason?: string }) {
    await this.quizzes.assertHost(id, req)
    return this.live.hostGrade(id, req.user.id, b.gradeId, !!b.verdict, b.reason)
  }

  @Post('live/:id/override')
  @UseGuards(AuthGuard)
  async override(@Req() req: AuthedRequest, @Param('id') id: string, @Body() b: { questionId: string; correct: string[]; reason: string }) {
    await this.quizzes.assertHost(id, req)
    return this.live.overrideCorrect(id, req.user.id, b)
  }

  @Post('live/:id/teams')
  @UseGuards(AuthGuard)
  createTeam(@Req() req: AuthedRequest, @Param('id') id: string, @Body() b: { name: string }) {
    return this.live.createTeam(id, req.user.id, b.name)
  }

  @Post('live/:id/teams/leave')
  @UseGuards(AuthGuard)
  leave(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.live.leaveTeam(id, req.user.id)
  }

  @Post('live/:id/teams/:teamId/join')
  @UseGuards(AuthGuard)
  joinTeam(@Req() req: AuthedRequest, @Param('id') id: string, @Param('teamId') teamId: string) {
    return this.live.joinTeam(id, req.user.id, teamId)
  }
}

export { ForbiddenException }
