import { NextRequest, NextResponse } from 'next/server'
import { registerLiveClick } from '@/app/lib/fansly-live'
import { attackRateLimit, getTrueClientIp, readSettings } from '@/app/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const settings = await readSettings()
  if (settings.attackMode && !attackRateLimit(getTrueClientIp(req.headers))) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }
  await registerLiveClick().catch(() => {})
  return NextResponse.json({ ok: true })
}
