import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { updateRaffle, deleteRaffle, listRaffles } from '@/app/lib/raffles'
import { appendAudit } from '@/app/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }, body] = await Promise.all([getSession(req), params, req.json().catch(() => ({}))])
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const updated = await updateRaffle(id, body)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await appendAudit({
    action: 'raffle.update',
    actorId: session.uid, actorName: session.u, actorUsername: session.u,
    target: updated.title, detail: Object.keys(body).join(', '),
  }).catch(() => {})
  return NextResponse.json({ raffle: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(req), params])
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const raffles = await listRaffles()
  const raffle = raffles.find(r => r.id === id)
  await deleteRaffle(id)
  await appendAudit({
    action: 'raffle.delete',
    actorId: session.uid, actorName: session.u, actorUsername: session.u,
    target: raffle?.title ?? id,
  }).catch(() => {})
  return NextResponse.json({ ok: true })
}