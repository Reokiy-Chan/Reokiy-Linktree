import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'File type not allowed. Use JPEG, PNG, GIF, WEBP or AVIF.' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  // Production: use Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob')
    const blob = await put(filename, file.stream(), {
      access: 'public',
      contentType: file.type,
    })
    return NextResponse.json({ url: blob.url })
  }

  // Development fallback: base64 data URL (no filesystem writes needed)
  const buffer = await file.arrayBuffer()
  const b64 = Buffer.from(buffer).toString('base64')
  const dataUrl = `data:${file.type};base64,${b64}`
  return NextResponse.json({ url: dataUrl })
}
