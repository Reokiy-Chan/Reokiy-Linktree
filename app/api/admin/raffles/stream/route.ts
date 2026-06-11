import { NextRequest } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { listRaffles } from '@/app/lib/raffles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
      }

      const tick = async () => {
        try {
          const raffles = await listRaffles()
          raffles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          send({ raffles, ts: Date.now() })
        } catch {
          send({ raffles: [], ts: Date.now() })
        }
      }

      tick()
      const interval = setInterval(tick, 3000)
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