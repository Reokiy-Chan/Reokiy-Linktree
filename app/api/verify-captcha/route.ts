import { NextRequest, NextResponse } from 'next/server'
import { readSettings } from '@/app/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CF_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const COOKIE_NAME = 'cf_verified'
const COOKIE_MAX_AGE = 60 * 60 * 6 // 6 hours

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json() as { token?: string }
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

    const secret = process.env.CF_TURNSTILE_SECRET_KEY
    if (!secret) {
      // No secret configured — bypass in dev or if not set up yet
      const res = NextResponse.json({ ok: true, bypass: true })
      res.cookies.set(COOKIE_NAME, '1', {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        maxAge: COOKIE_MAX_AGE, path: '/',
      })
      return res
    }

    const settings = await readSettings()
    if (!settings.attackMode) {
      // Attack mode is off — no need for CAPTCHA but honor the request anyway
      const res = NextResponse.json({ ok: true })
      res.cookies.set(COOKIE_NAME, '1', {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        maxAge: COOKIE_MAX_AGE, path: '/',
      })
      return res
    }

    // Verify with Cloudflare
    const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? ''
    const formData = new FormData()
    formData.append('secret', secret)
    formData.append('response', token)
    if (ip) formData.append('remoteip', ip)

    const cfRes = await fetch(CF_VERIFY_URL, { method: 'POST', body: formData })
    const cfData = await cfRes.json() as { success: boolean; 'error-codes'?: string[] }

    if (!cfData.success) {
      return NextResponse.json({ error: 'CAPTCHA verification failed', codes: cfData['error-codes'] }, { status: 403 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, '1', {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE, path: '/',
    })
    return res
  } catch (err) {
    console.error('verify-captcha error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}