import { NextRequest, NextResponse } from 'next/server'
import { getSession, verifyPassword, hashPassword } from '@/app/lib/auth'
import { getUser, ensureRoot, toSafeUser, PERMISSIONS, updateUser, touchLastActive } from '@/app/lib/users'
import { appendAudit } from '@/app/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Returns the currently logged-in admin (profile + effective permissions).
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.setup) return NextResponse.json({ setup: true }, { status: 200 })

  const user = session.uid === 'root' ? await ensureRoot() : await getUser(session.uid)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  touchLastActive(user.id).catch(() => {})

  return NextResponse.json({
    user: toSafeUser(user),
    isRoot: !!user.isRoot,
    permissions: user.isRoot ? [...PERMISSIONS] : user.permissions,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const user = await getUser(session.uid)   // ✅ corregido: uid, no userId
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}

  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (typeof body.avatar === 'string') updates.avatar = body.avatar
  if (typeof body.pronouns === 'string') updates.pronouns = body.pronouns.slice(0, 40)
  if (typeof body.bio === 'string') updates.bio = body.bio.slice(0, 280)
  if (typeof body.bannerUrl === 'string') updates.bannerUrl = body.bannerUrl
  if (body.dismissMessage === true) updates.pendingMessage = undefined

  if (body.changePassword) {
    const { current, next } = body.changePassword
    if (!user.isRoot) {
      const { ok } = await verifyPassword(current, user.passwordHash ?? '')
      if (!ok) return NextResponse.json({ error: 'Wrong Password' }, { status: 400 })
    }
    if (!next || next.length < 6) return NextResponse.json({ error: 'At Least 6 Characters' }, { status: 400 })
    updates.passwordHash = await hashPassword(next)
  }

  await updateUser(user.id, updates)
  const action = updates.passwordHash ? 'account.password' : 'account.update'
  await appendAudit({
    action, actorId: session.uid, actorName: session.u, actorUsername: session.u,
    detail: updates.passwordHash ? 'password updated' : Object.keys(updates).join(', '),
  }).catch(() => {})
  return NextResponse.json({ ok: true })
}