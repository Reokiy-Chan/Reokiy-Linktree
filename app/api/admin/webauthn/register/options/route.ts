import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { getSession } from '@/app/lib/auth'
import { ensureRoot, getUser } from '@/app/lib/users'
import { getRpConfig, storeChallenge } from '@/app/lib/webauthn'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.uid === 'root' ? await ensureRoot() : await getUser(session.uid)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { rpID } = getRpConfig()

  const opts = await generateRegistrationOptions({
    rpName: 'reokiy admin',
    rpID,
    userName: user.username,
    userID: Buffer.from(user.id),
    attestationType: 'none',
    // Excluir credenciales ya registradas para evitar duplicados
    excludeCredentials: (user.webauthnCredentials ?? []).map(c => ({
      id: c.id,
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
    authenticatorSelection: {
      // cross-platform = roaming (Flipper, YubiKey) — no platform (Touch ID, Windows Hello)
      authenticatorAttachment: 'cross-platform',
      // discouraged = no PIN ni biometría, solo presencia física (U2F)
      userVerification: 'discouraged',
      // discouraged = no clave residente (compatibilidad máxima con U2F clásico)
      residentKey: 'discouraged',
    },
  })

  // Guardamos el challenge asociado al uid del usuario
  const token = await storeChallenge(opts.challenge, session.uid)

  return NextResponse.json({ ...opts, _token: token })
}