import { NextRequest, NextResponse } from 'next/server'
import { addVisit, updateVisitDuration, parseUA, detectBot } from '@/app/lib/data'
import { touchPresence, dropPresence } from '@/app/lib/presence'
import { readSettings, attackRateLimit, getTrueClientIp } from '@/app/lib/settings'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { page?: string; referrer?: string; sessionId?: string; type?: string; duration?: number }
    const { page = '/', referrer = '', sessionId, type = 'pageview', duration } = body

    if (page.startsWith('/admin')) return NextResponse.json({ ok: true })

    const settings = await readSettings()
    const ip = getTrueClientIp(request.headers)

    if (settings.attackMode) {
      // Rate limit check
      if (!attackRateLimit(ip)) {
        return NextResponse.json({ ok: false }, { status: 429 })
      }
      // Captcha cookie check — only enforce when keys are actually configured
      if (process.env.CF_TURNSTILE_SECRET_KEY) {
        const cfVerified = request.cookies.get('cf_verified')?.value
        if (!cfVerified) {
          return NextResponse.json({ ok: false, captchaRequired: true }, { status: 403 })
        }
      }
    }

    // Heartbeat — keeps the session marked as online
    if (type === 'heartbeat' && sessionId) {
      await touchPresence(sessionId, { page })
      return NextResponse.json({ ok: true })
    }

    // Explicit disconnect (sendBeacon on pagehide)
    if (type === 'leave' && sessionId) {
      await dropPresence(sessionId)
      return NextResponse.json({ ok: true })
    }

    // Duration update request
    if (type === 'duration' && sessionId && duration != null) {
      await updateVisitDuration(sessionId, page, duration)
      return NextResponse.json({ ok: true })
    }

    if (!settings.trackingEnabled) return NextResponse.json({ ok: true })

    const ua = request.headers.get('user-agent') ?? ''
    const { browser, os, device } = parseUA(ua)
    const { isBot, reason: botReason } = detectBot(ua, request.headers)

    let country: string | undefined, countryCode: string | undefined, city: string | undefined
    let lat: number | undefined, lon: number | undefined

    const isLocal = !ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')
    if (!isLocal && !isBot) {
      // Skip geo lookup for bots — save quota
      try {
        const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,city,lat,lon`, { signal: AbortSignal.timeout(2000) })
        if (geo.ok) {
          const g = await geo.json() as { country?: string; countryCode?: string; city?: string; lat?: number; lon?: number }
          country = g.country; countryCode = g.countryCode; city = g.city; lat = g.lat; lon = g.lon
        }
      } catch {}
    }

    // Determine if new visitor (no sessionId cookie means first time)
    const existingSession = request.cookies.get('visitor_session')?.value
    const isNew = !existingSession

    const newSessionId = sessionId ?? existingSession ?? crypto.randomUUID()

    await addVisit({
      page, timestamp: new Date().toISOString(),
      country, countryCode, city, lat, lon,
      referrer: referrer || undefined, ip: ip || undefined,
      ua, browser, os, device,
      sessionId: newSessionId, isNew,
      isBot, botReason,
    })

    // Only register presence for real users
    if (!isBot) {
      await touchPresence(newSessionId, { page, country, countryCode, city, lat, lon })
    }

    const response = NextResponse.json({ ok: true, sessionId: newSessionId })
    if (isNew && !isBot) {
      response.cookies.set('visitor_session', newSessionId, {
        httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/',
      })
    }
    return response
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}