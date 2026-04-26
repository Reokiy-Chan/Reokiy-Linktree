'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        setError('Contraseña incorrecta')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'var(--glass)', backdropFilter: 'blur(24px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 24, padding: 36,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/images/logo.png" alt="reokiy" style={{ width: 48, height: 48, borderRadius: '50%', marginBottom: 12, objectFit: 'cover' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
            panel de control
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            reokiy • admin
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              width: '100%', padding: '11px 14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--glass-border)',
              borderRadius: 10, color: 'var(--text)',
              fontFamily: 'var(--font-body)', fontSize: 13,
              outline: 'none', letterSpacing: '0.05em',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(196,20,40,0.5)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
          />

          {error && (
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 11,
              color: 'var(--primary)', textAlign: 'center',
              letterSpacing: '0.05em',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              padding: '11px 0',
              background: loading ? 'rgba(196,20,40,0.1)' : 'rgba(196,20,40,0.18)',
              border: '1px solid rgba(196,20,40,0.4)',
              borderRadius: 10, color: loading ? 'var(--text-muted)' : 'var(--text)',
              fontFamily: 'var(--font-body)', fontSize: 12,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'entrando…' : 'entrar'}
          </button>
        </form>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'rgba(254,240,244,0.2)', letterSpacing: '0.08em', textAlign: 'center' }}>
          configura ADMIN_PASSWORD en .env
        </div>
      </div>
    </main>
  )
}