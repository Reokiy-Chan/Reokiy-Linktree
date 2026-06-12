import type { Redis as RedisType } from '@upstash/redis'

// Accept both Upstash-native names and the names Vercel KV integration injects.
const REST_URL   = process.env.UPSTASH_REDIS_REST_URL   ?? process.env.KV_REST_API_URL
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

export const USE_KV = !!(REST_URL && REST_TOKEN)

if (process.env.VERCEL && !USE_KV) {
  console.error(
    '\n[reokiy] ⚠️  DATA IN DANGER: running on Vercel without Upstash Redis.' +
    '\nAll data goes to /tmp and WILL be lost on every cold start / new deployment.' +
    '\nFix: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel → Settings → Environment Variables.\n'
  )
}

let _redis: RedisType | null = null

export async function getRedis(): Promise<RedisType> {
  if (!_redis) {
    const { Redis } = await import('@upstash/redis')
    _redis = new Redis({ url: REST_URL!, token: REST_TOKEN! })
  }
  return _redis
}