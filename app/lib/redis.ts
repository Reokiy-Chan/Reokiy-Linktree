import type { Redis as RedisType } from '@upstash/redis'

export const USE_KV = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

// Warn at startup if running on Vercel without KV configured.
// /tmp is wiped on every cold start → all data is lost.
if (process.env.VERCEL && !USE_KV) {
  console.error(
    '\n[reokiy] ⚠️  DATA IN DANGER: running on Vercel without Upstash Redis.' +
    '\nAll data goes to /tmp and WILL be lost on every cold start / new deployment.' +
    '\nFix: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel → Settings → Environment Variables.\n'
  )
}

// Module-level singleton — reused across warm invocations in the same container.
let _redis: RedisType | null = null

export async function getRedis(): Promise<RedisType> {
  if (!_redis) {
    const { Redis } = await import('@upstash/redis')
    _redis = Redis.fromEnv()
  }
  return _redis
}