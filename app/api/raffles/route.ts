import { NextResponse } from 'next/server'
import { listRaffles } from '@/app/lib/raffles'

// Must be dynamic: with ISR this route gets frozen at build time and the
// home page shows "starting soon" even when giveaways are active.
export const dynamic = 'force-dynamic'

export async function GET() {
  const all = await listRaffles()
  const now = new Date()
  const active = all.filter(r => r.status === 'active' && (!r.endsAt || new Date(r.endsAt) > now))
  const ended  = all.filter(r => r.status === 'ended' || (r.endsAt && new Date(r.endsAt) <= now))

  return NextResponse.json(
    { active, ended },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}