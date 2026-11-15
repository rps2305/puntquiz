import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Req, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { AuthedRequest, HostGuard } from './auth'
import { MAX_AUDIO_BYTES, MAX_IMAGE_BYTES, sniffMime } from './media'
import { PrismaService } from './prisma.service'

const DIR = resolve(process.env.MEDIA_DIR ?? './media')

@Controller('media')
export class MediaController {
  constructor(private prisma: PrismaService) {}

  /** Upload as base64 JSON (no multipart dependency). The type comes from the file's bytes, never from its name. */
  @Post()
  @UseGuards(HostGuard)
  async upload(@Req() req: AuthedRequest, @Body() b: { name?: string; data: string }) {
    if (req.user.isGuest) throw new ForbiddenException('Create an account to upload media')
    if (typeof b?.data !== 'string' || b.data.length > 15_000_000) throw new BadRequestException('file missing or too large')
    const buf = Buffer.from(b.data, 'base64')
    const t = sniffMime(buf)
    if (!t) throw new BadRequestException('Unsupported file. Use PNG, JPEG, GIF, WebP, MP3, OGG, M4A or WAV.')
    if (buf.length > (t.kind === 'image' ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES)) throw new BadRequestException(`File too large (max ${t.kind === 'image' ? 5 : 10} MB)`)
    const asset = await this.prisma.mediaAsset.create({ data: { ownerId: req.user.id, mime: t.mime, size: buf.length, name: b.name?.slice(0, 120) ?? null } })
    await mkdir(DIR, { recursive: true })
    await writeFile(join(DIR, asset.id), buf)
    return { id: asset.id, kind: t.kind, mime: t.mime, size: buf.length, url: `/api/media/${asset.id}` }
  }

  /** Public by (unguessable) id so <img>/<audio> just work; served with a fixed type and no sniffing. */
  @Get(':id')
  async get(@Param('id') id: string, @Res() res: Response) {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new NotFoundException()
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } })
    const file = join(DIR, id)
    if (!asset || !existsSync(file)) throw new NotFoundException()
    res.setHeader('Content-Type', asset.mime)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    res.sendFile(file) // supports Range requests (audio seeking)
  }
}
