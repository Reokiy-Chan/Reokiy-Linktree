import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface EnvVar {
  key: string
  set: boolean
  severity: 'critical' | 'warning' | 'info'
  label: string
  effect: string
  group?: string
  aliases?: string[]
}

const CHECKS: Omit<EnvVar, 'set'>[] = [
  // ── Data persistence ──────────────────────────────────────────
  {
    key: 'UPSTASH_REDIS_REST_URL',
    severity: 'critical',
    label: 'Upstash Redis URL',
    effect: 'All data (audit log, settings, visits) is lost on every Vercel cold start.',
    group: 'redis',
    aliases: ['KV_REST_API_URL'],
  },
  {
    key: 'UPSTASH_REDIS_REST_TOKEN',
    severity: 'critical',
    label: 'Upstash Redis token',
    effect: 'All data (audit log, settings, visits) is lost on every Vercel cold start.',
    group: 'redis',
    aliases: ['KV_REST_API_TOKEN'],
  },
  // ── Security ──────────────────────────────────────────────────
  {
    key: 'ADMIN_SECRET',
    severity: 'critical',
    label: 'Admin JWT secret',
    effect: 'Sessions are signed with the insecure default key — anyone who knows it can forge admin cookies.',
    group: 'auth',
  },
  // ── Storage ───────────────────────────────────────────────────
  {
    key: 'BLOB_READ_WRITE_TOKEN',
    severity: 'warning',
    label: 'Vercel Blob token',
    effect: 'Image uploads are returned as inline base64 — they work but are not persisted to Blob storage.',
    group: 'blob',
  },
  // ── Captcha ───────────────────────────────────────────────────
  {
    key: 'NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY',
    severity: 'warning',
    label: 'Turnstile site key',
    effect: 'CAPTCHA widget will not render in Attack mode.',
    group: 'captcha',
  },
  {
    key: 'CF_TURNSTILE_SECRET_KEY',
    severity: 'warning',
    label: 'Turnstile secret key',
    effect: 'CAPTCHA verification will always fail — Attack mode CAPTCHA is non-functional.',
    group: 'captcha',
  },
  // ── Site identity ─────────────────────────────────────────────
  {
    key: 'NEXT_PUBLIC_SITE_URL',
    severity: 'info',
    label: 'Public site URL',
    effect: 'Open Graph meta tags and WebAuthn origin use a fallback URL instead of your real domain.',
    group: 'site',
  },
]

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Only root can see security-sensitive env var info
  if (session.r !== 'root' && session.p !== 'all') {
    return NextResponse.json({ vars: [] })
  }

  const vars: EnvVar[] = CHECKS.map(c => ({
    ...c,
    set: !!(process.env[c.key] || c.aliases?.some(a => process.env[a])),
  }))

  return NextResponse.json({ vars })
}
