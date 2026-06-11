import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { readVisits, computeStats } from '@/app/lib/data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { visits } = await readVisits()
  const stats = computeStats(visits)
  return NextResponse.json(stats)
}