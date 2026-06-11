import { NextRequest, NextResponse } from 'next/server'

// Web Crypto API — works in both Edge and Node.js runtimes
async function verifyTokenEdge(token: string, secret: string): Promise<boolean> {
  try {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return false
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
    const expected = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
    return sig === expected
  } catch { return false }
}

// Decodes the JSON identity payload (does NOT verify — call verifyTokenEdge first)
function decodePayload(token: string): { r?: string; setup?: boolean; p?: string[] | 'all' } | null {
  try {
    const [payloadB64] = token.split('.')
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch { return null }
}

// ─── Maintenance flag ─────────────────────────────────────────────────────────
// Reads Upstash directly when configured (fast + works on cold edge instances),
// falls back to the settings API for local/file-system mode. Short cache so a
// toggle propagates within a few seconds, stale value kept on fetch errors.

let maintenanceCache: { value: boolean; at: number } = { value: false, at: 0 }
const MAINTENANCE_TTL = 5_000

async function fetchMaintenanceFlag(origin: string): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    try {
      const res = await fetch(`${url}/get/reokiy:settings`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(2500),
      })
      if (res.ok) {
        const d = await res.json() as { result: string | null }
        if (!d.result) return false
        const settings = typeof d.result === 'string' ? JSON.parse(d.result) : d.result
        return !!settings?.maintenanceMode
      }
    } catch { }
    return null
  }
  try {
    const res = await fetch(`${origin}/api/settings/status`, { signal: AbortSignal.timeout(2500) })
    if (res.ok) {
      const d = await res.json() as { maintenance?: boolean }
      return !!d.maintenance
    }
  } catch { }
  return null
}

async function isMaintenanceOn(origin: string): Promise<boolean> {
  if (Date.now() - maintenanceCache.at < MAINTENANCE_TTL) return maintenanceCache.value
  const flag = await fetchMaintenanceFlag(origin)
  if (flag !== null) maintenanceCache = { value: flag, at: Date.now() }
  return maintenanceCache.value
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Maintenance mode — admin keeps working, everything else goes to /maintenance
  if (!pathname.startsWith('/admin') && pathname !== '/maintenance') {
    if (await isMaintenanceOn(request.nextUrl.origin)) {
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
  }
  // When maintenance is off, /maintenance bounces back home
  if (pathname === '/maintenance' && !(await isMaintenanceOn(request.nextUrl.origin))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('admin_session')?.value
    const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'

    if (!token || !(await verifyTokenEdge(token, secret))) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const payload = decodePayload(token)

    // ✅ FIX: Si el payload no es JSON válido con identidad → rechazar
    if (!payload || !payload.r) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Setup token solo sirve para terminar el setup
    if (payload.setup) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // User management is root-only
    if (pathname.startsWith('/admin/users') && payload.r !== 'root') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Per-section gating
    if (payload.r !== 'root' && Array.isArray(payload.p)) {
      const SECTION_PATHS: [string, string][] = [
        ['/admin/live', 'live'], ['/admin/traffic', 'traffic'],
        ['/admin/sessions', 'sessions'], ['/admin/codes', 'codes'],
        ['/admin/raffles', 'giveaways'], ['/admin/settings', 'settings'],
      ]
      const match = SECTION_PATHS.find(([p]) => pathname.startsWith(p))
      if (match && !payload.p.includes(match[1])) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
  }

  // Inject x-pathname for any layouts that still need it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|svg|ico|webp|mp3|mp4)).*)',
  ],
}
