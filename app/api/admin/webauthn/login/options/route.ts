import { NextRequest, NextResponse } from 'next/server'
import { getUserByUsername, ensureRoot } from '@/app/lib/users'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { storeChallenge } from '@/app/lib/webauthn'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json() as { username?: string }
  const username = body.username?.trim().toLowerCase()
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 })
  }

  const user = username === 'root' ? await ensureRoot() : await getUserByUsername(username)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const credentials = user.webauthnCredentials ?? []
  if (credentials.length === 0) {
    return NextResponse.json({ error: 'No hardware keys registered for this user' }, { status: 400 })
  }

  const options = await generateAuthenticationOptions({
    rpID: process.env.WEBAUTHN_RPID ?? 'localhost',
    allowCredentials: credentials.map(cred => ({
      id: cred.id,
      transports: cred.transports as AuthenticatorTransportFuture[] | undefined,
    })),
    userVerification: 'discouraged',
  })

  const token = await storeChallenge(options.challenge, user.id)

  return NextResponse.json({ ...options, _token: token })
}
