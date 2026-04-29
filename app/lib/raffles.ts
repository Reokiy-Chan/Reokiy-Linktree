import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

// ─── Types ──────────────────────────────────────────────────────────────────

export type RaffleStatus = 'active' | 'ended'

export interface RafflePrize {
  id: string
  label: string
  description?: string
}

export interface RaffleEntry {
  discordUsername: string
  enteredAt: string
}

export interface RaffleWinner {
  discordUsername: string
  pickedAt: string
  prizeId?: string   // which prize was assigned
  prizeLabel?: string
}

export interface Raffle {
  id: string
  title: string
  description: string
  prizes: RafflePrize[]
  status: RaffleStatus
  endsAt?: string
  autoEnd: boolean
  entries: RaffleEntry[]
  // Multi-winner support
  maxWinners?: number        // default 1 — how many winners to pick
  winners?: RaffleWinner[]   // all picked winners (new)
  // Legacy single-winner fields (kept for compat)
  winnerId?: string
  pickedAt?: string
  // Ban list (admin can exclude participants)
  bannedUsernames?: string[]
  createdAt: string
}

// ─── Storage ────────────────────────────────────────────────────────────────

const USE_KV = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
const KV_KEY = 'reokiy:raffles'

const DATA_DIR     = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const RAFFLES_FILE = path.join(DATA_DIR, 'raffles.json')

function fsRead(): Raffle[] {
  try {
    if (!existsSync(RAFFLES_FILE)) return []
    return JSON.parse(readFileSync(RAFFLES_FILE, 'utf-8')) as Raffle[]
  } catch { return [] }
}

function fsWrite(raffles: Raffle[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(RAFFLES_FILE, JSON.stringify(raffles, null, 2))
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

export async function listRaffles(): Promise<Raffle[]> {
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis')
    const kv = Redis.fromEnv()
    const raw = await kv.hgetall(KV_KEY)
    if (!raw) return []
    return Object.values(raw)
      .map(v => safeParse<Raffle>(v))
      .filter(Boolean) as Raffle[]
  }
  return fsRead()
}

export async function getRaffle(id: string): Promise<Raffle | null> {
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis')
    const kv = Redis.fromEnv()
    const raw = await kv.hget(KV_KEY, id)
    return safeParse<Raffle>(raw)
  }
  return fsRead().find(r => r.id === id) ?? null
}

export async function createRaffle(data: Omit<Raffle, 'id' | 'entries' | 'status' | 'createdAt'>): Promise<Raffle> {
  const entry: Raffle = {
    ...data,
    id: crypto.randomUUID(),
    entries: [],
    winners: [],
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis')
    const kv = Redis.fromEnv()
    await kv.hset(KV_KEY, { [entry.id]: JSON.stringify(entry) })
    return entry
  }
  const raffles = fsRead()
  raffles.push(entry)
  fsWrite(raffles)
  return entry
}

export async function updateRaffle(id: string, patch: Partial<Raffle>): Promise<Raffle | null> {
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis')
    const kv = Redis.fromEnv()
    const raw = await kv.hget(KV_KEY, id)
    const raffle = safeParse<Raffle>(raw)
    if (!raffle) return null
    const updated = { ...raffle, ...patch }
    await kv.hset(KV_KEY, { [id]: JSON.stringify(updated) })
    return updated
  }
  const raffles = fsRead()
  const idx = raffles.findIndex(r => r.id === id)
  if (idx === -1) return null
  raffles[idx] = { ...raffles[idx], ...patch }
  fsWrite(raffles)
  return raffles[idx]
}

export async function deleteRaffle(id: string): Promise<void> {
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis')
    const kv = Redis.fromEnv()
    await kv.hdel(KV_KEY, id)
    return
  }
  fsWrite(fsRead().filter(r => r.id !== id))
}

export async function enterRaffle(id: string, discordUsername: string): Promise<{ ok: boolean; error?: string }> {
  const raffle = await getRaffle(id)
  if (!raffle) return { ok: false, error: 'Sorteo no encontrado' }
  if (raffle.status !== 'active') return { ok: false, error: 'Este sorteo ya ha terminado' }
  if (raffle.entries.some(e => e.discordUsername.toLowerCase() === discordUsername.toLowerCase())) {
    return { ok: false, error: 'Ya estás participando en este sorteo' }
  }
  const banned = (raffle.bannedUsernames ?? []).map(b => b.toLowerCase())
  if (banned.includes(discordUsername.toLowerCase())) {
    return { ok: false, error: 'No puedes participar en este sorteo' }
  }
  const newEntry: RaffleEntry = { discordUsername, enteredAt: new Date().toISOString() }
  await updateRaffle(id, { entries: [...raffle.entries, newEntry] })
  return { ok: true }
}

