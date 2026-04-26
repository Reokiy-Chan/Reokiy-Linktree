import { NextResponse } from 'next/server'
import { readdirSync, existsSync } from 'fs'
import path from 'path'

const CAROUSEL_DIR = path.join(process.cwd(), 'public', 'images', 'carrousel')
const SUPPORTED = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'])

export async function GET() {
  try {
    if (!existsSync(CAROUSEL_DIR)) {
      return NextResponse.json({ images: [] })
    }
    const files = readdirSync(CAROUSEL_DIR)
    const images = files.filter(f => {
      const ext = f.split('.').pop()?.toLowerCase()
      return ext && SUPPORTED.has(ext) && !f.startsWith('.')
    })
    return NextResponse.json({ images })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
