import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

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
  isBot?: boolean
  botReason?: string
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
  // Bot stats
  botTotal?: number
  humanTotal?: number
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

import { USE_KV, getRedis } from './redis'
const KV_KEY = 'reokiy:visits'
const KV_DUR = 'reokiy:durations'
const MAX_VISITS = 10000

const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
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
    writeFileSync(VISITS_FILE, JSON.stringify({ visits }, null, 2))
  } catch {}
}

// ─── Public async API ─────────────────────────────────────────────────────────

export async function readVisits(): Promise<VisitsData> {
  if (USE_KV) {
    const kv = await getRedis()
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
    const kv = await getRedis()
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
    const kv = await getRedis()
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
  // Separate human vs bot traffic for accurate stats
  const humanVisits = visits.filter(v => !v.isBot)

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
  const oneHourAgo   = new Date(now.getTime() - 60 * 60 * 1000)

  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const yStart     = new Date(todayStart.getTime() - 86400000)

  let todayTotal = 0, yTotal = 0
  const todayIps = new Set<string>(), yIps = new Set<string>()
  const activeIps = new Set<string>()

  // Only count human visits in stats
  for (const v of humanVisits) {
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

  // 7-day series (human only)
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

  // Sessions (human only)
  const sessionMap = new Map<string, SessionSummary>()
  const sessionPageSets = new Map<string, Set<string>>()
  for (const v of humanVisits) {
    const sid = v.sessionId ?? v.id
    if (!sessionMap.has(sid)) {
      sessionMap.set(sid, {
        id: sid, sessionId: sid, pages: [], duration: v.duration ?? 0,
        device: v.device ?? 'desktop', browser: v.browser ?? 'Other',
        os: v.os ?? 'Other', country: v.country ?? '—', city: v.city,
        isNew: v.isNew ?? true, firstSeen: v.timestamp,
      })
      sessionPageSets.set(sid, new Set())
    }
    const s = sessionMap.get(sid)!
    const pSet = sessionPageSets.get(sid)!
    if (!pSet.has(v.page)) { pSet.add(v.page); s.pages.push(v.page) }
    if (v.duration && v.duration > s.duration) s.duration = v.duration
  }

  const sessions = [...sessionMap.values()].sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))
  const bounceCount = sessions.filter(s => s.pages.length === 1).length
  const bounceRate  = sessions.length > 0 ? Math.round(bounceCount / sessions.length * 100) : 0
  const durSessions = sessions.filter(s => s.duration > 0)
  const avgDuration = durSessions.length > 0 ? Math.round(durSessions.reduce((acc, s) => acc + s.duration, 0) / durSessions.length) : 0

  const pct = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round((a - b) / b * 100)

  const botTotal   = visits.filter(v => v.isBot).length
  const humanTotal = humanVisits.length

  return {
    total: humanTotal,  // total = only human traffic
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
    botTotal,
    humanTotal,
  }
}

// ─── Bot detection ────────────────────────────────────────────────────────────
//
// Multi-signal detection: UA pattern matching + header analysis + behavioral signals.
// Returns { isBot, reason, confidence } where confidence is 'definite' | 'likely' | 'possible'.

const BOT_UA_PATTERNS: RegExp[] = [
  // Search engine crawlers
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /sogou/i, /exabot/i, /facebookexternalhit/i, /ia_archiver/i,
  /mj12bot/i, /ahrefsbot/i, /semrushbot/i, /rogerbot/i, /dotbot/i,
  /screaming.?frog/i, /applebot/i, /twitterbot/i, /linkedinbot/i,
  /discordbot/i, /slackbot/i, /telegrambot/i, /whatsapp/i,
  // Generic crawlers/scrapers
  /\bcrawler\b/i, /\bspider\b/i, /\bscraper\b/i, /\bbot\b/i,
  // HTTP clients / automation
  /curl\//i, /wget\//i, /python-requests/i, /go-http-client/i,
  /axios\//i, /node-fetch/i, /okhttp/i, /apache-httpclient/i,
  /java\//i, /libwww-perl/i, /lwp-trivial/i, /httpclient/i,
  /undici/i, /got\//i, /superagent/i, /request\//i,
  // Headless / automation
  /headlesschrome/i, /phantomjs/i, /selenium/i, /puppeteer/i,
  /playwright/i, /cypress/i, /webdriver/i,
  // Monitoring/uptime tools
  /pingdom/i, /uptimerobot/i, /statuscake/i, /zabbix/i,
  /newrelic/i, /datadog/i, /site24x7/i, /hetrixtools/i,
  /monitor/i, /health.?check/i,
  // AI crawlers
  /gptbot/i, /chatgpt-user/i, /claude-web/i, /anthropic/i,
  /cohere-ai/i, /perplexitybot/i, /youbot/i,
]

