import { Injectable, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

/** Live quiz state lives in Redis, not Postgres (spec §18): room:{quiz_id}:... keys. */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null })

  async getJson<T>(key: string): Promise<T | null> {
    const v = await this.client.get(key)
    return v ? (JSON.parse(v) as T) : null
  }
  async setJson(key: string, value: unknown): Promise<void> {
    await this.client.set(key, JSON.stringify(value))
  }
  async del(...keys: string[]) {
    if (keys.length) await this.client.del(...keys)
  }
  async onModuleDestroy() {
    this.client.disconnect()
  }
}
