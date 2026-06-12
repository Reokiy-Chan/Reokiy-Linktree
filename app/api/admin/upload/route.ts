import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.setup) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
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

    // Vercel Blob (production)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob')
      const buffer = await file.arrayBuffer()
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: file.type,
      })
      return NextResponse.json({ url: blob.url })
    }

    // Fallback: base64 data URL (dev / no Blob token)
    const buffer = await file.arrayBuffer()
    const b64 = Buffer.from(buffer).toString('base64')
    return NextResponse.json({ url: `data:${file.type};base64,${b64}` })

  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
