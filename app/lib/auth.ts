import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'


export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

/**
 * Verifica una contraseña contra un hash que puede ser bcrypt ($2a$/$2b$)
 * o el antiguo SHA-256 con salt fijo. En caso de éxito con hash legacy,
 * la función devuelve `true` pero el llamador debe actualizar el hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<{ ok: boolean; needsUpgrade: boolean }> {
  // Si el hash parece de bcrypt (empieza con $2), usamos bcrypt.compare
  if (hash.startsWith('$2')) {
    const ok = await bcrypt.compare(plain, hash)
    return { ok, needsUpgrade: false }
  }

  // Hash antiguo: SHA-256 con salt fijo 'reokiy_salt'
  const oldHash = createHash('sha256').update(plain + 'reokiy_salt').digest('hex')
  const ok = oldHash === hash
  return { ok, needsUpgrade: ok }  // si coincide, hay que migrar a bcrypt
}



function createToken(secret: string): string {
  const payload = `admin:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', secret).update(payloadB64).digest('hex')
  return `${payloadB64}.${sig}`
}

function verifyToken(token: string, secret: string): boolean {
  try {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return false
    const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('hex')
    const a = Buffer.from(sig)
    const b = Buffer.from(expectedSig)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// ─── Identity tokens ──────────────────────────────────────────────────────────
// Same `payloadB64.sig` shape as createToken (so verifyToken / the edge verifier
// keep working), but the payload is a JSON object carrying who is logged in.

export interface SessionPayload {
  uid: string                 // user id ('root' for the owner)
  u: string                   // username
  r: 'root' | 'user'          // role
  p: string[] | 'all'         // permitted sections
  setup?: boolean             // limited token used only to finish first-time setup
  iat: number                 // issued-at (ms)
}

export function createSessionToken(payload: Omit<SessionPayload, 'iat'>, secret: string): string {
  const full: SessionPayload = { ...payload, iat: Date.now() }
  const payloadB64 = Buffer.from(JSON.stringify(full)).toString('base64url')
  const sig = createHmac('sha256', secret).update(payloadB64).digest('hex')
  return `${payloadB64}.${sig}`
}

function readSessionToken(token: string | undefined, secret: string): SessionPayload | null {
  if (!token) return null
  if (!verifyToken(token, secret)) return null
  try {
    const [payloadB64] = token.split('.')
    const json = Buffer.from(payloadB64, 'base64url').toString('utf-8')
    const data = JSON.parse(json) as SessionPayload
    if (!data.uid || !data.u || !data.r) return null
    return data
  } catch {
    return null
  }
}

/** Reads the current session payload from the admin_session cookie. */
export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'
  let token: string | undefined
  if (req) {
    token = req.headers.get('cookie')?.split(';').map(c => c.trim())
      .find(c => c.startsWith('admin_session='))?.slice('admin_session='.length)
  } else {
    const jar = await cookies()
    token = jar.get('admin_session')?.value
  }
  return readSessionToken(token, secret)
}

/**
 * Validates the admin session cookie.
 * Works both in route handlers (where `req` is available) and in server
 * actions / layouts (where we fall back to the Next.js `cookies()` helper).
 */
export async function validateSession(req?: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'

  if (req) {
    const cookieHeader = req.headers.get('cookie') ?? ''
    const token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('admin_session='))
      ?.slice('admin_session='.length)
    // ✅ FIX: readSessionToken exige uid/u/r presentes
    return !!readSessionToken(token, secret)
  }

  const jar = await cookies()
  const token = jar.get('admin_session')?.value
  return !!readSessionToken(token, secret)
}