// Known legit UAs that look sus but aren't bots
const ALLOW_LIST: RegExp[] = [
  /facebookexternalhit\/1\.1 \(https?:\/\/www\.facebook\.com/i, // FB preview but real user
]

// Sec-ch-ua patterns indicating headless/automation
const HEADLESS_SEC_CH_UA = /HeadlessChrome|Headless/i

// Sec-fetch-site values that suggest scripted access (no real navigation)
const BOT_FETCH_SITES = new Set(['none']) // 'none' alone without other signals = suspicious

export function detectBot(
  ua: string,
  headers?: Headers
): { isBot: boolean; reason?: string; confidence?: 'definite' | 'likely' | 'possible' } {
  const u = ua.trim()

  // 1. Empty or suspiciously short UA
  if (!u || u.length < 8) {
    return { isBot: true, reason: 'empty-ua', confidence: 'definite' }
  }

  // 2. Allowlist — known legitimate bots we want to pass through (rare)
  for (const pattern of ALLOW_LIST) {
    if (pattern.test(u)) return { isBot: false }
  }

  // 3. Known bot UA pattern
  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(u)) return { isBot: true, reason: 'bot-ua', confidence: 'definite' }
  }

  if (headers) {
    // 4. Missing Accept-Language — real browsers always send this
    const acceptLang = headers.get('accept-language')
    if (!acceptLang) {
      return { isBot: true, reason: 'no-accept-language', confidence: 'likely' }
    }

    // 5. Headless Chrome via sec-ch-ua
    const secCh = headers.get('sec-ch-ua')
    if (secCh && HEADLESS_SEC_CH_UA.test(secCh)) {
      return { isBot: true, reason: 'headless-chrome', confidence: 'definite' }
    }

    // 6. Missing Accept header (real browsers always send it)
    const accept = headers.get('accept')
    if (!accept) {
      return { isBot: true, reason: 'no-accept', confidence: 'likely' }
    }

    // 7. sec-fetch-mode = 'navigate' with sec-fetch-site = 'none' is normal for direct navigation.
    // But if it's an API call with no sec-fetch headers at all (and UA looks real), flag as possible.
    const secFetchMode = headers.get('sec-fetch-mode')
    const secFetchSite = headers.get('sec-fetch-site')
    const hasBrowserSec = !!(secFetchMode || secFetchSite || headers.get('sec-fetch-dest'))

    // 8. Verify browser UA structure — must have Mozilla/5.0 + WebKit or Gecko engine
    const hasMozilla = /Mozilla\/5\.0/i.test(u)
    const hasEngine  = /AppleWebKit|Gecko|Trident/i.test(u)

    if (!hasMozilla || !hasEngine) {
      // Not a standard browser UA — but be lenient if it has Accept-Language
      // (could be a custom app or extension)
      if (acceptLang) {
        return { isBot: true, reason: 'non-browser-ua', confidence: 'likely' }
      }
      return { isBot: true, reason: 'non-browser-ua', confidence: 'definite' }
    }

    // 9. Real browser clients from 2022+ always send sec-ch-ua family headers.
    // If UA claims to be Chrome 90+ but no sec-ch-ua, it's spoofing.
    const chromeVersionMatch = u.match(/Chrome\/(\d+)/i)
    if (chromeVersionMatch) {
      const majorVersion = parseInt(chromeVersionMatch[1], 10)
      if (majorVersion >= 90 && !secCh && !hasBrowserSec) {
        return { isBot: true, reason: 'chrome-spoofing', confidence: 'likely' }
      }
    }
  } else {
    // No headers provided — rely solely on UA
    const hasMozilla = /Mozilla\/5\.0/i.test(u)
    const hasEngine  = /AppleWebKit|Gecko|Trident/i.test(u)
    if (!hasMozilla || !hasEngine) {
      return { isBot: true, reason: 'non-browser-ua', confidence: 'likely' }
    }
  }

  return { isBot: false }
}