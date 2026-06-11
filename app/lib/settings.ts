import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { USE_KV, getRedis } from './redis'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SiteSettings {
  maintenanceMode: boolean
  maintenanceMessage: string
  attackMode: boolean
  redeemEnabled: boolean
  rafflesEnabled: boolean
  trackingEnabled: boolean
  updatedAt: string
}

export const DEFAULT_SETTINGS: SiteSettings = {
  maintenanceMode: false,
  maintenanceMessage: '',
  attackMode: false,
  redeemEnabled: true,
  rafflesEnabled: true,
  trackingEnabled: true,
  updatedAt: new Date(0).toISOString(),
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const KV_KEY = 'reokiy:settings'
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

function fsRead(): SiteSettings {
  try {
    if (!existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8')) as Partial<SiteSettings>) }
  } catch { return { ...DEFAULT_SETTINGS } }
}

function fsWrite(settings: SiteSettings): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  } catch {}
}

// In-process cache so hot paths (tracking, redeem) don't hit Redis on every call
let cache: { settings: SiteSettings; at: number } | null = null
const CACHE_TTL = 5000

export async function readSettings(): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.settings
  let settings: SiteSettings
  if (USE_KV) {
    const kv = await getRedis()
    const stored = await kv.get<Partial<SiteSettings>>(KV_KEY)
    settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
  } else {
    settings = fsRead()
  }
  cache = { settings, at: Date.now() }
  return settings
}

export async function updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await readSettings()
  const next: SiteSettings = { ...current, ...patch, updatedAt: new Date().toISOString() }
  if (USE_KV) {
    const kv = await getRedis()
    await kv.set(KV_KEY, next)
  } else {
    fsWrite(next)
  }
  cache = { settings: next, at: Date.now() }
  return next
}

// ─── Attack-mode rate limiter ─────────────────────────────────────────────────
// Strict in-memory per-IP limiter for public write endpoints while under attack.

const hits = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_HITS = 5

export function attackRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k)
    }
    return true
  }
  entry.count++
  return entry.count <= MAX_HITS
}

/**
 * Obtiene la IP real del cliente, ignorando valores spoofeados.
 * En Vercel/proxy, x-real-ip es confiable. Si no existe, toma el último elemento
 * de x-forwarded-for (asumiendo que proxies de confianza añaden al final).
 */
export function getTrueClientIp(headers: Headers): string {
  // x-real-ip es el método preferido (lo establece el proxy final)
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  // Fallback: último elemento de x-forwarded-for (puede ser manipulado, pero mejor que el primero)
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',')
    // Eliminar espacios y devolver la última IP (la más cercana al servidor)
    const last = parts[parts.length - 1].trim()
    if (last) return last
  }
  return ''
}