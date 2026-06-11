import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { readVisits } from '@/app/lib/data'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { visits } = await readVisits()
  const withCoords = [...visits].reverse()
    .filter(v => v.lat != null && v.lon != null)
    .slice(0, 60)
    .map(v => ({ lat: v.lat!, lon: v.lon!, country: v.country ?? '', city: v.city ?? '', page: v.page, timestamp: v.timestamp }))
  return NextResponse.json({ visits: withCoords })
}