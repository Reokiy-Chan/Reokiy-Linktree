import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { USE_KV, getRedis } from './redis'
import { getOnlineSessions } from './presence'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BannerStyle = 'compact' | 'card' | 'bar'

export interface ScheduledStream {
  id: string
  title: string
  at: string            // ISO start
  endAt?: string        // ISO end (auto-end, only used with autoStart)
  autoStart?: boolean   // turn the live on by itself at `at`
  done?: boolean        // auto-start already fired
}

export interface StreamTemplate {
  id: string
  name: string
  title: string
  url: string
}

export interface StreamRecord {
  id: string
  title: string
  startedAt: string
  endedAt: string
  clicks: number
  peakVisitors: number
  auto: boolean
}

export interface NotifySettings {
  discord: boolean
  bluesky: boolean
  push: boolean
  message: string       // supports {title} and {link}
}

export interface FanslyLiveState {
  isLive: boolean
  title: string
  url: string
  redirectWhenLive: boolean
  bannerStyle: BannerStyle
  ctaText: string
  notify: NotifySettings
  schedule: ScheduledStream[]
  templates: StreamTemplate[]
  history: StreamRecord[]
  // current stream
  liveSince?: string
  autoStarted?: boolean
  autoEndAt?: string
  clicks: number
  peakVisitors: number
  updatedAt: string
}

export const FANSLY_PROFILE_URL = 'https://fansly.com/Reokiy'
export const DEFAULT_MESSAGE = "I'm live on Fansly! {title} {link}"

export const DEFAULT_LIVE: FanslyLiveState = {
  isLive: false,
  title: '',
  url: FANSLY_PROFILE_URL + '/live',
  redirectWhenLive: true,
  bannerStyle: 'compact',
  ctaText: 'join the stream',
  notify: { discord: false, bluesky: false, push: false, message: DEFAULT_MESSAGE },
  schedule: [],
  templates: [],
  history: [],
  clicks: 0,
  peakVisitors: 0,
  updatedAt: new Date(0).toISOString(),
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const KV_KEY = 'reokiy:fansly-live'
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'fansly-live.json')

function merge(stored: Partial<FanslyLiveState> | null | undefined): FanslyLiveState {
  const s = stored ?? {}
  return { ...DEFAULT_LIVE, ...s, notify: { ...DEFAULT_LIVE.notify, ...(s.notify ?? {}) } }
}

function fsRead(): FanslyLiveState {
  try {
    if (!existsSync(FILE)) return merge(null)
    return merge(JSON.parse(readFileSync(FILE, 'utf-8')) as Partial<FanslyLiveState>)
  } catch { return merge(null) }
}

function fsWrite(s: FanslyLiveState): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(FILE, JSON.stringify(s, null, 2))
  } catch {}
}

export async function readLive(): Promise<FanslyLiveState> {
  if (USE_KV) {
    const kv = await getRedis()
    return merge(await kv.get<Partial<FanslyLiveState>>(KV_KEY))
  }
  return fsRead()
}

async function writeLive(next: FanslyLiveState): Promise<FanslyLiveState> {
  next.updatedAt = new Date().toISOString()
  if (USE_KV) {
    const kv = await getRedis()
    await kv.set(KV_KEY, next)
  } else {
    fsWrite(next)
  }
  return next
}

/** Short-lived lock so two simultaneous requests cannot both fire the same auto-start. */
async function acquireLock(name: string): Promise<boolean> {
  if (!USE_KV) return true
  try {
    const kv = await getRedis()
    return (await kv.set(`reokiy:lock:${name}`, '1', { nx: true, ex: 30 })) === 'OK'
  } catch { return false }
}

// ─── Editing (admin) ──────────────────────────────────────────────────────────

/** Edit configuration fields. Going live / offline goes through startStream / endStream. */
export type LiveConfigPatch = Partial<Pick<FanslyLiveState,
  'title' | 'url' | 'redirectWhenLive' | 'bannerStyle' | 'ctaText' | 'notify' | 'schedule' | 'templates'>>

export async function updateConfig(patch: LiveConfigPatch): Promise<FanslyLiveState> {
  const current = await readLive()
  return writeLive({ ...current, ...patch })
}

// ─── Going live / offline ─────────────────────────────────────────────────────

export interface StartOptions {
  title?: string
  url?: string
  auto?: boolean
  autoEndAt?: string
}

