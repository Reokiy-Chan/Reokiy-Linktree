import { readdirSync } from 'fs'
import path from 'path'

const BG_DIR = path.join(process.cwd(), 'public', 'images', 'bg')
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif'])

/** Every image dropped into public/images/bg is used as a background — no code changes needed. */
export function getBackgroundImages(): string[] {
  try {
    return readdirSync(BG_DIR)
      .filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .sort()
      .map(f => `/images/bg/${f}`)
  } catch {
    return []
  }
}
