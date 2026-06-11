import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { getUser, updateUser, deleteUser, resetOtp, toSafeUser, SECTIONS, type Section } from '@/app/lib/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireRoot(req: NextRequest) {
  const session = await getSession(req)
  return session && session.r === 'root' && !session.setup ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireRoot(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const target = await getUser(id)
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  try {
    const body = await req.json() as { name?: string; avatar?: string; permissions?: string[]; action?: string }

    // Action: regenerate one-time password
    if (body.action === 'resetOtp') {
      const r = await resetOtp(id)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
      return NextResponse.json({ otp: r.otp })
    }

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
    if (typeof body.avatar === 'string') patch.avatar = body.avatar
    if (Array.isArray(body.permissions) && !target.isRoot) {
      patch.permissions = body.permissions.filter((p): p is Section => SECTIONS.includes(p as Section))
    }
    const updated = await updateUser(id, patch)
    return NextResponse.json({ user: updated ? toSafeUser(updated) : null })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireRoot(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const r = await deleteUser(id)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
