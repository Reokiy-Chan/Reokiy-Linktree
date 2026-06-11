import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { USE_KV, getRedis } from './redis'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceEntry {
  sessionId: string
  lastSeen: number       // epoch ms
  connectedAt: number    // epoch ms
  page: string
  country?: string
  countryCode?: string
  city?: string
  lat?: number
  lon?: number
}

// A session is "online" if it sent a heartbeat within this window.
// The client heartbeats every 15s, so 40s tolerates two missed beats.
const ONLINE_TTL = 40_000
// Entries older than this get pruned from storage entirely.
const PRUNE_TTL = 10 * 60_000

// ─── Storage ──────────────────────────────────────────────────────────────────

const KV_KEY = 'reokiy:presence'
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const PRESENCE_FILE = path.join(DATA_DIR, 'presence.json')

function fsRead(): Record<string, PresenceEntry> {
  try {
    if (!existsSync(PRESENCE_FILE)) return {}
    return JSON.parse(readFileSync(PRESENCE_FILE, 'utf-8')) as Record<string, PresenceEntry>
  } catch { return {} }
}

function fsWrite(map: Record<string, PresenceEntry>): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(PRESENCE_FILE, JSON.stringify(map))
  } catch {}
}

function prune(map: Record<string, PresenceEntry>): Record<string, PresenceEntry> {
  const now = Date.now()
  const out: Record<string, PresenceEntry> = {}
  for (const [k, v] of Object.entries(map)) {
    if (now - v.lastSeen < PRUNE_TTL) out[k] = v
  }
  return out
}

async function readMap(): Promise<Record<string, PresenceEntry>> {
  if (USE_KV) {
    const kv = await getRedis()
    const raw = await kv.hgetall<Record<string, PresenceEntry>>(KV_KEY)
    return raw ?? {}
  }
  return fsRead()
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function touchPresence(
  sessionId: string,
  info: { page?: string; country?: string; countryCode?: string; city?: string; lat?: number; lon?: number },
): Promise<void> {
  const now = Date.now()
  if (USE_KV) {
    const kv = await getRedis()
    const existing = await kv.hget<PresenceEntry>(KV_KEY, sessionId)
    const entry: PresenceEntry = {
      sessionId,
      connectedAt: existing && now - existing.lastSeen < ONLINE_TTL ? existing.connectedAt : now,
      lastSeen: now,
      page: info.page ?? existing?.page ?? '/',
      country: info.country ?? existing?.country,
      countryCode: info.countryCode ?? existing?.countryCode,
      city: info.city ?? existing?.city,
      lat: info.lat ?? existing?.lat,
      lon: info.lon ?? existing?.lon,
    }
    await kv.hset(KV_KEY, { [sessionId]: entry })
    return
  }
  const map = prune(fsRead())
  const existing = map[sessionId]
  map[sessionId] = {
    sessionId,
    connectedAt: existing && now - existing.lastSeen < ONLINE_TTL ? existing.connectedAt : now,
    lastSeen: now,
    page: info.page ?? existing?.page ?? '/',
    country: info.country ?? existing?.country,
    countryCode: info.countryCode ?? existing?.countryCode,
    city: info.city ?? existing?.city,
    lat: info.lat ?? existing?.lat,
    lon: info.lon ?? existing?.lon,
  }
  fsWrite(map)
}

export async function dropPresence(sessionId: string): Promise<void> {
  if (USE_KV) {
    const kv = await getRedis()
    await kv.hdel(KV_KEY, sessionId)
    return
  }
  const map = fsRead()
  if (map[sessionId]) { delete map[sessionId]; fsWrite(map) }
}

/** Sessions seen within ONLINE_TTL. Also prunes long-dead entries from storage. */
export async function getOnlineSessions(): Promise<PresenceEntry[]> {
  const now = Date.now()
  const map = await readMap()
  const online: PresenceEntry[] = []
  const stale: string[] = []
  for (const [k, v] of Object.entries(map)) {
    if (now - v.lastSeen < ONLINE_TTL) online.push(v)
    else if (now - v.lastSeen > PRUNE_TTL) stale.push(k)
  }
  if (stale.length) {
    if (USE_KV) {
      try { const kv = await getRedis(); await kv.hdel(KV_KEY, ...stale) } catch {}
    } else {
      const next = { ...map }
      for (const k of stale) delete next[k]
      fsWrite(next)
    }
  }
  return online.sort((a, b) => b.connectedAt - a.connectedAt)
}
