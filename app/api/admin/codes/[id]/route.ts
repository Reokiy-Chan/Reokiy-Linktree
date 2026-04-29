import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/app/lib/auth'
import { deleteCode } from '@/app/lib/codes'

async function auth() {
  const jar = await cookies()
  const token = jar.get('admin_session')?.value
  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'
  return token && verifyToken(token, secret)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await deleteCode(id)
  return NextResponse.json({ ok: true })
}