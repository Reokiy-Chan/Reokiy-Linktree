import path from 'path'
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'fs'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Visit {
  id: string
  page: string
  timestamp: string
  country?: string
  countryCode?: string
  city?: string
  lat?: number
  lon?: number
  referrer?: string
  ip?: string
  ua?: string
  browser?: string
  os?: string
  device?: string
  sessionId?: string
  isNew?: boolean
  duration?: number // seconds, set by updateVisitDuration
}

export interface VisitsData {
  visits: Visit[]
}

export interface SessionSummary {
  id: string
  sessionId: string
  pages: string[]
  duration: number
  device: string
  browser: string
  os: string
  country: string
  city?: string
  isNew: boolean
  firstSeen: string
}

export interface Stats {
  total: number
  unique: number
  topPage: string
  topCountry: string
  topCountryCode: string
  activeLastHour: number
  bounceRate: number
  avgDuration: number
  deltaTotal: number
  deltaUnique: number
  byPage: { page: string; count: number }[]
  byCountry: { country: string; code: string; count: number }[]
  byDay: { date: string; count: number }[]
  byDayHour: { day: number; hour: number; count: number }[]
  byReferrer: { referrer: string; count: number }[]
  byDevice: { device: string; count: number }[]
  byBrowser: { browser: string; count: number }[]
  byOS: { os: string; count: number }[]
  sessions: SessionSummary[]
  recent: Visit[]
}

// ─── User-agent parser ────────────────────────────────────────────────────────

export function parseUA(ua: string): { browser: string; os: string; device: string } {
  const u = ua.toLowerCase()
  let browser = 'Other'
  if (u.includes('edg/'))                                  browser = 'Edge'
  else if (u.includes('opr/') || u.includes('opera'))     browser = 'Opera'
  else if (u.includes('firefox'))                          browser = 'Firefox'
  else if (u.includes('chrome'))                           browser = 'Chrome'
  else if (u.includes('safari') && !u.includes('chrome')) browser = 'Safari'

  let os = 'Other'
  if      (u.includes('windows'))                        os = 'Windows'
  else if (u.includes('iphone') || u.includes('ipad'))   os = 'iOS'
  else if (u.includes('android'))                        os = 'Android'
  else if (u.includes('mac os'))                         os = 'macOS'
  else if (u.includes('linux'))                          os = 'Linux'

  let device = 'desktop'
  if      (u.includes('iphone') || (u.includes('android') && u.includes('mobile'))) device = 'mobile'
  else if (u.includes('ipad')   || (u.includes('android') && !u.includes('mobile'))) device = 'tablet'

  return { browser, os, device }
}

// ─── Storage backend ──────────────────────────────────────────────────────────

const ON_VERCEL  = !!process.env.VERCEL
const USE_KV     = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
const KV_KEY     = 'reokiy:visits'
const KV_DUR     = 'reokiy:durations'
const MAX_VISITS = 10000

// ─── Vercel guard ─────────────────────────────────────────────────────────────
// On Vercel each serverless invocation gets an isolated, ephemeral /tmp that is
// NOT shared with other instances and is wiped when the instance recycles.
// Writing visit data there means it silently disappears — this is the cause of
// data loss and sync failures when multiple users access the panel concurrently.
// Upstash Redis is the only supported persistence backend on Vercel.
if (ON_VERCEL && !USE_KV) {
  throw new Error(
    '[data] Running on Vercel without Redis. ' +
    'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your Vercel project ' +
    'settings (Storage → Upstash Redis → Connect). ' +
    'The /tmp filesystem fallback does NOT persist between serverless invocations.'
  )
}

// ─── Local filesystem fallback (dev only) ────────────────────────────────────
const DATA_DIR    = path.join(process.cwd(), 'data')
const VISITS_FILE = path.join(DATA_DIR, 'visits.json')

