import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { readSettings, updateSettings, type SiteSettings } from '@/app/lib/settings'
import { appendAudit } from '@/app/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Any logged-in non-setup admin (root, owner, or admin) may manage settings
function canManage(session: Awaited<ReturnType<typeof getSession>>): boolean {
  if (!session || session.setup) return false
  if (session.r === 'root') return true
  if (session.p === 'all') return true
  if (Array.isArray(session.p)) {
    return session.p.includes('admin') || session.p.includes('owner') || session.p.includes('settings')
  }
  return false
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const settings = await readSettings()
  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req)
  if (!canManage(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json() as Partial<SiteSettings>
    const patch: Partial<SiteSettings> = {}
    if (typeof body.maintenanceMode === 'boolean') patch.maintenanceMode = body.maintenanceMode
    if (typeof body.maintenanceMessage === 'string') patch.maintenanceMessage = body.maintenanceMessage.slice(0, 280)
    if (typeof body.attackMode === 'boolean') patch.attackMode = body.attackMode
    if (typeof body.redeemEnabled === 'boolean') patch.redeemEnabled = body.redeemEnabled
    if (typeof body.rafflesEnabled === 'boolean') patch.rafflesEnabled = body.rafflesEnabled
    if (typeof body.trackingEnabled === 'boolean') patch.trackingEnabled = body.trackingEnabled
    const settings = await updateSettings(patch)
    await appendAudit({
      action: 'settings.update',
      actorId: session!.uid ?? 'unknown', actorName: session!.u ?? 'unknown', actorUsername: session!.u ?? 'unknown',
      target: Object.keys(patch).join(', '),
      detail: JSON.stringify(patch),
    }).catch(() => {})
    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}