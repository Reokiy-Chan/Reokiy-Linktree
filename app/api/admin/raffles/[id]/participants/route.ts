import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { addParticipant, removeParticipant } from '@/app/lib/raffles'
import type { SessionPayload } from '@/app/lib/auth'

function canManage(s: SessionPayload): boolean {
  return s.r === 'root' || s.p === 'all' ||
    (Array.isArray(s.p) && (s.p.includes('admin') || s.p.includes('owner')))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }, body] = await Promise.all([getSession(req), params, req.json().catch(() => ({}))])
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { discordUsername } = body
  if (!discordUsername?.trim()) return NextResponse.json({ error: 'discordUsername required' }, { status: 400 })
  const result = await addParticipant(id, discordUsername.trim())
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }, body] = await Promise.all([getSession(req), params, req.json().catch(() => ({}))])
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { discordUsername } = body
  if (!discordUsername?.trim()) return NextResponse.json({ error: 'discordUsername required' }, { status: 400 })
  const result = await removeParticipant(id, discordUsername.trim())
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
