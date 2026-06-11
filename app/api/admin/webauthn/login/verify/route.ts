import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import { findUserByCredentialId, updateWebAuthnCounter, touchLastLogin } from '@/app/lib/users'
import { createSessionToken } from '@/app/lib/auth'
import { getRpConfig, consumeChallenge } from '@/app/lib/webauthn'

export const runtime = 'nodejs'

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export async function POST(req: NextRequest) {
  const body = await req.json() as AuthenticationResponseJSON & { _token: string }
  const { _token, ...response } = body

  const stored = await consumeChallenge(_token)
  if (!stored) {
    return NextResponse.json({ error: 'Challenge inválido o expirado' }, { status: 400 })
  }

  // Encontrar usuario por credentialID
  const user = await findUserByCredentialId(response.id)
  if (!user) {
    return NextResponse.json({ error: 'Credencial no reconocida' }, { status: 401 })
  }

  const cred = user.webauthnCredentials!.find(c => c.id === response.id)!
  const { rpID, origin } = getRpConfig()

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.id,
        publicKey: Buffer.from(cred.publicKey, 'base64url'),
        counter: cred.counter,
        transports: cred.transports as AuthenticatorTransportFuture[],
      },
      requireUserVerification: false,
    })
  } catch (e) {
    return NextResponse.json({ error: `Verificación fallida: ${(e as Error).message}` }, { status: 401 })
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  // Actualizar contador para prevenir ataques de replay
  await updateWebAuthnCounter(user.id, cred.id, verification.authenticationInfo.newCounter)
  await touchLastLogin(user.id)

  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'
  const token = createSessionToken({
    uid: user.id,
    u: user.username,
    r: user.isRoot ? 'root' : 'user',
    p: user.isRoot ? 'all' : user.permissions,
  }, secret)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return res
}