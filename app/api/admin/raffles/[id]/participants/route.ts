import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/app/lib/auth'
import { addParticipant, removeParticipant } from '@/app/lib/raffles'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [valid, { id }, body] = await Promise.all([validateSession(req), params, req.json().catch(() => ({}))])
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { discordUsername } = body
  if (!discordUsername?.trim()) return NextResponse.json({ error: 'discordUsername required' }, { status: 400 })
  const result = await addParticipant(id, discordUsername.trim())
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [valid, { id }, body] = await Promise.all([validateSession(req), params, req.json().catch(() => ({}))])
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { discordUsername } = body
  if (!discordUsername?.trim()) return NextResponse.json({ error: 'discordUsername required' }, { status: 400 })
  const result = await removeParticipant(id, discordUsername.trim())
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}