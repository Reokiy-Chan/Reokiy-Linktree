import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken } from '@/app/lib/auth'
import { resolveLogin, touchLastLogin, type AdminUser } from '@/app/lib/users'

export const runtime = 'nodejs'

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SETUP_MAX_AGE = 60 * 10           // 10 min — just long enough to finish setup

function sessionCookie(user: AdminUser, secret: string): string {
  return createSessionToken({
    uid: user.id, u: user.username,
    r: user.isRoot ? 'root' : 'user',
    p: user.isRoot ? 'all' : user.permissions,
  }, secret)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username?: string; password?: string; securityKey?: string; method?: 'password' | 'key' }
    const method = body.method === 'key' ? 'key' : 'password'
    // Default username to 'root' so the old single-field flow keeps working
    const username = (body.username ?? 'root').trim()
    const credential = (method === 'key' ? body.securityKey : body.password) ?? ''

    if (!credential) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })

    const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'
    const result = await resolveLogin(username, credential, method)

    if (!result.ok) {
      await new Promise(r => setTimeout(r, 800)) // slow down brute force
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    // First-time setup: issue a short-lived setup token, tell client to show modal
    if (result.kind === 'setup') {
      const token = createSessionToken({
        uid: result.user.id, u: result.user.username,
        r: 'user', p: result.user.permissions, setup: true,
      }, secret)
      const response = NextResponse.json({ ok: true, needsSetup: true, name: result.user.name })
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        maxAge: SETUP_MAX_AGE, path: '/',
      })
      return response
    }

    await touchLastLogin(result.user.id)
    const response = NextResponse.json({ ok: true })
    response.cookies.set(COOKIE_NAME, sessionCookie(result.user, secret), {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE, path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return response
}
