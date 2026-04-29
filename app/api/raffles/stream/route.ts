import { NextRequest } from 'next/server'
import { listRaffles } from '@/app/lib/raffles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
      }

      const tick = async () => {
        try {
          const all = await listRaffles()
          const now = new Date()
          const active = all.filter(r => r.status === 'active' && (!r.endsAt || new Date(r.endsAt) > now))
          const ended  = all.filter(r => r.status === 'ended'  || (r.endsAt && new Date(r.endsAt) <= now))
          send({ active, ended, ts: Date.now() })
        } catch {
          send({ active: [], ended: [], ts: Date.now() })
        }
      }

      tick()
      const interval = setInterval(tick, 4000)
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        try { controller.close() } catch {}
      })
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