import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/app/lib/auth'
import { duplicateRaffle } from '@/app/lib/raffles'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await validateSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const copy = await duplicateRaffle(id)
  if (!copy) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ raffle: copy })
}