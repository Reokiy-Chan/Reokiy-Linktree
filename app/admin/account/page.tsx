// app/admin/account/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }
const FIELD: React.CSSProperties = {
  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)',
  borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 12, outline: 'none',
}

interface Me {
  id: string; username: string; name: string; avatar?: string
  pronouns?: string; bio?: string; bannerUrl?: string
  authMethod: 'password' | 'webauthn'
  webauthnCredentials?: { id: string; name: string; createdAt: string }[]
  isRoot?: boolean
}

export default function AccountPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const [pronouns, setPronouns] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => { if (r.status === 401) { router.replace('/admin/login'); return null } return r.json() })
      .then(d => { if (d?.user) { setMe(d.user); setName(d.user.name); setPronouns(d.user.pronouns ?? ''); setBio(d.user.bio ?? '') } })
  }, [router])

  const uploadFile = async (file: File, field: 'avatar' | 'bannerUrl', setLoading: (v: boolean) => void) => {
    setLoading(true)
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const d = await r.json()
    if (r.ok && d.url) {
      await fetch('/api/admin/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: d.url }) })
      setMe(prev => prev ? { ...prev, [field]: d.url } : prev)
    }
    setLoading(false)
  }

  const saveProfile = async () => {
    setSaving(true); setMsg('')
    const r = await fetch('/api/admin/me', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), pronouns: pronouns.trim(), bio: bio.trim() })
    })
    if (r.ok) { setMsg('✓ saved'); setMe(prev => prev ? { ...prev, name: name.trim() } : prev) }
    else { const d = await r.json(); setMsg(d.error ?? 'error') }
    setSaving(false)
    setTimeout(() => setMsg(''), 2000)
  }

  const removeWebauthn = async (credId: string) => {
    await fetch(`/api/admin/webauthn/credentials/${credId}`, { method: 'DELETE' })
    setMe(prev => prev ? { ...prev, webauthnCredentials: prev.webauthnCredentials?.filter(c => c.id !== credId) } : prev)
  }

  if (!me) return <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', paddingTop: 60, textAlign: 'center' }}>loading…</div>

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', margin: 0 }}>account</h1>
        <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>your account · @{me.username}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="acc-grid">

        {/* Perfil */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(196,20,40,0.15)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ ...S, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)', marginBottom: 14 }}>profile photo</div>

          {/* Banner */}
          <div
            onClick={() => bannerRef.current?.click()}
            style={{
              height: 68, borderRadius: 8, marginBottom: 14, cursor: 'pointer',
              background: me.bannerUrl ? `url(${me.bannerUrl}) center/cover` : 'linear-gradient(135deg,rgba(196,20,40,0.18),rgba(90,0,16,0.22))',
              border: '1px dashed rgba(196,20,40,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}
          >
            {!me.bannerUrl && (
              <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em' }}>
                {uploadingBanner ? 'uploading…' : '+ upload banner'}
              </span>
            )}
            {me.bannerUrl && uploadingBanner && (
              <div style={{ background: 'rgba(5,0,7,0.65)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.6)' }}>uploading…</span>
              </div>
            )}
          </div>
          <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'bannerUrl', setUploadingBanner) }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <button type="button"
              onClick={() => fileRef.current?.click()}
              style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(196,20,40,0.3)', background: me.avatar ? `center/cover url(${me.avatar})` : 'rgba(196,20,40,0.18)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fee0f4', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              {!me.avatar && (uploading ? '…' : (me.name || me.username).slice(0, 2).toUpperCase())}
            </button>
            <div>
              <div style={{ ...S, fontSize: 12, color: 'var(--text)' }}>{me.name}{me.isRoot ? ' 👑' : ''}</div>
              <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.35)', marginTop: 2 }}>@{me.username}</div>
              <button type="button" onClick={() => fileRef.current?.click()} style={{ ...S, marginTop: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'rgba(254,240,244,0.5)', fontSize: 11, cursor: 'pointer' }}>{uploading ? 'uploading…' : 'change photo'}</button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'avatar', setUploading) }} />

          <div style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>display name</div>
          <input value={name} onChange={e => setName(e.target.value)} style={{ ...FIELD, marginBottom: 8 }} />
          <input value={pronouns} onChange={e => setPronouns(e.target.value)} maxLength={40} placeholder="she/her, they/them…" style={{ ...FIELD, marginBottom: 8 }} />
          <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={280} rows={3} placeholder="a short description…" style={{ ...FIELD, resize: 'vertical' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            {msg && <span style={{ ...S, fontSize: 12, color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{msg}</span>}
            <button type="button" onClick={saveProfile} disabled={saving} style={{ ...S, padding: '8px 18px', background: 'rgba(196,20,40,0.2)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 7, color: 'var(--text)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', marginLeft: 'auto' }}>
              {saving ? 'saving…' : 'save'}
            </button>
          </div>
        </div>

        {/* Métodos de autenticación */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(196,20,40,0.15)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ ...S, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)', marginBottom: 16 }}>login methods</div>

          {/* Contraseña */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 9, border: '1px solid rgba(196,20,40,0.25)', background: 'rgba(196,20,40,0.07)', marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(196,20,40,0.15)', border: '1px solid rgba(196,20,40,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🔒</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...S, fontSize: 12, color: 'var(--text)' }}>password</div>
              <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.35)', marginTop: 2 }}>active method</div>
            </div>
            <ChangePasswordButton />
          </div>

          {/* U2F / WebAuthn */}
          <div style={{ padding: '11px 13px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: (me.webauthnCredentials?.length ?? 0) > 0 ? 10 : 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🔑</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...S, fontSize: 12, color: 'var(--text)' }}>U2F / hardware key</div>
                <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.35)', marginTop: 2 }}>
                  {(me.webauthnCredentials?.length ?? 0) > 0 ? `${me.webauthnCredentials!.length} registered key(s)` : 'not configured'}
                </div>
              </div>
              <RegisterWebAuthnButton onRegistered={cred => setMe(prev => prev ? { ...prev, webauthnCredentials: [...(prev.webauthnCredentials ?? []), cred] } : prev)} />
            </div>
            {(me.webauthnCredentials?.length ?? 0) > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {me.webauthnCredentials!.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                    <span style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.5)' }}>{c.name}</span>
                    <button type="button" onClick={() => removeWebauthn(c.id)} style={{ ...S, background: 'none', border: 'none', color: 'rgba(254,240,244,0.3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.25)', lineHeight: 1.5 }}>
            only password and U2F (WebAuthn / FIDO2) are available. Legacy text keys have been removed.
          </div>
        </div>
      </div>

      <style>{`@media(max-width:700px){.acc-grid{grid-template-columns:1fr!important}}`}</style>
    </>
  )
}

const CPB_FIELD: React.CSSProperties = { width: '100%', padding: '8px 11px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)', borderRadius: 7, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 12, outline: 'none' }

function ChangePasswordButton() {
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [conf, setConf] = useState('')
  const [err, setErr] = useState(''); const [ok, setOk] = useState(false); const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (next.length < 6) { setErr('minimum 6 characters'); return }
    if (next !== conf) { setErr('passwords do not match'); return }
    setSaving(true); setErr('')
    const r = await fetch('/api/admin/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changePassword: { current: cur, next } }) })
    const d = await r.json()
    if (r.ok) { setOk(true); setTimeout(() => { setOpen(false); setOk(false); setCur(''); setNext(''); setConf('') }, 1200) }
    else { setErr(d.error ?? 'error') }
    setSaving(false)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ ...S, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'rgba(254,240,244,0.5)', fontSize: 12, cursor: 'pointer' }}>change</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,0,7,0.85)', backdropFilter: 'blur(8px)', padding: 16 }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ width: '100%', maxWidth: 340, background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)', borderRadius: 14, padding: 22 }}>
            <div style={{ ...S, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)', marginBottom: 16 }}>change password</div>
            {ok ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#4ade80', fontSize: 20 }}>✓</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="password" aria-label="current password" placeholder="current password" value={cur} onChange={e => setCur(e.target.value)} style={CPB_FIELD} />
                <input type="password" aria-label="new password" placeholder="new password" value={next} onChange={e => setNext(e.target.value)} style={CPB_FIELD} />
                <input type="password" aria-label="confirm new" placeholder="confirm new" value={conf} onChange={e => setConf(e.target.value)} style={CPB_FIELD} />
                {err && <div style={{ ...S, fontSize: 12, color: '#f87171' }}>{err}</div>}
                <button type="button" onClick={submit} disabled={saving} style={{ ...S, padding: '9px 0', background: 'rgba(196,20,40,0.2)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 7, color: 'var(--text)', fontSize: 12, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{saving ? 'saving…' : 'save'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function RegisterWebAuthnButton({ onRegistered }: { onRegistered: (c: { id: string; name: string; createdAt: string }) => void }) {
  const [registering, setRegistering] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')

  const register = async () => {
    if (!keyName.trim()) { setErr('enter a name for the key'); return }
    setRegistering(true); setErr('')
    try {
      const { startRegistration } = await import('@simplewebauthn/browser')
      const optRes = await fetch('/api/admin/webauthn/register/options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: keyName.trim() }) })
      const { _token, ...optsJSON } = await optRes.json()
      const attResp = await startRegistration({ optionsJSON: optsJSON })
      const verRes = await fetch('/api/admin/webauthn/register/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: attResp, name: keyName.trim(), _token }) })
      const data = await verRes.json()
      if (verRes.ok) { onRegistered(data.credential); setOpen(false); setKeyName('') }
      else { setErr(data.error ?? 'error') }
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'registration error') }
    setRegistering(false)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ ...S, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'rgba(254,240,244,0.5)', fontSize: 12, cursor: 'pointer' }}>+ add</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,0,7,0.85)', backdropFilter: 'blur(8px)', padding: 16 }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ width: '100%', maxWidth: 320, background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)', borderRadius: 14, padding: 22 }}>
            <div style={{ ...S, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)', marginBottom: 14 }}>register U2F key</div>
            <input value={keyName} onChange={e => setKeyName(e.target.value)} aria-label="name (e.g. Flipper Zero)" placeholder="name (e.g. Flipper Zero)" style={{ width: '100%', padding: '8px 11px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)', borderRadius: 7, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 12, outline: 'none', marginBottom: 10 }} />
            {err && <div style={{ ...S, fontSize: 12, color: '#f87171', marginBottom: 8 }}>{err}</div>}
            <button type="button" onClick={register} disabled={registering} style={{ ...S, width: '100%', padding: '9px 0', background: 'rgba(196,20,40,0.2)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 7, color: 'var(--text)', fontSize: 12, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {registering ? '⏳ touch the key…' : '🔑 register'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
