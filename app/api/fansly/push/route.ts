import { NextRequest, NextResponse } from 'next/server'
import { addSub, removeSub, validSub, pushConfigured } from '@/app/lib/fansly-push'
import { attackRateLimit, getTrueClientIp, readSettings } from '@/app/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function limited(req: NextRequest): Promise<boolean> {
  const settings = await readSettings()
  return settings.attackMode && !attackRateLimit(getTrueClientIp(req.headers))
}

// Visitor subscribes to "notify me" when a stream starts
export async function POST(req: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ error: 'Not available' }, { status: 404 })
  if (await limited(req)) return NextResponse.json({ ok: false }, { status: 429 })
  const body = await req.json().catch(() => null) as { subscription?: unknown } | null
  const sub = validSub(body?.subscription)
  if (!sub) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  const ok = await addSub(sub)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Full' }, { status: 503 })
}

export async function DELETE(req: NextRequest) {
  if (await limited(req)) return NextResponse.json({ ok: false }, { status: 429 })
  const body = await req.json().catch(() => null) as { endpoint?: unknown } | null
  if (typeof body?.endpoint === 'string') await removeSub(body.endpoint)
  return NextResponse.json({ ok: true })
}
