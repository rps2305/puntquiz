import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import cookieParser from 'cookie-parser'
import Redis from 'ioredis'
import type { ServerOptions } from 'socket.io'
import { AppModule } from './app.module'

class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>
  connect() {
    const pub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
    const sub = pub.duplicate()
    this.adapterConstructor = createAdapter(pub, sub)
  }
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options)
    server.adapter(this.adapterConstructor)
    return server
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.setGlobalPrefix('api')
  app.useBodyParser('json', { limit: '12mb' }) // bank imports (xlsx as base64)
  app.use(cookieParser())
  app.set('trust proxy', 2) // nginx (CloudPanel) -> Traefik -> api
  const adapter = new RedisIoAdapter(app)
  adapter.connect()
  app.useWebSocketAdapter(adapter)
  app.enableShutdownHooks()
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0')
}
void bootstrap()
