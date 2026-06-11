import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { removeWebAuthnCredential } from '@/app/lib/users'

export const runtime = 'nodejs'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  // Los IDs de credencial son base64url y pueden contener '/' — están URL‑encoded
  const credId = decodeURIComponent(id)
  await removeWebAuthnCredential(session.uid, credId)
  return NextResponse.json({ ok: true })
}