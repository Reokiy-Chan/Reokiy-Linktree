import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/app/lib/auth'
import { readSettings, updateSettings, type SiteSettings } from '@/app/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await validateSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const settings = await readSettings()
  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  if (!(await validateSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}
