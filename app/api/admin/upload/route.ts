import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import path from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, GIF, WEBP or AVIF.' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  // ── Production: Vercel Blob ──────────────────────────────────────────────
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import('@vercel/blob')
      const ext = file.name.split('.').pop() ?? 'bin'
      const filename = `redeem/${crypto.randomUUID()}.${ext}`
      const blob = await put(filename, file, { access: 'public', contentType: file.type })
      return NextResponse.json({ url: blob.url })
    } catch (err) {
      console.error('Blob upload error:', err)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
  }

  // ── Development: local filesystem fallback ───────────────────────────────
  try {
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase()
    const filename = `${crypto.randomUUID()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    writeFileSync(path.join(uploadDir, filename), buffer)
    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (err) {
    console.error('Local upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}