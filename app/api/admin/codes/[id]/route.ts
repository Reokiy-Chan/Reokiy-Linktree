import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { deleteCode, updateCode } from '@/app/lib/codes'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const code = await updateCode(id, {
    ...(typeof body.rewardTitle === 'string' ? { rewardTitle: body.rewardTitle } : {}),
    ...(typeof body.adminNote === 'string' ? { adminNote: body.adminNote } : {}),
  })
  if (!code) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ code })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await deleteCode(id)
  return NextResponse.json({ ok: true })
}