import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { listUsers, createUser, toSafeUser, SECTIONS, type Section } from '@/app/lib/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireRoot(req: NextRequest) {
  const session = await getSession(req)
  return session && session.r === 'root' && !session.setup ? session : null
}

export async function GET(req: NextRequest) {
  if (!(await requireRoot(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const users = await listUsers()
  return NextResponse.json({ users: users.map(toSafeUser) })
}

export async function POST(req: NextRequest) {
  const session = await requireRoot(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json() as { username?: string; name?: string; avatar?: string; permissions?: string[] }
    const permissions = (body.permissions ?? []).filter((p): p is Section => SECTIONS.includes(p as Section))
    const result = await createUser({
      username: body.username ?? '',
      name: body.name ?? '',
      avatar: body.avatar,
      permissions,
      createdBy: session.u,
    })
    if (!result.ok || !result.user) return NextResponse.json({ error: result.error }, { status: 400 })
    // OTP is returned exactly once, to the creator
    return NextResponse.json({ user: toSafeUser(result.user), otp: result.otp })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}
