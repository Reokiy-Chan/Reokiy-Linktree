import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { USE_KV, getRedis } from './redis'
// ─── Types ─────────────────────────────────────────────────────────────────

export type RewardType = 'link' | 'text' | 'image' | 'fansly'

export type GiftPattern =
  | 'none'
  | 'dots'
  | 'stripes'
  | 'stars'
  | 'hearts'
  | 'checks'
  | 'diamonds'
  | 'waves'
  | 'zigzag'
  | 'custom'

export type ScratchDifficulty = 'easy' | 'normal' | 'hard' | 'very_hard'

export interface RedeemCode {
  id: string
  code: string
  label: string
  rewardType: RewardType
  rewardContent: string
  rewardTitle?: string
  // Gift box
  giftAnimation?: boolean
  giftBoxColor?: string
  giftRibbonColor?: string
  giftPattern?: GiftPattern
  giftPatternColor?: string
  giftPatternImage?: string
  // Scratch card
  scratchCard?: boolean
  scratchCardColor?: string
  scratchCardLabel?: string
  scratchTextColor?: string
  scratchAccentColor?: string
  scratchCardWidth?: number
  scratchCardHeight?: number
  scratchRevealThreshold?: number
  scratchDifficulty?: ScratchDifficulty  // brush size: easy=big, very_hard=tiny
  // Multi-use
  maxUses?: number | null   // null=unlimited, undefined/1=single-use
  useCount?: number         // how many times redeemed
  used: boolean
  usedAt?: string
  createdAt: string
}

// ─── Storage ────────────────────────────────────────────────────────────────

const KV_KEY = 'reokiy:codes'

const DATA_DIR   = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const CODES_FILE = path.join(DATA_DIR, 'codes.json')

function fsRead(): RedeemCode[] {
  try {
    if (!existsSync(CODES_FILE)) return []
    return JSON.parse(readFileSync(CODES_FILE, 'utf-8')) as RedeemCode[]
  } catch { return [] }
}

function fsWrite(codes: RedeemCode[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2))
  } catch {}
}

function safeParse<T>(v: unknown): T | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'object') return v as T
  if (typeof v === 'string') {
    try { return JSON.parse(v) as T } catch { return null }
  }
  return null
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function listCodes(): Promise<RedeemCode[]> {
  if (USE_KV) {
    const kv = await getRedis()
    const raw = await kv.hgetall(KV_KEY)
    if (!raw) return []
    return Object.values(raw)
      .map(v => safeParse<RedeemCode>(v))
      .filter(Boolean) as RedeemCode[]
  }
  return fsRead()
}

export async function getCode(id: string): Promise<RedeemCode | null> {
  if (USE_KV) {
    const kv = await getRedis()
    const raw = await kv.hget(KV_KEY, id)
    return safeParse<RedeemCode>(raw)
  }
  return fsRead().find(c => c.id === id) ?? null
}

export async function getCodeByString(code: string): Promise<RedeemCode | null> {
  const all = await listCodes()
  return all.find(c => c.code.toLowerCase() === code.toLowerCase()) ?? null
}

export async function createCode(data: Omit<RedeemCode, 'id' | 'used' | 'useCount' | 'createdAt'>): Promise<RedeemCode> {
  const entry: RedeemCode = {
    ...data,
    id: crypto.randomUUID(),
    used: false,
    useCount: 0,
    createdAt: new Date().toISOString(),
  }
  if (USE_KV) {
    const kv = await getRedis()
    await kv.hset(KV_KEY, { [entry.id]: JSON.stringify(entry) })
    return entry
  }
  const codes = fsRead()
  codes.push(entry)
  fsWrite(codes)
  return entry
}

// Returns true if use registered, false if exhausted/not found
export async function markUsed(id: string): Promise<boolean> {
  if (USE_KV) {
    const kv = await getRedis()
    const raw = await kv.hget(KV_KEY, id)
    const entry = safeParse<RedeemCode>(raw)
    if (!entry) return false

    const maxUses = entry.maxUses === undefined ? 1 : entry.maxUses
    const useCount = entry.useCount ?? 0
    if (maxUses !== null && useCount >= maxUses) return false

    entry.useCount = useCount + 1
    if (maxUses !== null && entry.useCount >= maxUses) {
      entry.used = true
      entry.usedAt = new Date().toISOString()
    }
    await kv.hset(KV_KEY, { [id]: JSON.stringify(entry) })
    return true
  }

  const codes = fsRead()
  const idx = codes.findIndex(c => c.id === id)
  if (idx === -1) return false

  const entry = codes[idx]
  const maxUses = entry.maxUses === undefined ? 1 : entry.maxUses
  const useCount = entry.useCount ?? 0
  if (maxUses !== null && useCount >= maxUses) return false

  codes[idx].useCount = useCount + 1
  if (maxUses !== null && codes[idx].useCount! >= maxUses) {
    codes[idx].used = true
    codes[idx].usedAt = new Date().toISOString()
  }
  fsWrite(codes)
  return true
}

export async function deleteCode(id: string): Promise<void> {
  if (USE_KV) {
    const kv = await getRedis()
    await kv.hdel(KV_KEY, id)
    return
  }
  const codes = fsRead().filter(c => c.id !== id)
  fsWrite(codes)
}