function fsRead(): Visit[] {
  try {
    if (!existsSync(VISITS_FILE)) return []
    return (JSON.parse(readFileSync(VISITS_FILE, 'utf-8')) as VisitsData).visits ?? []
  } catch { return [] }
}

function fsWrite(visits: Visit[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    // Write to a temp file then rename — atomic on the same filesystem,
    // prevents partial-write corruption if the process is interrupted.
    const tmp = VISITS_FILE + '.tmp'
    writeFileSync(tmp, JSON.stringify({ visits }, null, 2))
    renameSync(tmp, VISITS_FILE)
  } catch {}
}

// ─── Public async API ─────────────────────────────────────────────────────────

export async function readVisits(): Promise<VisitsData> {
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis'); const kv = Redis.fromEnv()
    const [items, durations] = await Promise.all([
      kv.lrange<Visit>(KV_KEY, 0, MAX_VISITS - 1),
      kv.hgetall<Record<string, number>>(KV_DUR),
    ])
    const visits = items.reverse() // LPUSH → newest first; reverse to oldest-first
    // Merge durations into visits (keyed by sessionId)
    if (durations) {
      for (const v of visits) {
        if (v.sessionId && durations[v.sessionId] != null) {
          v.duration = durations[v.sessionId]
        }
      }
    }
    return { visits }
  }
  return { visits: fsRead() }
}

export async function addVisit(visit: Omit<Visit, 'id'>): Promise<void> {
  const v: Visit = { ...visit, id: crypto.randomUUID() }
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis'); const kv = Redis.fromEnv()
    await kv.lpush(KV_KEY, v)
    await kv.ltrim(KV_KEY, 0, MAX_VISITS - 1)
    return
  }
  const visits = fsRead()
  visits.push(v)
  if (visits.length > MAX_VISITS) visits.splice(0, visits.length - MAX_VISITS)
  fsWrite(visits)
}

