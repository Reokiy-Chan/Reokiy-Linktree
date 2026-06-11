import { NextRequest, NextResponse } from 'next/server'
import { enterRaffle } from '@/app/lib/raffles'
import { readSettings, attackRateLimit, getTrueClientIp  } from '@/app/lib/settings'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const settings = await readSettings()
  if (!settings.rafflesEnabled) {
    return NextResponse.json({ error: 'Giveaways are temporarily disabled' }, { status: 503 })
  }
  if (settings.attackMode && !attackRateLimit(getTrueClientIp (req.headers))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await params
  const { discordUsername } = await req.json().catch(() => ({}))
  if (!discordUsername || typeof discordUsername !== 'string' || !discordUsername.trim()) {
    return NextResponse.json({ error: 'Discord username requerido' }, { status: 400 })
  }
  const result = await enterRaffle(id, discordUsername.trim())
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}