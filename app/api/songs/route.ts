import { NextResponse } from 'next/server'
import { readdirSync, existsSync } from 'fs'
import path from 'path'

const SONGS_DIR = path.join(process.cwd(), 'public', 'audio', 'songs')
const SUPPORTED = new Set(['mp3', 'mp4', 'm4a', 'ogg', 'wav', 'flac', 'aac'])

let cachedSongs: string[] | null = null

export async function GET() {
  if (cachedSongs) return NextResponse.json({ songs: cachedSongs })
  try {
    if (!existsSync(SONGS_DIR)) {
      return NextResponse.json({ songs: [] })
    }
    const files = readdirSync(SONGS_DIR)
    cachedSongs = files.filter(f => {
      const ext = f.split('.').pop()?.toLowerCase()
      return ext && SUPPORTED.has(ext) && !f.startsWith('.')
    })
    return NextResponse.json({ songs: cachedSongs })
  } catch {
    return NextResponse.json({ songs: [] })
  }
}
