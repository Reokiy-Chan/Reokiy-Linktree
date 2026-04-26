import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/app/lib/auth'
import { readVisits, computeStats } from '@/app/lib/data'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value
  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'

  if (!token || !verifyToken(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { visits } = readVisits()
  const stats = computeStats(visits)
  return NextResponse.json(stats)
}