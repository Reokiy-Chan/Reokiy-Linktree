import { NextRequest, NextResponse } from 'next/server'
import { addVisit } from '@/app/lib/data'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { page?: string; referrer?: string }
    const { page = '/', referrer = '' } = body

    // Skip tracking admin pages
    if (page.startsWith('/admin')) return NextResponse.json({ ok: true })

    // Extract real IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = (forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') ?? '').trim()

    let country: string | undefined
    let countryCode: string | undefined
    let city: string | undefined

    // Geolocate IP (skip localhost/private IPs)
    const isLocal = !ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')
    if (!isLocal && ip) {
      try {
        const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,city`, {
          signal: AbortSignal.timeout(2000),
        })
        if (geo.ok) {
          const geoData = await geo.json() as { country?: string; countryCode?: string; city?: string }
          country = geoData.country
          countryCode = geoData.countryCode
          city = geoData.city
        }
      } catch {}
    }

    addVisit({
      page,
      timestamp: new Date().toISOString(),
      country,
      countryCode,
      city,
      referrer: referrer || undefined,
      ip: ip || undefined,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}