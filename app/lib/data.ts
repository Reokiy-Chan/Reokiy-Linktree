import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

// Vercel's project filesystem is read-only at runtime; /tmp IS writable.
// In dev we keep using the project's data/ dir so data persists across restarts.
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const VISITS_FILE = path.join(DATA_DIR, 'visits.json')

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
  duration?: number
  isNew?: boolean
}

export interface VisitsData { visits: Visit[] }

export function readVisits(): VisitsData {
  try {
    if (!existsSync(VISITS_FILE)) return { visits: [] }
    return JSON.parse(readFileSync(VISITS_FILE, 'utf-8'))
  } catch { return { visits: [] } }
}

export function writeVisits(data: VisitsData): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(VISITS_FILE, JSON.stringify(data, null, 2))
  } catch {}
}

export function addVisit(visit: Omit<Visit, 'id'>): void {
  const data = readVisits()
  data.visits.push({ ...visit, id: crypto.randomUUID() })
  if (data.visits.length > 10000) data.visits = data.visits.slice(-10000)
  writeVisits(data)
}

export function updateVisitDuration(sessionId: string, page: string, duration: number): void {
  const data = readVisits()
  for (let i = data.visits.length - 1; i >= 0; i--) {
    if (data.visits[i].sessionId === sessionId && data.visits[i].page === page) {
      data.visits[i].duration = duration
      break
    }
  }
  writeVisits(data)
}

export function parseUA(ua: string): { browser: string; os: string; device: string } {
  const mobile = /Mobile|Android|iPhone|iPad|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const tablet = /iPad|Android(?!.*Mobile)/i.test(ua)
  let os = 'Otro'
  if (/Windows NT/i.test(ua)) os = 'Windows'
  else if (/Mac OS X/i.test(ua)) os = 'macOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS'
  else if (/Linux/i.test(ua)) os = 'Linux'
  else if (/CrOS/i.test(ua)) os = 'ChromeOS'
  let browser = 'Otro'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/OPR\//i.test(ua)) browser = 'Opera'
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Safari\//i.test(ua)) browser = 'Safari'
  const device = tablet ? 'tablet' : mobile ? 'mobile' : 'desktop'
  return { browser, os, device }
}

export interface SessionSummary {
  sessionId: string
  pages: string[]
  country?: string
  city?: string
  browser?: string
  os?: string
  device?: string
  duration: number
  isNew?: boolean
  firstSeen: string
}

export interface Stats {
  total: number
  unique: number
  topPage: string
  topCountry: string
  topCountryCode: string
  byPage: { page: string; count: number }[]
  byCountry: { country: string; code: string; count: number }[]
  byDay: { date: string; count: number }[]
  byReferrer: { referrer: string; count: number }[]
  recent: Visit[]
  byHour: { hour: number; count: number }[]
  byDayHour: { day: number; hour: number; count: number }[]
  byBrowser: { browser: string; count: number }[]
  byOS: { os: string; count: number }[]
  byDevice: { device: string; count: number }[]
  bounceRate: number
  avgDuration: number
  deltaTotal: number
  deltaUnique: number
  sessions: SessionSummary[]
  hotPaths: { from: string; to: string; count: number }[]
  activeLastHour: number
}

