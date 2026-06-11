import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { readSettings, updateSettings, type SiteSettings } from '@/app/lib/settings'
import { appendAudit } from '@/app/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

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
  try {
    const session = await getSession(req)
    if (!session || session.setup) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const settings = await readSettings()
    return NextResponse.json({ settings })
  } catch (err) {
    console.error('[settings GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!canManage(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: Partial<SiteSettings>
    try {
      body = await req.json() as Partial<SiteSettings>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const patch: Partial<SiteSettings> = {}
    if (typeof body.maintenanceMode === 'boolean') patch.maintenanceMode = body.maintenanceMode
    if (typeof body.maintenanceMessage === 'string') patch.maintenanceMessage = body.maintenanceMessage.slice(0, 280)
    if (typeof body.attackMode === 'boolean') patch.attackMode = body.attackMode
    if (typeof body.redeemEnabled === 'boolean') patch.redeemEnabled = body.redeemEnabled
    if (typeof body.rafflesEnabled === 'boolean') patch.rafflesEnabled = body.rafflesEnabled
    if (typeof body.trackingEnabled === 'boolean') patch.trackingEnabled = body.trackingEnabled

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const settings = await updateSettings(patch)
    await appendAudit({
      action: 'settings.update',
      actorId: session!.uid ?? 'unknown',
      actorName: session!.u ?? 'unknown',
      actorUsername: session!.u ?? 'unknown',
      target: Object.keys(patch).join(', '),
      detail: JSON.stringify(patch),
    }).catch(() => {})
    return NextResponse.json({ settings })
  } catch (err) {
    console.error('[settings PATCH]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}