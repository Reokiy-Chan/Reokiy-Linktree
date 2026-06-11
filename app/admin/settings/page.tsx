'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { SiteSettings } from '@/app/lib/settings'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

function Toggle({ on, onChange, color = '#4ade80', disabled }: {
  on: boolean; onChange: (v: boolean) => void; color?: string; disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', flexShrink: 0,
        cursor: disabled ? 'wait' : 'pointer', position: 'relative',
        background: on ? `${color}b0` : 'rgba(255,255,255,0.1)',
        transition: 'background 0.25s', opacity: disabled ? 0.5 : 1,
        boxShadow: on ? `0 0 14px ${color}55` : 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }} />
    </button>
  )
}

interface RowDef {
  key: keyof Pick<SiteSettings, 'maintenanceMode' | 'attackMode' | 'redeemEnabled' | 'rafflesEnabled' | 'trackingEnabled'>
  icon: string
  title: string
  desc: string
  color: string
  danger?: boolean
}

const ROWS: RowDef[] = [
  { key: 'maintenanceMode', icon: '🔧', title: 'Maintenance mode', desc: 'Redirects the whole site to a maintenance page. Admin stays accessible.', color: '#fbbf24', danger: true },
  { key: 'attackMode', icon: '🛡', title: 'Attack mode', desc: 'Strict per-IP rate limiting on all public endpoints (tracking, redeem, giveaways).', color: '#f87171', danger: true },
  { key: 'redeemEnabled', icon: '🎁', title: 'Redeem system', desc: 'Allow visitors to redeem codes at /redeem.', color: '#4ade80' },
  { key: 'rafflesEnabled', icon: '🎲', title: 'Public giveaways', desc: 'Allow visitors to join giveaways at /raffles.', color: '#4ade80' },
  { key: 'trackingEnabled', icon: '📡', title: 'Visit tracking', desc: 'Collect analytics from visitors. Turning this off pauses the live map too.', color: '#4ade80' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [msgSaved, setMsgSaved] = useState(false)
  const [toast, setToast] = useState('')
  const [credentials, setCredentials] = useState<{
    id: string; name: string; createdAt: string; transports?: string[]
  }[]>([])
  const [registerState, setRegisterState] = useState<'idle' | 'registering' | 'done' | 'error'>('idle')
  const [registerError, setRegisterError] = useState('')
  const [newKeyName, setNewKeyName] = useState('Flipper Zero')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => { if (r.status === 401) { router.replace('/admin/login'); return null } return r.json() })
      .then(d => { if (d?.settings) { setSettings(d.settings); setMessage(d.settings.maintenanceMessage ?? '') } })
      .catch(() => {})

    fetch('/api/admin/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user?.webauthnCredentials) setCredentials(d.user.webauthnCredentials)
      })
      .catch(() => {})
  }, [router])

  const patch = useCallback(async (p: Partial<SiteSettings>, label: string) => {
    setSaving(label)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
      })
      const data = await res.json()
      if (res.ok) {
        setSettings(data.settings)
        setToast('✓ saved')
        setTimeout(() => setToast(''), 1800)
      }
    } catch {}
    setSaving(null)
  }, [])

  const registerKey = async () => {
    setRegisterState('registering')
    setRegisterError('')
    try {
      const { startRegistration } = await import('@simplewebauthn/browser')

      const optRes = await fetch('/api/admin/webauthn/register/options', { method: 'POST' })
      if (!optRes.ok) throw new Error('No se pudieron obtener opciones de registro')
      const { _token, ...options } = await optRes.json()

      const attestation = await startRegistration({ optionsJSON: options })

      const verRes = await fetch('/api/admin/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...attestation, _token, name: newKeyName }),
      })
      const data = await verRes.json()
      if (!verRes.ok) throw new Error(data.error ?? 'Registro fallido')

      setRegisterState('done')
      // Recargar lista
      const meRes = await fetch('/api/admin/me')
      const me = await meRes.json()
      if (me?.user?.webauthnCredentials) setCredentials(me.user.webauthnCredentials)
      setTimeout(() => setRegisterState('idle'), 2000)
    } catch (e: unknown) {
      setRegisterError((e as Error).message)
      setRegisterState('error')
    }
  }

  const deleteKey = async (id: string) => {
    await fetch(`/api/admin/webauthn/credentials/${encodeURIComponent(id)}`, { method: 'DELETE' })
    setCredentials(prev => prev.filter(c => c.id !== id))
  }

  if (!settings) {
    return <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.3)', textAlign: 'center', paddingTop: 60, letterSpacing: '0.1em' }}>loading…</div>
  }

  const anyDangerOn = settings.maintenanceMode || settings.attackMode

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', margin: 0 }}>settings</h1>
          <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            site control panel
          </div>
        </div>
        {toast && (
          <span style={{ ...S, fontSize: 10, color: '#4ade80', letterSpacing: '0.08em', animation: 'fadeInUp 0.25s ease' }}>{toast}</span>
        )}
      </div>

      {anyDangerOn && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 10, padding: '10px 16px', animation: 'fadeInUp 0.3s ease',
        }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          <span style={{ ...S, fontSize: 10, color: '#fbbf24', letterSpacing: '0.04em' }}>
            {settings.maintenanceMode && settings.attackMode ? 'Maintenance mode and attack mode are active.'
              : settings.maintenanceMode ? 'Maintenance mode is active — visitors see the maintenance page.'
              : 'Attack mode is active — public endpoints are rate-limited.'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ROWS.map(row => {
          const on = settings[row.key]
          const highlighted = row.danger && on
          return (
            <div key={row.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
              background: highlighted ? `${row.color}0d` : 'rgba(255,255,255,0.025)',
              border: `1px solid ${highlighted ? `${row.color}50` : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 12, padding: '14px 18px', transition: 'all 0.25s',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...S, fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{row.icon}</span> {row.title}
                  {highlighted && (
                    <span style={{
                      ...S, fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 20, background: `${row.color}1a`,
                      border: `1px solid ${row.color}50`, color: row.color,
                      animation: 'pulse-dot 2s ease-in-out infinite',
                    }}>active</span>
                  )}
                </div>
                <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.32)', marginTop: 4, lineHeight: 1.5 }}>{row.desc}</div>
              </div>
              <Toggle
                on={on}
                color={row.color}
                disabled={saving === row.key}
                onChange={v => patch({ [row.key]: v }, row.key)}
              />
            </div>
          )
        })}
      </div>

      {/* Maintenance message */}
      <div style={{
        marginTop: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, padding: '14px 18px',
        opacity: settings.maintenanceMode ? 1 : 0.55, transition: 'opacity 0.25s',
      }}>
        <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          maintenance message
        </div>
        <textarea
          value={message}
          onChange={e => { setMessage(e.target.value); setMsgSaved(false) }}
          rows={2}
          maxLength={280}
          placeholder="be right back ✦ (default message if empty)"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)',
            borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 11,
            outline: 'none', resize: 'vertical', lineHeight: 1.6,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={() => { patch({ maintenanceMessage: message }, 'message'); setMsgSaved(true) }}
            disabled={saving === 'message'}
            style={{
              ...S, padding: '7px 16px', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: msgSaved ? 'rgba(74,222,128,0.12)' : 'rgba(196,20,40,0.15)',
              border: `1px solid ${msgSaved ? 'rgba(74,222,128,0.35)' : 'rgba(196,20,40,0.35)'}`,
              borderRadius: 7, color: msgSaved ? '#4ade80' : 'var(--text)', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {saving === 'message' ? 'saving…' : msgSaved ? '✓ saved' : 'save message'}
          </button>
        </div>
      </div>

      {/* ─── Llaves de seguridad U2F ───────────────────────────────────── */}
      <div style={{
        border: '1px solid var(--glass-border)', borderRadius: 14,
        background: 'rgba(255,255,255,0.02)', overflow: 'hidden', marginTop: 16,
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 17, color: 'var(--text)' }}>
            Llaves de seguridad U2F
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, letterSpacing: '0.06em' }}>
            Dispositivos registrados para iniciar sesión sin contraseña
          </div>
        </div>

        {credentials.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: 10, color: 'rgba(254,240,244,0.3)' }}>
            No hay llaves registradas
          </div>
        )}

        {credentials.map(cred => (
          <div key={cred.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
            borderBottom: '1px solid var(--glass-border)',
          }}>
            <span style={{ fontSize: 18, color: 'rgba(255,130,60,0.7)' }}>🔑</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text)' }}>{cred.name}</div>
              <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.06em' }}>
                Registrada {new Date(cred.createdAt).toLocaleDateString('es-ES')}
                {cred.transports?.length ? ` · ${cred.transports.join(', ')}` : ''}
              </div>
            </div>
            <button
              onClick={() => deleteKey(cred.id)}
              style={{
                background: 'none', border: '1px solid rgba(196,20,40,0.25)', borderRadius: 6,
                padding: '5px 10px', color: 'rgba(196,20,40,0.7)', fontSize: 9,
                fontFamily: 'var(--font-body)', cursor: 'pointer', letterSpacing: '0.08em',
              }}
            >
              eliminar
            </button>
          </div>
        ))}

        {/* Añadir nueva llave */}
        <div style={{ padding: '14px 20px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Nombre del dispositivo"
            style={{
              flex: 1, minWidth: 160, padding: '8px 12px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
              borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 11, outline: 'none',
            }}
          />
          <button
            onClick={registerKey}
            disabled={registerState === 'registering' || !newKeyName.trim()}
            style={{
              padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: 8,
              color: '#fff', fontFamily: 'var(--font-body)', fontSize: 10, cursor: 'pointer',
              letterSpacing: '0.08em', opacity: registerState === 'registering' ? 0.6 : 1,
            }}
          >
            {registerState === 'registering' ? 'esperando Flipper…' : registerState === 'done' ? '✓ registrada' : '+ registrar llave'}
          </button>
        </div>
        {registerError && (
          <div style={{ padding: '0 20px 12px', fontSize: 10, color: '#f87171' }}>{registerError}</div>
        )}
      </div>

      <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.18)', marginTop: 18, letterSpacing: '0.08em', textAlign: 'center' }}>
        last updated: {settings.updatedAt && new Date(settings.updatedAt).getTime() > 0
          ? new Date(settings.updatedAt).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          : 'never'}
      </div>

      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}