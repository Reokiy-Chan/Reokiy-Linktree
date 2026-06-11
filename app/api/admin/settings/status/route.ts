import { NextResponse } from 'next/server'
import { readSettings } from '@/app/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Public, minimal status — used by middleware and the maintenance page.
export async function GET() {
  try {
    const s = await readSettings()
    return NextResponse.json({
      maintenance: s.maintenanceMode,
      message: s.maintenanceMessage || null,
      redeemEnabled: s.redeemEnabled,
      rafflesEnabled: s.rafflesEnabled,
      attackMode: s.attackMode,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ maintenance: false, message: null, redeemEnabled: true, rafflesEnabled: true, attackMode: false })
  }
}