import { NextRequest, NextResponse } from 'next/server'
import { validateSession, getSession } from '@/app/lib/auth'
import { getGlobalBlacklist, addToGlobalBlacklist, removeFromGlobalBlacklist } from '@/app/lib/raffles'

export async function GET(req: NextRequest) {
  if (!await validateSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const list = await getGlobalBlacklist()
  return NextResponse.json({ blacklist: list })
}

export async function POST(req: NextRequest) {
  if (!await validateSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body?.username?.trim()) return NextResponse.json({ error: 'Username requerido' }, { status: 400 })
  const session = await getSession(req)
  await addToGlobalBlacklist({
    username: body.username.trim(),
    reason: body.reason?.trim() || undefined,
    addedAt: new Date().toISOString(),
    addedBy: session?.u,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await validateSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body?.username) return NextResponse.json({ error: 'Username requerido' }, { status: 400 })
  await removeFromGlobalBlacklist(body.username)
  return NextResponse.json({ ok: true })
}
