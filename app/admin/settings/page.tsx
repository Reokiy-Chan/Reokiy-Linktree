'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { SiteSettings } from '@/app/lib/settings'
import type { EnvVar } from '@/app/api/admin/env-check/route'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

function Toggle({ on, onChange, color = '#4ade80', disabled }: {
  on: boolean; onChange: (v: boolean) => void; color?: string; disabled?: boolean
}) {
  return (
    <button type="button"
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
        borderRadius: '50%', background: '#fff', transition: 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
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
  { key: 'attackMode', icon: '🛡', title: 'Attack mode', desc: 'Strict per-IP rate limiting + Cloudflare Turnstile CAPTCHA on all public endpoints.', color: '#f87171', danger: true },
  { key: 'redeemEnabled', icon: '🎁', title: 'Redeem system', desc: 'Allow visitors to redeem codes at /redeem.', color: '#4ade80' },
  { key: 'rafflesEnabled', icon: '🎲', title: 'Public giveaways', desc: 'Allow visitors to join giveaways at /raffles.', color: '#4ade80' },
  { key: 'trackingEnabled', icon: '📡', title: 'Visit tracking', desc: 'Collect analytics from visitors. Turning this off pauses the live map too.', color: '#4ade80' },
]

const SEV_STYLE = {
  critical: { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', dot: '#f87171', badge: 'rgba(248,113,113,0.15)', badgeBorder: 'rgba(248,113,113,0.3)', badgeColor: '#f87171' },
  warning:  { bg: 'rgba(251,191,36,0.06)',  border: 'rgba(251,191,36,0.22)',  dot: '#fbbf24', badge: 'rgba(251,191,36,0.12)',  badgeBorder: 'rgba(251,191,36,0.28)',  badgeColor: '#fbbf24' },
  info:     { bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.15)', dot: '#94a3b8', badge: 'rgba(148,163,184,0.08)', badgeBorder: 'rgba(148,163,184,0.2)',  badgeColor: '#94a3b8' },
}

function EnvWarnings({ vars }: { vars: EnvVar[] }) {
  const missing = vars.filter(v => !v.set)
  const [open, setOpen] = useState(true)

  if (missing.length === 0) return null

  const hasCritical = missing.some(v => v.severity === 'critical')
  const topSev = hasCritical ? 'critical' : missing.some(v => v.severity === 'warning') ? 'warning' : 'info'
  const sty = SEV_STYLE[topSev]

  return (
    <div style={{
      marginBottom: 20, background: sty.bg,
      border: `1px solid ${sty.border}`, borderRadius: 10,
      overflow: 'hidden', animation: 'fadeInUp 0.3s ease',
    }}>
      {/* Header */}
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          <span style={{ ...S, fontSize: 12, color: sty.dot, letterSpacing: '0.04em', fontWeight: 500 }}>
            {missing.length} missing environment variable{missing.length !== 1 ? 's' : ''}
          </span>
          {missing.filter(v => v.severity === 'critical').length > 0 && (
            <span style={{ ...S, fontSize: 10, padding: '1px 7px', borderRadius: 20, background: SEV_STYLE.critical.badge, border: `1px solid ${SEV_STYLE.critical.badgeBorder}`, color: SEV_STYLE.critical.badgeColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {missing.filter(v => v.severity === 'critical').length} critical
            </span>
          )}
        </div>
        <span style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* List */}
      {open && (
        <div style={{ borderTop: `1px solid ${sty.border}`, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {missing.map((v, i) => {
            const st = SEV_STYLE[v.severity]
            return (
              <div key={v.key} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
                borderBottom: i < missing.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <code style={{ ...S, fontSize: 11, color: 'var(--text)', background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 4 }}>
                      {v.key}
                    </code>
                    <span style={{ ...S, fontSize: 10, padding: '1px 7px', borderRadius: 20, background: st.badge, border: `1px solid ${st.badgeBorder}`, color: st.badgeColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {v.severity}
                    </span>
                  </div>
                  <div style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.45)', lineHeight: 1.5 }}>{v.effect}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [msgSaved, setMsgSaved] = useState(false)
  const [toast, setToast] = useState('')
  const [toastErr, setToastErr] = useState(false)
  const [envChecking, setEnvChecking] = useState(false)
  const [envLastCheck, setEnvLastCheck] = useState<'ok' | 'warn' | null>(null)

  const checkEnvVars = async () => {
    setEnvChecking(true)
    try {
      const d = await fetch('/api/admin/env-check').then(r => r.ok ? r.json() : null)
      if (d?.vars) {
        setEnvVars(d.vars)
        setEnvLastCheck(d.vars.some((v: { set: boolean }) => !v.set) ? 'warn' : 'ok')
      }
    } catch {}
    setEnvChecking(false)
  }

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => { if (r.status === 401) { router.replace('/admin/login'); return null } return r.json() })
      .then(d => { if (d?.settings) { setSettings(d.settings); setMessage(d.settings.maintenanceMessage ?? '') } })
      .catch(() => {})
    checkEnvVars()
  }, [router])

  const showToast = (msg: string, err = false) => {
    setToast(msg); setToastErr(err)
    setTimeout(() => setToast(''), 2200)
  }

  const patch = useCallback(async (p: Partial<SiteSettings>, label: string) => {
    setSaving(label)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
      })
      const data = await res.json()
      if (res.ok) {
        setSettings(data.settings)
        showToast('✓ saved')
      } else {
        showToast(data.error ?? 'Failed to save', true)
      }
    } catch {
      showToast('Network error', true)
    }
    setSaving(null)
  }, [])

  if (!settings) {
    return <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', textAlign: 'center', paddingTop: 60, letterSpacing: '0.1em' }}>loading…</div>
  }

  const anyDangerOn = settings.maintenanceMode || settings.attackMode

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', margin: 0 }}>settings</h1>
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            site control panel
          </div>
        </div>
        {toast && (
          <span style={{ ...S, fontSize: 12, color: toastErr ? '#f87171' : '#4ade80', letterSpacing: '0.08em', animation: 'fadeInUp 0.25s ease' }}>{toast}</span>
        )}
      </div>

      {/* Env var health check */}
      <div style={{ marginBottom: 20 }}>
        {envVars.length > 0 && <EnvWarnings vars={envVars} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={checkEnvVars} disabled={envChecking}
            style={{ ...S, padding: '5px 12px', fontSize: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${envLastCheck === 'ok' ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 7, color: envLastCheck === 'ok' ? '#4ade80' : 'rgba(254,240,244,0.35)', cursor: envChecking ? 'wait' : 'pointer', letterSpacing: '0.06em', opacity: envChecking ? 0.6 : 1, transition: 'color 0.2s, border-color 0.2s' }}>
            {envChecking ? 'checking…' : envLastCheck === 'ok' ? '✓ all vars set' : '↻ check env vars'}
          </button>
        </div>
      </div>

      {anyDangerOn && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 10, padding: '10px 16px', animation: 'fadeInUp 0.3s ease',
        }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          <span style={{ ...S, fontSize: 12, color: '#fbbf24', letterSpacing: '0.04em' }}>
            {settings.maintenanceMode && settings.attackMode ? 'Maintenance mode and attack mode are active.'
              : settings.maintenanceMode ? 'Maintenance mode is active — visitors see the maintenance page.'
              : 'Attack mode is active — public endpoints are rate-limited and CAPTCHA-gated.'}
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
              borderRadius: 12, padding: '14px 18px', transition: 'background 0.25s, color 0.25s, border-color 0.25s, opacity 0.25s, transform 0.25s',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...S, fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{row.icon}</span> {row.title}
                  {highlighted && (
                    <span style={{
                      ...S, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 20, background: `${row.color}1a`,
                      border: `1px solid ${row.color}50`, color: row.color,
                      animation: 'pulse-dot 2s ease-in-out infinite',
                    }}>active</span>
                  )}
                </div>
                <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.35)', marginTop: 4, lineHeight: 1.5 }}>{row.desc}</div>
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
        <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
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
            borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 12,
            outline: 'none', resize: 'vertical', lineHeight: 1.6,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button"
            onClick={() => { patch({ maintenanceMessage: message }, 'message'); setMsgSaved(true) }}
            disabled={saving === 'message'}
            style={{
              ...S, padding: '7px 16px', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: msgSaved ? 'rgba(74,222,128,0.12)' : 'rgba(196,20,40,0.15)',
              border: `1px solid ${msgSaved ? 'rgba(74,222,128,0.35)' : 'rgba(196,20,40,0.35)'}`,
              borderRadius: 7, color: msgSaved ? '#4ade80' : 'var(--text)', cursor: 'pointer', transition: 'background 0.2s, color 0.2s, border-color 0.2s, opacity 0.2s, transform 0.2s',
            }}
          >
            {saving === 'message' ? 'saving…' : msgSaved ? '✓ saved' : 'save message'}
          </button>
        </div>
      </div>

      <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.18)', marginTop: 18, letterSpacing: '0.08em', textAlign: 'center' }}>
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