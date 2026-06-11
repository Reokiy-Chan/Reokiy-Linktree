import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken } from '@/app/lib/auth'
import { getUser, ensureRoot, updateUser } from '@/app/lib/users'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { consumeChallenge, getRpConfig } from '@/app/lib/webauthn'

export const runtime = 'nodejs'

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { _token, id, rawId, response, authenticatorAttachment, clientExtensionResults, type } = body

  if (!_token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const stored = await consumeChallenge(_token)
  if (!stored) {
    return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 })
  }

  const user = stored.meta === 'root' ? await ensureRoot() : await getUser(stored.meta!)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const credential = user.webauthnCredentials?.find(c => c.id === id)
  if (!credential) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 400 })
  }

  const { rpID, origin } = getRpConfig()

  const verification = await verifyAuthenticationResponse({
    response: { id, rawId, response, authenticatorAttachment, clientExtensionResults, type },
    expectedChallenge: stored.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey, 'base64url'),
      counter: credential.counter ?? 0,
      transports: credential.transports as AuthenticatorTransportFuture[] | undefined,
    },
  })

  if (!verification.verified) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
  }

  if (user.webauthnCredentials) {
    const updatedCreds = user.webauthnCredentials.map(c =>
      c.id === id ? { ...c, counter: verification.authenticationInfo.newCounter } : c
    )
    await updateUser(user.id, { webauthnCredentials: updatedCreds })
  }

  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'
  const token = createSessionToken({
    uid: user.id, u: user.username, r: user.isRoot ? 'root' : 'user',
    p: user.isRoot ? 'all' : user.permissions,
  }, secret)

  const responseJson = NextResponse.json({ ok: true })
  responseJson.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE, path: '/',
  })
  return responseJson
}
