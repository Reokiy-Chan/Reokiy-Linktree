import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/app/lib/auth'
import { readVisits } from '@/app/lib/data'

export async function GET(req: NextRequest) {
  const jar = await cookies()
  const token = jar.get('admin_session')?.value
  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'
  if (!token || !verifyToken(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { visits } = await readVisits()
  const withCoords = [...visits].reverse()
    .filter(v => v.lat != null && v.lon != null)
    .slice(0, 60)
    .map(v => ({ lat: v.lat!, lon: v.lon!, country: v.country ?? '', city: v.city ?? '', page: v.page, timestamp: v.timestamp }))
  return NextResponse.json({ visits: withCoords })
}