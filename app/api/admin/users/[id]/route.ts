import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { getUser, updateUser, deleteUser, resetOtp, toSafeUser, PERMISSIONS, type Permission } from '@/app/lib/users'
import { appendAudit } from '@/app/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function canOwner(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || session.setup) return false
  if (session.r === 'root') return true
  return Array.isArray(session.p) && session.p.includes('owner')
}

function canAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || session.setup) return false
  if (session.r === 'root') return true
  return Array.isArray(session.p) && (session.p.includes('owner') || session.p.includes('admin'))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!canAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const target = await getUser(id)
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  try {
    const body = await req.json() as {
      name?: string; avatar?: string; permissions?: string[]; action?: string
      text?: string
    }

    // ── Actions ──────────────────────────────────────────────────────────────

    if (body.action === 'resetOtp') {
      const r = await resetOtp(id)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
      await appendAudit({ action: 'user.resetOtp', actorId: session!.uid, actorName: session!.u, actorUsername: session!.u, target: target.username }).catch(() => {})
      return NextResponse.json({ otp: r.otp })
    }

    if (body.action === 'requirePasswordChange') {
      const r = await resetOtp(id)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
      await appendAudit({ action: 'user.requirePasswordChange', actorId: session!.uid, actorName: session!.u, actorUsername: session!.u, target: target.username }).catch(() => {})
      return NextResponse.json({ otp: r.otp })
    }

    if (body.action === 'sendMessage') {
      if (!body.text?.trim()) return NextResponse.json({ error: 'Message text required' }, { status: 400 })
      await updateUser(id, {
        pendingMessage: { text: body.text.trim(), from: session!.u, at: new Date().toISOString() }
      })
      await appendAudit({ action: 'user.sendMessage', actorId: session!.uid, actorName: session!.u, actorUsername: session!.u, target: target.username, detail: body.text.trim().slice(0, 80) }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'dismissMessage') {
      await updateUser(id, { pendingMessage: undefined })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'suspend') {
      await updateUser(id, { suspended: true })
      await appendAudit({ action: 'user.suspend', actorId: session!.uid, actorName: session!.u, actorUsername: session!.u, target: target.username }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'unsuspend') {
      await updateUser(id, { suspended: false })
      await appendAudit({ action: 'user.unsuspend', actorId: session!.uid, actorName: session!.u, actorUsername: session!.u, target: target.username }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    // ── Info / permission edits — owner only ─────────────────────────────────
    if (!canOwner(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
    if (typeof body.avatar === 'string') patch.avatar = body.avatar
    if (Array.isArray(body.permissions) && !target.isRoot) {
      patch.permissions = body.permissions.filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p))
    }
    const updated = await updateUser(id, patch)
    await appendAudit({
      action: 'user.update',
      actorId: session!.uid, actorName: session!.u, actorUsername: session!.u,
      target: target.username, detail: Object.keys(patch).join(', '),
    }).catch(() => {})
    return NextResponse.json({ user: updated ? toSafeUser(updated) : null })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!canOwner(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const targetUser = await getUser(id)
  const r = await deleteUser(id)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  await appendAudit({
    action: 'user.delete',
    actorId: session!.uid, actorName: session!.u, actorUsername: session!.u,
    target: targetUser?.username,
  }).catch(() => {})
  return NextResponse.json({ ok: true })
}
