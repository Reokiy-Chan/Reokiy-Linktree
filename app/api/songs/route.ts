import { NextResponse } from 'next/server'
import { readdirSync, existsSync } from 'fs'
import path from 'path'

const SONGS_DIR = path.join(process.cwd(), 'public', 'audio', 'songs')
const SUPPORTED = new Set(['mp3', 'mp4', 'm4a', 'ogg', 'wav', 'flac', 'aac'])

export async function GET() {
  try {
    if (!existsSync(SONGS_DIR)) {
      return NextResponse.json({ songs: [] })
    }
    const files = readdirSync(SONGS_DIR)
    const songs = files.filter(f => {
      const ext = f.split('.').pop()?.toLowerCase()
      return ext && SUPPORTED.has(ext) && !f.startsWith('.')
    })
    return NextResponse.json({ songs })
  } catch {
    return NextResponse.json({ songs: [] })
  }
}
