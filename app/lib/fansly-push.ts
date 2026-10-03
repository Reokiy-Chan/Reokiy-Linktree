import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { USE_KV, getRedis } from './redis'

// Browser "notify me" subscriptions (Web Push). Stored as a hash keyed by endpoint.

export interface PushSub {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

const KV_KEY = 'reokiy:fansly-push'
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'fansly-push.json')

export const MAX_SUBS = 5000

export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

function fsRead(): Record<string, PushSub> {
  try {
    if (!existsSync(FILE)) return {}
    return JSON.parse(readFileSync(FILE, 'utf-8')) as Record<string, PushSub>
  } catch { return {} }
}

function fsWrite(map: Record<string, PushSub>): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(FILE, JSON.stringify(map))
  } catch {}
}

export async function listSubs(): Promise<PushSub[]> {
  if (USE_KV) {
    const kv = await getRedis()
    const raw = await kv.hgetall<Record<string, PushSub>>(KV_KEY)
    return Object.values(raw ?? {})
  }
  return Object.values(fsRead())
}

export async function countSubs(): Promise<number> {
  if (USE_KV) return (await getRedis()).hlen(KV_KEY)
  return Object.keys(fsRead()).length
}

export function validSub(raw: unknown): PushSub | null {
  const s = raw as Partial<PushSub> | null
  if (!s || typeof s.endpoint !== 'string' || !s.keys) return null
  if (typeof s.keys.p256dh !== 'string' || typeof s.keys.auth !== 'string') return null
  try {
    const u = new URL(s.endpoint)
    if (u.protocol !== 'https:') return null
  } catch { return null }
  if (s.endpoint.length > 600) return null
  return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }
}

export async function addSub(sub: PushSub): Promise<boolean> {
  if ((await countSubs()) >= MAX_SUBS) return false
  if (USE_KV) {
    await (await getRedis()).hset(KV_KEY, { [sub.endpoint]: sub })
  } else {
    const map = fsRead(); map[sub.endpoint] = sub; fsWrite(map)
  }
  return true
}

export async function removeSub(endpoint: string): Promise<void> {
  if (USE_KV) {
    await (await getRedis()).hdel(KV_KEY, endpoint)
  } else {
    const map = fsRead(); delete map[endpoint]; fsWrite(map)
  }
}
