import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { listUsers, createUser, toSafeUser, SECTIONS, type Section } from '@/app/lib/users'
import { appendAudit } from '@/app/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function canManageUsers(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || session.setup) return false
  if (session.r === 'root') return true
  return Array.isArray(session.p) && session.p.includes('owner')
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const users = await listUsers()
  return NextResponse.json({ users: users.map(toSafeUser) })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!canManageUsers(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json() as { username?: string; name?: string; avatar?: string; permissions?: string[] }
    const permissions = (body.permissions ?? []).filter((p): p is Section => (SECTIONS as readonly string[]).includes(p))
    const result = await createUser({
      username: body.username ?? '',
      name: body.name ?? '',
      avatar: body.avatar,
      permissions,
      createdBy: session!.u,
    })
    if (!result.ok || !result.user) return NextResponse.json({ error: result.error }, { status: 400 })
    await appendAudit({
      action: 'user.create',
      actorId: session!.uid, actorName: session!.u, actorUsername: session!.u,
      target: body.username,
      detail: `permissions: ${permissions.join(', ') || 'none'}`,
    }).catch(() => {})
    // OTP is returned exactly once, to the creator
    return NextResponse.json({ user: toSafeUser(result.user), otp: result.otp })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}