import { createHash, createHmac, timingSafeEqual } from 'crypto'

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