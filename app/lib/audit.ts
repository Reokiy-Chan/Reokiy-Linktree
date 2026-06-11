import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { randomBytes } from 'crypto'
import { USE_KV, getRedis } from './redis'

export type AuditAction =
  | 'settings.update'
  | 'user.create' | 'user.update' | 'user.delete' | 'user.suspend' | 'user.unsuspend'
  | 'user.resetOtp' | 'user.requirePasswordChange' | 'user.sendMessage'
  | 'code.create' | 'code.delete'
  | 'raffle.create' | 'raffle.update' | 'raffle.delete' | 'raffle.pick'
  | 'account.update' | 'account.password'
  | 'webauthn.register' | 'webauthn.delete'
  | 'login.success' | 'login.fail'

export interface AuditEntry {
  id: string
  action: AuditAction
  actorId: string           // uid del usuario que hizo la acción
  actorName: string         // display name en el momento del log
  actorUsername: string     // @handle
  actorAvatar?: string      // URL foto de perfil (puede estar desactualizada)
  target?: string           // qué se afectó: nombre del setting, username del usuario, título del código/raffle, etc.
  detail?: string           // descripción libre: qué cambió, valores antes/después relevantes
  ts: string                // ISO timestamp
}

const KV_KEY = 'reokiy:audit'
const MAX_ENTRIES = 2000
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json')

function fsRead(): AuditEntry[] {
  try {
    if (!existsSync(AUDIT_FILE)) return []
    return JSON.parse(readFileSync(AUDIT_FILE, 'utf-8')) as AuditEntry[]
  } catch { return [] }
}

function fsWrite(entries: AuditEntry[]): void {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(AUDIT_FILE, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
}

export async function appendAudit(entry: Omit<AuditEntry, 'id' | 'ts'>): Promise<void> {
  const full: AuditEntry = {
    ...entry,
    id: randomBytes(8).toString('hex'),
    ts: new Date().toISOString(),
  }
  if (USE_KV) {
    const redis = await getRedis()
    await redis.lpush(KV_KEY, JSON.stringify(full))
    await redis.ltrim(KV_KEY, 0, MAX_ENTRIES - 1)
  } else {
    const all = fsRead()
    fsWrite([full, ...all])
  }
}

export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  if (USE_KV) {
    const redis = await getRedis()
    const raw = await redis.lrange(KV_KEY, 0, limit - 1) as string[]
    return raw.map(r => {
      try { return JSON.parse(r) as AuditEntry } catch { return null }
    }).filter(Boolean) as AuditEntry[]
  }
  return fsRead().slice(0, limit)
}