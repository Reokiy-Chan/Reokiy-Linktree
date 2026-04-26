import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/app/lib/auth'
import { readVisits } from '@/app/lib/data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const jar = await cookies()
  const token = jar.get('admin_session')?.value
  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'
  if (!token || !verifyToken(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
      }
      const tick = () => {
        try {
          const { visits } = readVisits()
          const now = Date.now()
          const oneHourAgo = now - 60 * 60 * 1000
          const oneDayAgo = now - 24 * 60 * 60 * 1000
          const activeLastHour = visits.filter(v => new Date(v.timestamp).getTime() >= oneHourAgo).length
          const todayTotal = visits.filter(v => new Date(v.timestamp).getTime() >= oneDayAgo).length
          const recent = [...visits].reverse()
            .filter(v => v.lat != null && v.lon != null)
            .slice(0, 8)
            .map(v => ({ lat: v.lat!, lon: v.lon!, country: v.country ?? '', city: v.city ?? '', page: v.page, timestamp: v.timestamp }))
          send({ activeLastHour, todayTotal, recent, ts: now })
        } catch {
          send({ activeLastHour: 0, todayTotal: 0, recent: [], ts: Date.now() })
        }
      }
      tick()
      const interval = setInterval(tick, 5000)
      req.signal.addEventListener('abort', () => { clearInterval(interval); try { controller.close() } catch {} })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}