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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect all /admin routes except /admin/login
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('admin_session')?.value
    const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'

    if (!token || !(await verifyTokenEdge(token, secret))) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
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
