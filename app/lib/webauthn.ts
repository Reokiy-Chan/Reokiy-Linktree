import path from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { USE_KV, getRedis } from './redis'

// ─── RP config ────────────────────────────────────────────────────────────────

export function getRpConfig(): { rpID: string; origin: string } {
  if (process.env.NODE_ENV === 'production') {
    // NEXT_PUBLIC_SITE_URL is the canonical URL (e.g. https://reokiy.vercel.app)
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      const { hostname, origin } = new URL(process.env.NEXT_PUBLIC_SITE_URL)
      return { rpID: hostname, origin }
    }
    // VERCEL_URL is auto-set by Vercel (no https prefix)
    if (process.env.VERCEL_URL) {
      return { rpID: process.env.VERCEL_URL, origin: `https://${process.env.VERCEL_URL}` }
    }
    // Last-resort fallback — set NEXT_PUBLIC_SITE_URL in Vercel to avoid this
    return { rpID: 'reokiy.vercel.app', origin: 'https://reokiy.vercel.app' }
  }
  return { rpID: 'localhost', origin: 'http://localhost:3000' }
}

// ─── Challenge storage ────────────────────────────────────────────────────────
// TTL: 120 segundos — tiempo suficiente para que el usuario toque el Flipper.
// Clave: `webauthn:challenge:<token>` donde token es un UUID opaco.

const CHALLENGE_TTL = 120
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const CHALLENGE_FILE = path.join(DATA_DIR, 'webauthn_challenges.json')

type ChallengeStore = Record<string, { challenge: string; meta?: string; exp: number }>

function readChallengeFile(): ChallengeStore {
  if (!existsSync(CHALLENGE_FILE)) return {}
  try { return JSON.parse(readFileSync(CHALLENGE_FILE, 'utf-8')) } catch { return {} }
}

function writeChallengeFile(data: ChallengeStore) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(CHALLENGE_FILE, JSON.stringify(data))
}

/**
 * Almacena un challenge asociado a un token opaco (UUID) y opcionalmente
 * un campo `meta` (e.g., el uid del usuario para el flujo de registro,
 * o el username para el flujo de login).
 * Devuelve el token que el cliente debe guardar y enviar en el verify.
 */
export async function storeChallenge(challenge: string, meta?: string): Promise<string> {
  const token = crypto.randomUUID()
  const key = `webauthn:challenge:${token}`

  if (USE_KV) {
    const r = await getRedis()
    await r.set(key, JSON.stringify({ challenge, meta }), { ex: CHALLENGE_TTL })
  } else {
    const data = readChallengeFile()
    // Limpiar los expirados mientras estamos aquí
    const now = Date.now()
    for (const k of Object.keys(data)) {
      if (data[k].exp < now) delete data[k]
    }
    data[token] = { challenge, meta, exp: now + CHALLENGE_TTL * 1000 }
    writeChallengeFile(data)
  }
  return token
}

/**
 * Recupera y elimina el challenge (consumo único).
 * Devuelve `null` si el token no existe o expiró.
 */
export async function consumeChallenge(token: string): Promise<{ challenge: string; meta?: string } | null> {
  const key = `webauthn:challenge:${token}`

  if (USE_KV) {
    const r = await getRedis()
    const raw = await r.get<string>(key)
    if (!raw) return null
    await r.del(key)
    try { return JSON.parse(raw) } catch { return null }
  } else {
    const data = readChallengeFile()
    const entry = data[token]
    if (!entry || entry.exp < Date.now()) return null
    delete data[token]
    writeChallengeFile(data)
    return { challenge: entry.challenge, meta: entry.meta }
  }
}