import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { getUser, ensureRoot, toSafeUser, SECTIONS } from '@/app/lib/users'

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
