import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { deleteCode } from '@/app/lib/codes'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await deleteCode(id)
  return NextResponse.json({ ok: true })
}