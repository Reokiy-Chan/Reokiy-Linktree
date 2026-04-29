import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export function hashPassword(password: string): string {
  return createHash('sha256').update(password + 'reokiy_salt').digest('hex')
}

export function createToken(secret: string): string {
  const payload = `admin:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', secret).update(payloadB64).digest('hex')
  return `${payloadB64}.${sig}`
}

export function verifyToken(token: string, secret: string): boolean {
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

/**
 * Validates the admin session cookie.
 * Works both in route handlers (where `req` is available) and in server
 * actions / layouts (where we fall back to the Next.js `cookies()` helper).
 */
export async function validateSession(req?: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'

  // Prefer reading directly from the request headers when available
  // (avoids the async cookies() overhead in hot API paths)
  if (req) {
    const cookieHeader = req.headers.get('cookie') ?? ''
    const token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('admin_session='))
      ?.slice('admin_session='.length)
    return !!(token && verifyToken(token, secret))
  }

  // Fallback: Next.js cookies() helper (server components / route handlers)
  const jar = await cookies()
  const token = jar.get('admin_session')?.value
  return !!(token && verifyToken(token, secret))
}