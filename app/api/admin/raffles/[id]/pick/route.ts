import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/app/lib/auth'
import { pickWinner } from '@/app/lib/raffles'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await validateSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const prizeId = body.prizeId ?? undefined
  const result = await pickWinner(id, prizeId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ winner: result.winner, raffle: result.raffle })
}