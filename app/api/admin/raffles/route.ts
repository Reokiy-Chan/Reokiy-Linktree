import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/app/lib/auth'
import { listRaffles, createRaffle } from '@/app/lib/raffles'
import type { RafflePrize } from '@/app/lib/raffles'

export async function GET(req: NextRequest) {
  if (!await validateSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const all = await listRaffles()
  return NextResponse.json({ raffles: all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) })
}

export async function POST(req: NextRequest) {
  if (!await validateSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body?.title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const raffle = await createRaffle({
    title: body.title,
    description: body.description ?? '',
    prizes: (body.prizes ?? []) as RafflePrize[],
    endsAt: body.endsAt,
    autoEnd: body.autoEnd ?? false,
    maxWinners: body.maxWinners ? Number(body.maxWinners) : 1,
    bannedUsernames: body.bannedUsernames ?? [],
    winners: [],
    winnerId: undefined,
    pickedAt: undefined,
  })
  return NextResponse.json({ raffle })
}