/** Marks the stream as live. Returns the new state and whether this call changed anything. */
export async function startStream(opts: StartOptions = {}): Promise<{ state: FanslyLiveState; changed: boolean }> {
  const current = await readLive()
  if (current.isLive) return { state: current, changed: false }
  const state = await writeLive({
    ...current,
    isLive: true,
    title: opts.title ?? current.title,
    url: opts.url ?? current.url,
    liveSince: new Date().toISOString(),
    autoStarted: !!opts.auto,
    autoEndAt: opts.autoEndAt,
    clicks: 0,
    peakVisitors: 0,
  })
  return { state, changed: true }
}

/** Marks the stream as offline and stores it in the history. */
export async function endStream(): Promise<FanslyLiveState> {
  const current = await readLive()
  if (!current.isLive) return current
  const record: StreamRecord = {
    id: crypto.randomUUID(),
    title: current.title || 'Live stream',
    startedAt: current.liveSince ?? new Date().toISOString(),
    endedAt: new Date().toISOString(),
    clicks: current.clicks,
    peakVisitors: current.peakVisitors,
    auto: !!current.autoStarted,
  }
  return writeLive({
    ...current,
    isLive: false,
    liveSince: undefined,
    autoStarted: undefined,
    autoEndAt: undefined,
    clicks: 0,
    peakVisitors: 0,
    history: [record, ...current.history].slice(0, 30),
  })
}

export async function registerLiveClick(): Promise<void> {
  const current = await readLive()
  if (!current.isLive) return
  await writeLive({ ...current, clicks: current.clicks + 1 })
}

// ─── Schedule automation ──────────────────────────────────────────────────────

const START_GRACE_MS = 3 * 3600_000   // an auto-start still fires up to 3h late if no end time is set

/**
 * Applies the schedule: starts a due auto-start stream and ends one whose end time passed.
 * Returns the (possibly updated) state and, when a stream was auto-started, that fact so the
 * caller can announce it.
 */
export async function syncSchedule(): Promise<{ state: FanslyLiveState; autoStarted: boolean }> {
  const state = await readLive()
  const now = Date.now()

  if (state.isLive) {
    if (state.autoEndAt && now >= new Date(state.autoEndAt).getTime() && await acquireLock('fansly-end')) {
      return { state: await endStream(), autoStarted: false }
    }
    return { state, autoStarted: false }
  }

  const due = state.schedule.find(s => {
    if (!s.autoStart || s.done) return false
    const start = new Date(s.at).getTime()
    const end = s.endAt ? new Date(s.endAt).getTime() : start + START_GRACE_MS
    return now >= start && now < end
  })
  if (!due || !(await acquireLock(`fansly-start-${due.id}`))) return { state, autoStarted: false }

  const schedule = state.schedule.map(s => s.id === due.id ? { ...s, done: true } : s)
  await writeLive({ ...state, schedule })
  const { state: started, changed } = await startStream({ title: due.title, auto: true, autoEndAt: due.endAt })
  return { state: started, autoStarted: changed }
}

/** Raises the recorded visitor peak while a stream is live. */
export async function observeVisitors(state: FanslyLiveState): Promise<FanslyLiveState> {
  if (!state.isLive) return state
  try {
    const online = (await getOnlineSessions()).filter(s => !s.page.startsWith('/admin')).length
    if (online > state.peakVisitors) return await writeLive({ ...state, peakVisitors: online })
  } catch {}
  return state
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Only https links to fansly.com, so the admin field cannot be abused as an open redirect */
export function sanitizeFanslyUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'https:') return null
    if (u.hostname !== 'fansly.com' && u.hostname !== 'www.fansly.com') return null
    return u.toString()
  } catch { return null }
}

/** Upcoming scheduled streams only, soonest first. A stream stays visible for 3h after its start. */
export function upcomingStreams(schedule: ScheduledStream[], now = Date.now()): ScheduledStream[] {
  return schedule
    .filter(s => !s.done && new Date(s.at).getTime() > now - START_GRACE_MS)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

export function formatMessage(template: string, state: Pick<FanslyLiveState, 'title' | 'url'>): string {
  const text = (template || DEFAULT_MESSAGE)
    .replace(/\{title\}/g, state.title || '')
    .replace(/\{link\}/g, state.url)
    .replace(/[ \t]+/g, ' ')
    .trim()
  return text.slice(0, 280)
}