// Add participant manually (admin only)
export async function addParticipant(id: string, discordUsername: string): Promise<{ ok: boolean; error?: string }> {
  const raffle = await getRaffle(id)
  if (!raffle) return { ok: false, error: 'Sorteo no encontrado' }
  if (raffle.entries.some(e => e.discordUsername.toLowerCase() === discordUsername.toLowerCase())) {
    return { ok: false, error: 'Ya está participando' }
  }
  const newEntry: RaffleEntry = { discordUsername, enteredAt: new Date().toISOString() }
  await updateRaffle(id, { entries: [...raffle.entries, newEntry] })
  return { ok: true }
}

// Remove participant (admin only)
export async function removeParticipant(id: string, discordUsername: string): Promise<{ ok: boolean; error?: string }> {
  const raffle = await getRaffle(id)
  if (!raffle) return { ok: false, error: 'Sorteo no encontrado' }
  const newEntries = raffle.entries.filter(
    e => e.discordUsername.toLowerCase() !== discordUsername.toLowerCase()
  )
  // Also remove from winners if they were picked
  const newWinners = (raffle.winners ?? []).filter(
    w => w.discordUsername.toLowerCase() !== discordUsername.toLowerCase()
  )
  await updateRaffle(id, { entries: newEntries, winners: newWinners })
  return { ok: true }
}

// Pick a winner — supports multi-winner, prize assignment, and respects bans
export async function pickWinner(
  id: string,
  prizeId?: string
): Promise<{ ok: boolean; winner?: RaffleWinner; raffle?: Raffle; error?: string }> {
  const raffle = await getRaffle(id)
  if (!raffle) return { ok: false, error: 'Sorteo no encontrado' }
  if (raffle.entries.length === 0) return { ok: false, error: 'No hay participantes' }

  const maxWinners = raffle.maxWinners ?? 1
  const currentWinners = raffle.winners ?? []
  const currentWinnerNames = new Set(currentWinners.map(w => w.discordUsername.toLowerCase()))
  const banned = new Set((raffle.bannedUsernames ?? []).map(b => b.toLowerCase()))

  // Eligible = not already won, not banned
  const eligible = raffle.entries.filter(
    e => !currentWinnerNames.has(e.discordUsername.toLowerCase()) &&
         !banned.has(e.discordUsername.toLowerCase())
  )

  if (eligible.length === 0) return { ok: false, error: 'No quedan participantes elegibles' }

  const pickedEntry = eligible[Math.floor(Math.random() * eligible.length)]

  // Find prize label if prizeId given
  let prizeLabel: string | undefined
  if (prizeId) {
    prizeLabel = raffle.prizes.find(p => p.id === prizeId)?.label
  }

  const winner: RaffleWinner = {
    discordUsername: pickedEntry.discordUsername,
    pickedAt: new Date().toISOString(),
    prizeId,
    prizeLabel,
  }

  const newWinners = [...currentWinners, winner]
  const shouldEnd = newWinners.length >= maxWinners

  const patch: Partial<Raffle> = {
    winners: newWinners,
    // Legacy compat: set winnerId to first winner
    winnerId: newWinners[0]?.discordUsername,
    pickedAt: newWinners[0]?.pickedAt,
    ...(shouldEnd ? { status: 'ended' as RaffleStatus } : {}),
  }

  const updated = await updateRaffle(id, patch)
  return { ok: true, winner, raffle: updated ?? undefined }
}

// Duplicate a raffle (reset entries/winners, set active)
export async function duplicateRaffle(id: string): Promise<Raffle | null> {
  const raffle = await getRaffle(id)
  if (!raffle) return null
  const copy: Raffle = {
    ...raffle,
    id: crypto.randomUUID(),
    title: `${raffle.title} (copia)`,
    entries: [],
    winners: [],
    status: 'active',
    winnerId: undefined,
    pickedAt: undefined,
    createdAt: new Date().toISOString(),
  }
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis')
    const kv = Redis.fromEnv()
    await kv.hset(KV_KEY, { [copy.id]: JSON.stringify(copy) })
    return copy
  }
  const raffles = fsRead()
  raffles.push(copy)
  fsWrite(raffles)
  return copy
}