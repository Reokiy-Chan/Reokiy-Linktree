import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { listAudit } from '@/app/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  // Solo root o quien tenga permiso 'settings' puede ver los logs
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const canView = session.r === 'root' || session.p === 'all' || (Array.isArray(session.p) && session.p.includes('settings'))
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200'), 500)
  const entries = await listAudit(limit)
  return NextResponse.json({ entries })
}