export function computeStats(visits: Visit[]): Stats {
  const pageCount = new Map<string, number>()
  const countryCount = new Map<string, { country: string; code: string; count: number }>()
  const ipSet = new Set<string>()
  const dayCount = new Map<string, number>()
  const refCount = new Map<string, number>()
  const hourCount = new Map<number, number>()
  const dayHourCount = new Map<string, number>()
  const browserCount = new Map<string, number>()
  const osCount = new Map<string, number>()
  const deviceCount = new Map<string, number>()

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  let totalToday = 0, totalYesterday = 0, activeLastHour = 0
  const uniqueToday = new Set<string>()
  const uniqueYesterday = new Set<string>()
  const sessionMap = new Map<string, { pages: string[]; visit: Visit }>()
  const sessionOrder: string[] = []

  for (const v of visits) {
    const d = new Date(v.timestamp)
    pageCount.set(v.page, (pageCount.get(v.page) ?? 0) + 1)
    if (v.ip) ipSet.add(v.ip)
    if (v.country && v.countryCode) {
      const cur = countryCount.get(v.countryCode)
      countryCount.set(v.countryCode, { country: v.country, code: v.countryCode, count: (cur?.count ?? 0) + 1 })
    }
    if (v.referrer) {
      try { const ref = new URL(v.referrer).hostname; refCount.set(ref, (refCount.get(ref) ?? 0) + 1) } catch {}
    }
    if (d >= sevenDaysAgo) {
      const day = d.toISOString().slice(0, 10)
      dayCount.set(day, (dayCount.get(day) ?? 0) + 1)
    }
    if (d >= oneDayAgo) { totalToday++; if (v.ip) uniqueToday.add(v.ip) }
    else if (d >= twoDaysAgo) { totalYesterday++; if (v.ip) uniqueYesterday.add(v.ip) }
    if (d >= oneHourAgo) activeLastHour++

    const hour = d.getHours()
    hourCount.set(hour, (hourCount.get(hour) ?? 0) + 1)
    const dow = (d.getDay() + 6) % 7
    const dhKey = `${dow}:${hour}`
    dayHourCount.set(dhKey, (dayHourCount.get(dhKey) ?? 0) + 1)

    if (v.browser) browserCount.set(v.browser, (browserCount.get(v.browser) ?? 0) + 1)
    if (v.os) osCount.set(v.os, (osCount.get(v.os) ?? 0) + 1)
    if (v.device) deviceCount.set(v.device, (deviceCount.get(v.device) ?? 0) + 1)

    if (v.sessionId) {
      if (!sessionMap.has(v.sessionId)) { sessionMap.set(v.sessionId, { pages: [], visit: v }); sessionOrder.push(v.sessionId) }
      sessionMap.get(v.sessionId)!.pages.push(v.page)
    }
  }

  const byDay: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const day = d.toISOString().slice(0, 10)
    byDay.push({ date: day, count: dayCount.get(day) ?? 0 })
  }

  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourCount.get(h) ?? 0 }))
  const byDayHour: { day: number; hour: number; count: number }[] = []
  for (let day = 0; day < 7; day++)
    for (let hour = 0; hour < 24; hour++)
      byDayHour.push({ day, hour, count: dayHourCount.get(`${day}:${hour}`) ?? 0 })

  const byPage = [...pageCount.entries()].map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count).slice(0, 10)
  const byCountry = [...countryCount.values()].sort((a, b) => b.count - a.count).slice(0, 10)
  const byReferrer = [...refCount.entries()].map(([referrer, count]) => ({ referrer, count })).sort((a, b) => b.count - a.count).slice(0, 10)
  const byBrowser = [...browserCount.entries()].map(([browser, count]) => ({ browser, count })).sort((a, b) => b.count - a.count)
  const byOS = [...osCount.entries()].map(([os, count]) => ({ os, count })).sort((a, b) => b.count - a.count)
  const byDevice = [...deviceCount.entries()].map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count)

  let bounceSessions = 0, totalSess = 0, totalDur = 0, durCount = 0
  const sessions: SessionSummary[] = []
  for (const sid of [...sessionOrder].reverse().slice(0, 50)) {
    const s = sessionMap.get(sid)!
    totalSess++
    if (s.pages.length === 1) bounceSessions++
    const dur = visits.filter(v => v.sessionId === sid).reduce((a, v) => a + (v.duration ?? 0), 0)
    if (dur > 0) { totalDur += dur; durCount++ }
    sessions.push({ sessionId: sid.slice(0, 8), pages: s.pages, country: s.visit.country, city: s.visit.city, browser: s.visit.browser, os: s.visit.os, device: s.visit.device, duration: dur, isNew: s.visit.isNew, firstSeen: s.visit.timestamp })
  }

  const pathCount = new Map<string, number>()
  for (const [, s] of sessionMap)
    for (let i = 0; i < s.pages.length - 1; i++) {
      const k = `${s.pages[i]}→${s.pages[i + 1]}`
      pathCount.set(k, (pathCount.get(k) ?? 0) + 1)
    }
  const hotPaths = [...pathCount.entries()]
    .map(([k, count]) => { const [from, to] = k.split('→'); return { from, to, count } })
    .sort((a, b) => b.count - a.count).slice(0, 10)

  return {
    total: visits.length, unique: ipSet.size,
    topPage: byPage[0]?.page ?? '/', topCountry: byCountry[0]?.country ?? '—', topCountryCode: byCountry[0]?.code ?? '',
    byPage, byCountry, byDay, byReferrer, recent: [...visits].reverse().slice(0, 30),
    byHour, byDayHour, byBrowser, byOS, byDevice,
    bounceRate: totalSess > 0 ? Math.round((bounceSessions / totalSess) * 100) : 0,
    avgDuration: durCount > 0 ? Math.round(totalDur / durCount) : 0,
    deltaTotal: totalYesterday > 0 ? Math.round(((totalToday - totalYesterday) / totalYesterday) * 100) : 0,
    deltaUnique: uniqueYesterday.size > 0 ? Math.round(((uniqueToday.size - uniqueYesterday.size) / uniqueYesterday.size) * 100) : 0,
    sessions, hotPaths, activeLastHour,
  }
}