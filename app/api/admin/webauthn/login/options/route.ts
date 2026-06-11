import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { listUsers, ensureRoot } from '@/app/lib/users'
import { getRpConfig, storeChallenge } from '@/app/lib/webauthn'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // El username es opcional. Si se proporciona, filtramos a sus credenciales.
  // Si no, devolvemos allowCredentials vacío (el autenticador buscará él solo,
  // pero el Flipper U2F necesita la lista — así que el username es recomendado).
  const body = await req.json().catch(() => ({})) as { username?: string }
  const { rpID } = getRpConfig()

  let allowCredentials: { id: string; transports?: string[] }[] = []

  if (body.username) {
    const allUsers = await listUsers()
    const root = await ensureRoot()
    const target = [root, ...allUsers].find(u => u.username === body.username.trim().toLowerCase())
    if (target?.webauthnCredentials?.length) {
      allowCredentials = target.webauthnCredentials.map(c => ({
        id: c.id,
        transports: c.transports,
      }))
    }
  }

  const opts = await generateAuthenticationOptions({
    rpID,
    userVerification: 'discouraged',
    allowCredentials,
  })

  // Guardamos challenge + username como meta para recuperar el usuario en verify
  const token = await storeChallenge(opts.challenge, body.username ?? '')

  return NextResponse.json({ ...opts, _token: token })
}