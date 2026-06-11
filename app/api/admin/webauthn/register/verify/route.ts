import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'
import { getSession } from '@/app/lib/auth'
import { addWebAuthnCredential } from '@/app/lib/users'
import { getRpConfig, consumeChallenge } from '@/app/lib/webauthn'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as RegistrationResponseJSON & { _token: string; name?: string }
  const { _token, name, ...response } = body

  const stored = await consumeChallenge(_token)
  if (!stored || stored.meta !== session.uid) {
    return NextResponse.json({ error: 'Challenge inválido o expirado' }, { status: 400 })
  }

  const { rpID, origin } = getRpConfig()

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    })
  } catch (e) {
    return NextResponse.json({ error: `Verificación fallida: ${(e as Error).message}` }, { status: 400 })
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 })
  }

  const { credential } = verification.registrationInfo

  await addWebAuthnCredential(session.uid, {
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64url'),
    counter: credential.counter,
    transports: response.response.transports,
    name: (name?.trim() || 'Llave de seguridad').slice(0, 64),
    createdAt: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}