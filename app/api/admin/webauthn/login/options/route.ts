import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { getUser } from '@/app/lib/users'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { username?: string }
  const username = body.username?.trim().toLowerCase()
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 })
  }

  const user = await getUser(session.uid)
  if (!user || user.username !== username) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const credentials = user.webauthnCredentials ?? []

  const options = await generateAuthenticationOptions({
    rpID: process.env.WEBAUTHN_RPID ?? 'localhost',
    allowCredentials: credentials.map(cred => ({
      id: cred.id,
      transports: cred.transports as AuthenticatorTransportFuture[] | undefined,
    })),
    userVerification: 'preferred',
  })

  // Guardar challenge en sesión (por ejemplo, en una cookie o en memoria; aquí simplificamos)
  // Normalmente se guarda en una cookie httpOnly. Por simplicidad, devolvemos un token.
  const challengeToken = Buffer.from(JSON.stringify({ challenge: options.challenge, userId: session.uid })).toString('base64url')
  const response = NextResponse.json({ ...options, _token: challengeToken })
  response.cookies.set('webauthn_challenge', challengeToken, { httpOnly: true, maxAge: 300, path: '/' })
  return response
}