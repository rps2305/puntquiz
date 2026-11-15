import { Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard, AuthedRequest } from './auth'
import { RetentionService } from './retention.service'

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private retention: RetentionService) {}

  /** Run the retention clean-up now (it also runs daily). Admin only; always uses the configured retention period. */
  @Post('retention/run')
  run(@Req() req: AuthedRequest) {
    if (!req.user.isAdmin) throw new ForbiddenException('Admins only')
    return this.retention.run()
  }
}
