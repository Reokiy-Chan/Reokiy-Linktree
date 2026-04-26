import { NextRequest, NextResponse } from 'next/server'

/**
 * Inyecta x-pathname en los headers de cada request.
 * Los layouts server-side lo leen con headers() para saber en qué ruta están
 * (los layouts no reciben el request directamente en App Router).
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  // Aplica a todo excepto assets estáticos y rutas internas de Next.js
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|svg|ico|webp|mp3|mp4)).*)',
  ],
}