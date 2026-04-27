import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, createToken } from '@/app/lib/auth'

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json() as { password?: string }
    if (!password) return NextResponse.json({ error: 'Missing password' }, { status: 400 })

    const adminPassword = process.env.ADMIN_PASSWORD ?? 'reokiy_admin'
    const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'

    if (hashPassword(password) !== hashPassword(adminPassword)) {
      await new Promise(r => setTimeout(r, 1000)) // slow down brute force
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = createToken(secret)
    const response = NextResponse.json({ ok: true })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
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