import { NextResponse, after } from 'next/server'
import { syncSchedule, observeVisitors, upcomingStreams } from '@/app/lib/fansly-live'
import { announceLive } from '@/app/lib/fansly-notify'
import { pushConfigured } from '@/app/lib/fansly-push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Public, minimal live status — polled by the homepage.
// Also drives the schedule: due auto-start streams are switched on here.
export async function GET() {
  try {
    const { state: synced, autoStarted } = await syncSchedule()
    if (autoStarted) after(() => announceLive(synced).catch(() => {}))
    const s = await observeVisitors(synced)
    return NextResponse.json({
      isLive: s.isLive,
      title: s.title,
      url: s.url,
      redirectWhenLive: s.redirectWhenLive,
      bannerStyle: s.bannerStyle,
      ctaText: s.ctaText,
      liveSince: s.liveSince ?? null,
      schedule: upcomingStreams(s.schedule).slice(0, 5).map(({ id, title, at }) => ({ id, title, at })),
      pushKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({
      isLive: false, title: '', url: '', redirectWhenLive: false, bannerStyle: 'compact',
      ctaText: '', liveSince: null, schedule: [], pushKey: null,
    })
  }
}
