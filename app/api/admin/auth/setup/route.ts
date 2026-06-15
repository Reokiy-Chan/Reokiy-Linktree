import { NextRequest, NextResponse } from 'next/server'
import { getSession, createSessionToken, SESSION_COOKIE_NAME } from '@/app/lib/auth'
import { completeSetup, touchLastLogin, genSecurityKey } from '@/app/lib/users'

export const runtime = 'nodejs'

const COOKIE_NAME = SESSION_COOKIE_NAME
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

// GET → suggest a fresh security key for the "use a key" option
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ key: genSecurityKey() })
}

// POST → finish setup with a password or a security key, then promote to a full session
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.setup) return NextResponse.json({ error: 'Setup session expired' }, { status: 401 })

  try {
    const body = await req.json() as { type?: 'password' | 'key'; password?: string; key?: string }
    const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'

    const choice = body.type === 'key'
      ? { type: 'key' as const, key: body.key ?? '' }
      : { type: 'password' as const, password: body.password ?? '' }

    const result = await completeSetup(session.uid, choice)
    if (!result.ok || !result.user) {
      return NextResponse.json({ error: result.error ?? 'Setup failed' }, { status: 400 })
    }

    await touchLastLogin(result.user.id)
    const token = createSessionToken({
      uid: result.user.id, u: result.user.username, r: 'user', p: result.user.permissions,
    }, secret)
    const response = NextResponse.json({ ok: true })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE, path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
