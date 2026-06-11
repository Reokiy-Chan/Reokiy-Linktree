import { NextRequest, NextResponse } from 'next/server'
import { getSession, createSessionToken } from '@/app/lib/auth'
import { getUser, updateUser } from '@/app/lib/users'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'

export const runtime = 'nodejs'

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { _token, id, rawId, response, authenticatorAttachment, clientExtensionResults, type } = body

  // Recuperar challenge guardado
  const challengeCookie = req.cookies.get('webauthn_challenge')?.value
  if (!challengeCookie) {
    return NextResponse.json({ error: 'No challenge found' }, { status: 400 })
  }
  let challengeData: { challenge: string; userId: string }
  try {
    challengeData = JSON.parse(Buffer.from(challengeCookie, 'base64url').toString())
  } catch {
    return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 })
  }

  if (challengeData.userId !== session.uid) {
    return NextResponse.json({ error: 'User mismatch' }, { status: 400 })
  }

  const user = await getUser(session.uid)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const credential = user.webauthnCredentials?.find(c => c.id === id)
  if (!credential) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 400 })
  }

  const verification = await verifyAuthenticationResponse({
    response: {
      id,
      rawId,
      response,
      authenticatorAttachment,
      clientExtensionResults,
      type,
    },
    expectedChallenge: challengeData.challenge,
    expectedOrigin: process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000',
    expectedRPID: process.env.WEBAUTHN_RPID ?? 'localhost',
    authenticator: {
      credentialID: Buffer.from(credential.id, 'base64url'),
      credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
      counter: credential.counter ?? 0,
      transports: credential.transports as AuthenticatorTransportFuture[] | undefined,
    },
  })

  if (!verification.verified) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
  }

  // Actualizar contador
  if (user.webauthnCredentials) {
    const updatedCreds = user.webauthnCredentials.map(c =>
      c.id === id ? { ...c, counter: verification.authenticationInfo.newCounter } : c
    )
    await updateUser(session.uid, { webauthnCredentials: updatedCreds })
  }

  // Crear sesión admin
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
  responseJson.cookies.delete('webauthn_challenge')
  return responseJson
}