import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { readVisits, computeStats } from '@/app/lib/data'
import { listRaffles } from '@/app/lib/raffles'
import { listCodes } from '@/app/lib/codes'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [{ visits }, raffles, codes] = await Promise.all([
    readVisits(),
    listRaffles(),
    listCodes(),
  ])
  const stats = computeStats(visits)

  const activeRaffles = raffles.filter(r => r.status === 'active')
  const totalEntries = raffles.reduce((s, r) => s + r.entries.length, 0)
  const totalWinners = raffles.reduce((s, r) => s + (r.winners?.length ?? (r.winnerId ? 1 : 0)), 0)
  const recentRaffles = [...raffles]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map(r => ({ id: r.id, title: r.title, status: r.status, entries: r.entries.length }))

  const totalCodes = codes.length
  const redeemedCodes = codes.filter(c => c.used || (c.useCount ?? 0) > 0).length
  const availableCodes = totalCodes - redeemedCodes
  const byType = ['link', 'text', 'image', 'fansly'].map(t => ({
    type: t,
    count: codes.filter(c => c.rewardType === t).length,
  })).filter(t => t.count > 0)

  return NextResponse.json({
    ...stats,
    raffles: {
      active: activeRaffles.length,
      total: raffles.length,
      totalEntries,
      totalWinners,
      recent: recentRaffles,
    },
    codes: {
      total: totalCodes,
      redeemed: redeemedCodes,
      available: availableCodes,
      byType,
    },
  })
}
