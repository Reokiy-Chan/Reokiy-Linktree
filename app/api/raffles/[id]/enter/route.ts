import { NextRequest, NextResponse } from 'next/server'
import { enterRaffle } from '@/app/lib/raffles'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { discordUsername } = await req.json().catch(() => ({}))
  if (!discordUsername || typeof discordUsername !== 'string' || !discordUsername.trim()) {
    return NextResponse.json({ error: 'Discord username requerido' }, { status: 400 })
  }
  const result = await enterRaffle(id, discordUsername.trim())
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}