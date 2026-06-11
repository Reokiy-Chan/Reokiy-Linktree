import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { pickWinner } from '@/app/lib/raffles'
import { appendAudit } from '@/app/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }, body] = await Promise.all([getSession(req), params, req.json().catch(() => ({}))])
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prizeId = body.prizeId ?? undefined
  const result = await pickWinner(id, prizeId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  await appendAudit({
    action: 'raffle.pick',
    actorId: session.uid, actorName: session.u, actorUsername: session.u,
    target: result.raffle?.title ?? id,
    detail: `winner: ${result.winner}`,
  }).catch(() => {})
  return NextResponse.json({ winner: result.winner, raffle: result.raffle })
}