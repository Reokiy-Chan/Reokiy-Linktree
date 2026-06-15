import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { getGlobalBlacklist, addToGlobalBlacklist, removeFromGlobalBlacklist } from '@/app/lib/raffles'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const list = await getGlobalBlacklist()
  return NextResponse.json({ blacklist: list })
}

export async function POST(req: NextRequest) {
  const [session, body] = await Promise.all([getSession(req), req.json().catch(() => null)])
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!body?.username?.trim()) return NextResponse.json({ error: 'Username requerido' }, { status: 400 })
  await addToGlobalBlacklist({
    username: body.username.trim(),
    reason: body.reason?.trim() || undefined,
    addedAt: new Date().toISOString(),
    addedBy: session.u,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const [session, body] = await Promise.all([getSession(req), req.json().catch(() => null)])
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!body?.username) return NextResponse.json({ error: 'Username requerido' }, { status: 400 })
  await removeFromGlobalBlacklist(body.username)
  return NextResponse.json({ ok: true })
}
