import { NextRequest, NextResponse } from 'next/server'
import { addVisit, updateVisitDuration, parseUA } from '@/app/lib/data'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { page?: string; referrer?: string; sessionId?: string; type?: string; duration?: number }
    const { page = '/', referrer = '', sessionId, type = 'pageview', duration } = body

    if (page.startsWith('/admin')) return NextResponse.json({ ok: true })

    // Duration update request
    if (type === 'duration' && sessionId && duration != null) {
      updateVisitDuration(sessionId, page, duration)
      return NextResponse.json({ ok: true })
    }

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = (forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') ?? '').trim()
    const ua = request.headers.get('user-agent') ?? ''
    const { browser, os, device } = parseUA(ua)

    let country: string | undefined, countryCode: string | undefined, city: string | undefined
    let lat: number | undefined, lon: number | undefined

    const isLocal = !ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')
    if (!isLocal) {
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

    addVisit({
      page, timestamp: new Date().toISOString(),
      country, countryCode, city, lat, lon,
      referrer: referrer || undefined, ip: ip || undefined,
      ua, browser, os, device,
      sessionId: newSessionId, isNew,
    })

    const response = NextResponse.json({ ok: true, sessionId: newSessionId })
    if (isNew) {
      response.cookies.set('visitor_session', newSessionId, {
        httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/',
      })
    }
    return response
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}