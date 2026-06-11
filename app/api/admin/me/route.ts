import { NextRequest, NextResponse } from 'next/server'
import { getSession, verifyPassword, hashPassword } from '@/app/lib/auth'
import { getUser, ensureRoot, toSafeUser, SECTIONS, updateUser } from '@/app/lib/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Returns the currently logged-in admin (profile + effective permissions).
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.setup) return NextResponse.json({ setup: true }, { status: 200 })

  const user = session.uid === 'root' ? await ensureRoot() : await getUser(session.uid)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    user: toSafeUser(user),
    isRoot: !!user.isRoot,
    permissions: user.isRoot ? [...SECTIONS] : user.permissions,
  })
}

export async function PATCH(req: Request) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const user = await getUser(session.uid)   // ✅ corregido: uid, no userId
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}

  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (typeof body.avatar === 'string') updates.avatar = body.avatar

  if (body.changePassword) {
    const { current, next } = body.changePassword
    if (!user.isRoot) {
      const ok = await verifyPassword(current, user.passwordHash ?? '')
      if (!ok) return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
    }
    if (!next || next.length < 6) return NextResponse.json({ error: 'Mínimo 6 caracteres' }, { status: 400 })
    updates.passwordHash = await hashPassword(next)
  }

  await updateUser(user.id, updates)
  return NextResponse.json({ ok: true })
}