export async function updateVisitDuration(sessionId: string, _page: string, duration: number): Promise<void> {
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis'); const kv = Redis.fromEnv()
    await kv.hset(KV_DUR, { [sessionId]: duration })
    return
  }
  // Filesystem: update duration on all visits of this session
  const visits = fsRead()
  let changed = false
  for (const v of visits) {
    if (v.sessionId === sessionId) { v.duration = duration; changed = true }
  }
  if (changed) fsWrite(visits)
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function computeStats(visits: Visit[]): Stats {
  const pageCount    = new Map<string, number>()
  const countryCount = new Map<string, { country: string; code: string; count: number }>()
  const ipSet        = new Set<string>()
  const dayCount     = new Map<string, number>()
  const dayHourCount = new Map<string, number>()
  const refCount     = new Map<string, number>()
  const deviceCount  = new Map<string, number>()
  const browserCount = new Map<string, number>()
  const osCount      = new Map<string, number>()

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneDayAgo    = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysAgo   = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const oneHourAgo   = new Date(now.getTime() - 60 * 60 * 1000)

  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const yStart     = new Date(todayStart.getTime() - 86400000)

  let todayTotal = 0, yTotal = 0
  const todayIps = new Set<string>(), yIps = new Set<string>()
  const activeIps = new Set<string>()

  for (const v of visits) {
    const ts = new Date(v.timestamp)
    pageCount.set(v.page, (pageCount.get(v.page) ?? 0) + 1)
    if (v.ip) {
      ipSet.add(v.ip)
      if (ts >= oneHourAgo) activeIps.add(v.ip)
      if (ts >= todayStart)  { todayIps.add(v.ip); todayTotal++ }
      if (ts >= yStart && ts < todayStart) { yIps.add(v.ip); yTotal++ }
    }
    if (v.country && v.countryCode) {
      const cur = countryCount.get(v.countryCode)
      countryCount.set(v.countryCode, { country: v.country, code: v.countryCode, count: (cur?.count ?? 0) + 1 })
    }
    if (v.referrer) {
      try { const ref = new URL(v.referrer).hostname; refCount.set(ref, (refCount.get(ref) ?? 0) + 1) } catch {}
    }
    if (ts >= sevenDaysAgo) {
      const day = ts.toISOString().slice(0, 10)
      dayCount.set(day, (dayCount.get(day) ?? 0) + 1)
    }
    // Heatmap: day-of-week (Mon=0) × hour
    const dow = ts.getDay() === 0 ? 6 : ts.getDay() - 1
    const dh = `${dow}:${ts.getHours()}`
    dayHourCount.set(dh, (dayHourCount.get(dh) ?? 0) + 1)

    if (v.device)  deviceCount.set(v.device,  (deviceCount.get(v.device)  ?? 0) + 1)
    if (v.browser) browserCount.set(v.browser, (browserCount.get(v.browser) ?? 0) + 1)
    if (v.os)      osCount.set(v.os,          (osCount.get(v.os)          ?? 0) + 1)
  }

  // 7-day series
  const byDay: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const day = d.toISOString().slice(0, 10)
    byDay.push({ date: day, count: dayCount.get(day) ?? 0 })
  }

  const byDayHour = [...dayHourCount.entries()].map(([k, count]) => {
    const [day, hour] = k.split(':').map(Number)
    return { day, hour, count }
  })

  const byPage      = [...pageCount.entries()].map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count).slice(0, 10)
  const byCountry   = [...countryCount.values()].sort((a, b) => b.count - a.count).slice(0, 10)
  const byReferrer  = [...refCount.entries()].map(([referrer, count]) => ({ referrer, count })).sort((a, b) => b.count - a.count).slice(0, 10)
  const byDevice    = [...deviceCount.entries()].map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count)
  const byBrowser   = [...browserCount.entries()].map(([browser, count]) => ({ browser, count })).sort((a, b) => b.count - a.count)
  const byOS        = [...osCount.entries()].map(([os, count]) => ({ os, count })).sort((a, b) => b.count - a.count)

  // Sessions
  const sessionMap = new Map<string, SessionSummary>()
  for (const v of visits) {
    const sid = v.sessionId ?? v.id
    if (!sessionMap.has(sid)) {
      sessionMap.set(sid, {
        id: sid, sessionId: sid, pages: [], duration: v.duration ?? 0,
        device: v.device ?? 'desktop', browser: v.browser ?? 'Other',
        os: v.os ?? 'Other', country: v.country ?? '—', city: v.city,
        isNew: v.isNew ?? true, firstSeen: v.timestamp,
      })
    }
    const s = sessionMap.get(sid)!
    if (!s.pages.includes(v.page)) s.pages.push(v.page)
    if (v.duration && v.duration > s.duration) s.duration = v.duration
  }

  const sessions = [...sessionMap.values()].sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))
  const bounceCount = sessions.filter(s => s.pages.length === 1).length
  const bounceRate  = sessions.length > 0 ? Math.round(bounceCount / sessions.length * 100) : 0
  const durSessions = sessions.filter(s => s.duration > 0)
  const avgDuration = durSessions.length > 0 ? Math.round(durSessions.reduce((acc, s) => acc + s.duration, 0) / durSessions.length) : 0

  const pct = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round((a - b) / b * 100)

  return {
    total: visits.length,
    unique: ipSet.size,
    topPage: byPage[0]?.page ?? '/',
    topCountry: byCountry[0]?.country ?? '—',
    topCountryCode: byCountry[0]?.code ?? '',
    activeLastHour: activeIps.size,
    bounceRate,
    avgDuration,
    deltaTotal: pct(todayTotal, yTotal),
    deltaUnique: pct(todayIps.size, yIps.size),
    byPage, byCountry, byDay, byDayHour, byReferrer, byDevice, byBrowser, byOS,
    sessions: sessions.slice(0, 50),
    recent: [...visits].reverse().slice(0, 20),
  }
}