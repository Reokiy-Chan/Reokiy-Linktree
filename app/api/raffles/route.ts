import { NextResponse } from 'next/server'
import { listRaffles } from '@/app/lib/raffles'

// Revalidate every 30 seconds — active raffles change infrequently
export const revalidate = 30

export async function GET() {
  const all = await listRaffles()
  const now = new Date()
  const active = all.filter(r => r.status === 'active' && (!r.endsAt || new Date(r.endsAt) > now))
  const ended  = all.filter(r => r.status === 'ended' || (r.endsAt && new Date(r.endsAt) <= now))

  return NextResponse.json(
    { active, ended },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
  )
}