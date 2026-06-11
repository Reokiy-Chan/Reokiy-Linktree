'use client'

import { useState, useEffect } from 'react'

type Mode = 'password' | 'key' | 'webauthn'

const FIELD: React.CSSProperties = {
  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
  borderRadius: 10, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13,
  outline: 'none', letterSpacing: '0.05em', transition: 'border-color 0.2s',
}

// ─── First-login setup modal ────────────────────────────────────────────────

function SetupModal({ name, onDone }: { name: string; onDone: () => void }) {
  const [step, setStep] = useState<'choose' | 'password' | 'key'>('choose')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [key, setKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const loadKey = async () => {
    setStep('key'); setError('')
    try {
      const r = await fetch('/api/admin/auth/setup')
      const d = await r.json()
      if (d.key) setKey(d.key)
    } catch {}
  }

  const submit = async (body: object) => {
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/admin/auth/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const d = await r.json()
      if (r.ok) {
        setDone(true)
        setTimeout(onDone, 1100)
      } else {
        setError(d.error ?? 'Setup failed'); setSaving(false)
      }
    } catch { setError('Connection error'); setSaving(false) }
  }

  const savePassword = () => {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    submit({ type: 'password', password })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,0,7,0.9)', backdropFilter: 'blur(10px)', animation: 'sm-fade 0.3s ease', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 380, background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)',
        borderRadius: 20, padding: 30, animation: 'sm-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 0 60px rgba(196,20,40,0.15)',
      }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0', animation: 'sm-fade 0.3s ease' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#4ade80',
              animation: 'sm-check 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            }}>✓</div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--text)' }}>all set</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(254,240,244,0.4)', marginTop: 6, letterSpacing: '0.1em' }}>entering the panel…</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{ fontSize: 32, marginBottom: 10, animation: 'sm-float 2.5s ease-in-out infinite' }}>🌙</div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--text)' }}>welcome, {name}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', marginTop: 6 }}>
                {step === 'choose' ? 'choose how you’ll log in' : step === 'password' ? 'set a password' : 'save your security key'}
              </div>
            </div>

            {step === 'choose' && (
              <div style={{ display: 'flex', gap: 10, animation: 'sm-rise 0.3s ease' }}>
                <button onClick={() => { setStep('password'); setError('') }} style={choiceStyle}>
                  <div style={{ fontSize: 24 }}>🔒</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text)', marginTop: 8 }}>set password</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'rgba(254,240,244,0.35)', marginTop: 3 }}>classic login</div>
                </button>
                <button onClick={loadKey} style={choiceStyle}>
                  <div style={{ fontSize: 24 }}>🔑</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text)', marginTop: 8 }}>security key</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'rgba(254,240,244,0.35)', marginTop: 3 }}>passwordless</div>
                </button>
              </div>
            )}

            {step === 'password' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'sm-rise 0.3s ease' }}>
                <input type="password" placeholder="new password" value={password} autoFocus
                  onChange={e => { setPassword(e.target.value); setError('') }} style={FIELD} />
                <input type="password" placeholder="confirm password" value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') savePassword() }} style={FIELD} />
                {error && <div style={errStyle}>{error}</div>}
                <button onClick={savePassword} disabled={saving} style={primaryBtn(saving)}>
                  {saving ? 'saving…' : 'set password →'}
                </button>
                <button onClick={() => { setStep('choose'); setError('') }} style={backBtn}>← back</button>
              </div>
            )}

            {step === 'key' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'sm-rise 0.3s ease' }}>
                <div style={{
                  padding: '16px 14px', borderRadius: 12, textAlign: 'center',
                  background: 'rgba(196,20,40,0.08)', border: '1px dashed rgba(196,20,40,0.4)',
                  fontFamily: 'monospace', fontSize: 17, letterSpacing: '0.18em', color: '#fff',
                  textShadow: '0 0 14px rgba(232,25,92,0.6)', wordBreak: 'break-all',
                }}>{key || '····-····'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { navigator.clipboard.writeText(key).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }} style={{ ...backBtn, flex: 1, color: copied ? '#4ade80' : 'rgba(254,240,244,0.5)', borderColor: copied ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.12)' }}>
                    {copied ? '✓ copied' : '⧉ copy'}
                  </button>
                  <button onClick={loadKey} style={{ ...backBtn, flex: 1 }}>↻ regenerate</button>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'rgba(254,240,244,0.35)', textAlign: 'center', lineHeight: 1.6 }}>
                  ⚠ save this key somewhere safe — you’ll use it instead of a password and it won’t be shown again
                </div>
                {error && <div style={errStyle}>{error}</div>}
                <button onClick={() => submit({ type: 'key', key })} disabled={saving || !key} style={primaryBtn(saving || !key)}>
                  {saving ? 'saving…' : 'I saved it — continue →'}
                </button>
                <button onClick={() => { setStep('choose'); setError('') }} style={backBtn}>← back</button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes sm-fade { from{opacity:0} to{opacity:1} }
        @keyframes sm-pop { from{opacity:0;transform:scale(0.9) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes sm-rise { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sm-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes sm-check { from{transform:scale(0)} to{transform:scale(1)} }
      `}</style>
    </div>
  )
}

const choiceStyle: React.CSSProperties = {
  flex: 1, padding: '18px 8px', borderRadius: 12, cursor: 'pointer',
  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(196,20,40,0.25)',
  transition: 'all 0.2s', textAlign: 'center',
}
const errStyle: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--primary)', textAlign: 'center', letterSpacing: '0.04em' }
const backBtn: React.CSSProperties = {
  padding: '9px 0', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
  color: 'rgba(254,240,244,0.5)', fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s',
}
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '11px 0', background: disabled ? 'rgba(196,20,40,0.08)' : 'rgba(196,20,40,0.2)',
  border: '1px solid rgba(196,20,40,0.4)', borderRadius: 10,
  color: disabled ? 'var(--text-muted)' : 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 12,
  letterSpacing: '0.1em', textTransform: 'uppercase', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
})

// ─── Login page ──────────────────────────────────────────────────────────────

export default function AdminLogin() {
  const [mode, setMode] = useState<Mode>('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [setupName, setSetupName] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [webauthnState, setWebauthnState] = useState<'idle' | 'waiting' | 'verifying' | 'error'>('idle')
  const [webauthnError, setWebauthnError] = useState('')

  useEffect(() => { setError('') }, [mode])

  const loginWithWebAuthn = async () => {
    setWebauthnState('waiting')
    setWebauthnError('')
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser')

      const optRes = await fetch('/api/admin/webauthn/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      })
      if (!optRes.ok) throw new Error('No se pudieron obtener las opciones de autenticación')
      const { _token, ...options } = await optRes.json()

      setWebauthnState('waiting')
      const assertion = await startAuthentication({ optionsJSON: options })

      setWebauthnState('verifying')
      const verRes = await fetch('/api/admin/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...assertion, _token }),
      })
      const data = await verRes.json()
      if (!verRes.ok) throw new Error(data.error ?? 'Verificación fallida')

      window.location.replace('/admin')
    } catch (e: unknown) {
      const msg = (e as Error).message
      if (msg.includes('cancelled') || msg.includes('NotAllowedError')) {
        setWebauthnError('Operación cancelada. Pulsa el botón del Flipper cuando parpadee.')
      } else {
        setWebauthnError(msg)
      }
      setWebauthnState('error')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'password'
            ? { username: username || 'root', password, method: 'password' }
            : { username: username || 'root', securityKey: key, method: 'key' },
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.needsSetup) { setSetupName(data.name ?? username); setLoading(false); return }
        window.location.replace('/admin')
      } else {
        setError(data.error ?? 'Invalid credentials'); setShake(n => n + 1); setLoading(false)
      }
    } catch {
      setError('Connection error'); setLoading(false)
    }
  }

  const TAB_STYLE: React.CSSProperties = {
    flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
    transition: 'all 0.2s',
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div key={shake} style={{
        width: '100%', maxWidth: 340, background: 'var(--glass)', backdropFilter: 'blur(24px)',
        border: '1px solid var(--glass-border)', borderRadius: 24, padding: 36,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
        animation: shake > 0 ? 'lg-shake 0.4s ease' : 'lg-in 0.5s ease',
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/images/logo.png" alt="reokiy" style={{ width: 48, height: 48, borderRadius: '50%', marginBottom: 12, objectFit: 'cover' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>control panel</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>reokiy • admin</div>
        </div>

        {/* Mode switch with three tabs */}
        <div style={{ width: '100%', display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 3 }}>
          <button
            onClick={() => { setMode('password'); setError(''); setWebauthnState('idle'); setWebauthnError('') }}
            style={{
              ...TAB_STYLE,
              background: mode === 'password' ? 'rgba(196,20,40,0.22)' : 'transparent',
              color: mode === 'password' ? 'var(--text)' : 'rgba(254,240,244,0.4)',
            }}
          >
            🔒 password
          </button>
          <button
            onClick={() => { setMode('key'); setError(''); setWebauthnState('idle'); setWebauthnError('') }}
            style={{
              ...TAB_STYLE,
              background: mode === 'key' ? 'rgba(196,20,40,0.22)' : 'transparent',
              color: mode === 'key' ? 'var(--text)' : 'rgba(254,240,244,0.4)',
            }}
          >
            🔑 key
          </button>
          <button
            onClick={() => { setMode('webauthn'); setError(''); setWebauthnState('idle'); setWebauthnError('') }}
            style={{
              ...TAB_STYLE,
              background: mode === 'webauthn' ? 'rgba(196,20,40,0.22)' : 'transparent',
              color: mode === 'webauthn' ? 'var(--text)' : 'rgba(254,240,244,0.4)',
            }}
          >
            llave U2F
          </button>
        </div>

        {mode !== 'webauthn' ? (
          <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="username" value={username} autoComplete="username"
              onChange={e => setUsername(e.target.value)} style={FIELD}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(196,20,40,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')} />

            {mode === 'password' ? (
              <input type="password" placeholder="password" value={password} autoComplete="current-password"
                onChange={e => setPassword(e.target.value)} style={FIELD}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(196,20,40,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')} />
            ) : (
              <input placeholder="A1F3-9KQ2-77XB-…" value={key} autoComplete="off" spellCheck={false}
                onChange={e => setKey(e.target.value.toUpperCase())}
                style={{ ...FIELD, fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.12em' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(196,20,40,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')} />
            )}

            {error && <div style={errStyle}>{error}</div>}

            <button type="submit" disabled={loading || (mode === 'password' ? !password : !key)} style={primaryBtn(loading || (mode === 'password' ? !password : !key))}>
              {loading ? 'signing in…' : 'sign in'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
            <div>
              <label style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                USERNAME
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="root"
                style={FIELD}
                autoComplete="username"
              />
            </div>

            <div style={{
              background: 'rgba(255,90,20,0.06)', border: '1px solid rgba(255,90,20,0.2)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 9, color: 'rgba(255,130,60,0.9)', letterSpacing: '0.12em', marginBottom: 8 }}>
                FLIPPER ZERO — U2F
              </div>
              {[
                'Conecta el Flipper por USB al PC.',
                'En el Flipper: Apps → USB → U2F. Verás "Ready".',
                'Pulsa el botón de abajo para iniciar.',
                'Cuando el Flipper parpadee, pulsa su botón central.',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 8, color: 'rgba(196,20,40,0.7)', width: 14, flexShrink: 0, marginTop: 1 }}>
                    {i + 1}.
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(254,240,244,0.6)', lineHeight: 1.5 }}>{step}</span>
                </div>
              ))}
            </div>

            {webauthnError && (
              <div style={{ fontSize: 10, color: '#f87171', textAlign: 'center' }}>{webauthnError}</div>
            )}

            <button
              onClick={loginWithWebAuthn}
              disabled={webauthnState === 'waiting' || webauthnState === 'verifying' || !username.trim()}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                background: webauthnState === 'waiting' ? 'rgba(196,20,40,0.5)' : 'var(--primary)',
                color: '#fff', fontFamily: 'var(--font-body)', fontSize: 11,
                letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s',
                opacity: (!username.trim()) ? 0.4 : 1,
              }}
            >
              {webauthnState === 'waiting' && '⏳ esperando Flipper…'}
              {webauthnState === 'verifying' && '✓ verificando…'}
              {(webauthnState === 'idle' || webauthnState === 'error') && 'iniciar sesión con U2F'}
            </button>
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'rgba(254,240,244,0.2)', letterSpacing: '0.08em', textAlign: 'center' }}>
          owner logs in as <span style={{ color: 'rgba(254,240,244,0.4)' }}>root</span>
        </div>
      </div>

      {setupName && <SetupModal name={setupName} onDone={() => window.location.replace('/admin')} />}

      <style>{`
        @keyframes lg-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lg-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(3px)} }
      `}</style>
    </main>
  )
}