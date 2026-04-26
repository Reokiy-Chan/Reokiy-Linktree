import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
const VISITS_FILE = path.join(DATA_DIR, 'visits.json')

export interface Visit {
  id: string
  page: string
  timestamp: string
  country?: string
  countryCode?: string
  city?: string
  referrer?: string
  ip?: string
}

export interface VisitsData {
  visits: Visit[]
}

export function readVisits(): VisitsData {
  try {
    if (!existsSync(VISITS_FILE)) return { visits: [] }
    const content = readFileSync(VISITS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { visits: [] }
  }
}

export function writeVisits(data: VisitsData): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(VISITS_FILE, JSON.stringify(data, null, 2))
  } catch {
    // Silently fail on read-only filesystems (e.g. Vercel serverless)
  }
}

export function addVisit(visit: Omit<Visit, 'id'>): void {
  const data = readVisits()
  data.visits.push({ ...visit, id: crypto.randomUUID() })
  if (data.visits.length > 10000) data.visits = data.visits.slice(-10000)
  writeVisits(data)
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
}

export function computeStats(visits: Visit[]): Stats {
  const pageCount = new Map<string, number>()
  const countryCount = new Map<string, { name: string; code: string; count: number }>()
  const ipSet = new Set<string>()
  const dayCount = new Map<string, number>()
  const refCount = new Map<string, number>()

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  for (const v of visits) {
    pageCount.set(v.page, (pageCount.get(v.page) ?? 0) + 1)
    if (v.ip) ipSet.add(v.ip)
    if (v.country && v.countryCode) {
      const cur = countryCount.get(v.countryCode)
      countryCount.set(v.countryCode, {
        name: v.country,
        code: v.countryCode,
        count: (cur?.count ?? 0) + 1,
      })
    }
    if (v.referrer && v.referrer !== '') {
      try {
        const ref = new URL(v.referrer).hostname
        refCount.set(ref, (refCount.get(ref) ?? 0) + 1)
      } catch {}
    }
    const d = new Date(v.timestamp)
    if (d >= sevenDaysAgo) {
      const day = d.toISOString().slice(0, 10)
      dayCount.set(day, (dayCount.get(day) ?? 0) + 1)
    }
  }

  const byDay: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const day = d.toISOString().slice(0, 10)
    byDay.push({ date: day, count: dayCount.get(day) ?? 0 })
  }

  const byPage = [...pageCount.entries()]
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const byCountry = [...countryCount.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const byReferrer = [...refCount.entries()]
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    total: visits.length,
    unique: ipSet.size,
    topPage: byPage[0]?.page ?? '/',
    topCountry: byCountry[0]?.name ?? '—',
    topCountryCode: byCountry[0]?.code ?? '',
    byPage,
    byCountry,
    byDay,
    byReferrer,
    recent: [...visits].reverse().slice(0, 20),
  }
}