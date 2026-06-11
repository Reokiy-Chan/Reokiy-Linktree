import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { readSettings, updateSettings, type SiteSettings } from '@/app/lib/settings'
import { appendAudit } from '@/app/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// True if the session may manage settings (root, or has the 'settings' grant)
function canManage(session: Awaited<ReturnType<typeof getSession>>): boolean {
  if (!session || session.setup) return false
  return session.r === 'root' || session.p === 'all' || (Array.isArray(session.p) && session.p.includes('settings'))
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
  if (!canManage(await getSession(req))) {
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
    const session2 = await getSession(req)
    const settings = await updateSettings(patch)
    await appendAudit({
      action: 'settings.update',
      actorId: session2?.uid ?? 'unknown', actorName: session2?.u ?? 'unknown', actorUsername: session2?.u ?? 'unknown',
      target: Object.keys(patch).join(', '),
      detail: JSON.stringify(patch),
    }).catch(() => {})
    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}