'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Section } from '@/app/lib/users'

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'overview', label: 'Overview' }, { key: 'live', label: 'Live' },
  { key: 'traffic', label: 'Traffic' }, { key: 'sessions', label: 'Sessions' },
  { key: 'codes', label: 'Codes' }, { key: 'giveaways', label: 'Giveaways' },
  { key: 'settings', label: 'Settings' },
]

interface SafeUser {
  id: string; username: string; name: string; avatar?: string
  authMethod: 'password' | 'key'; pendingSetup: boolean
  permissions: Section[]; isRoot?: boolean; createdAt: string; lastLogin?: string
}

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }
const FIELD: React.CSSProperties = {
  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)',
  borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 12, outline: 'none',
}

// ─── OTP reveal card ──────────────────────────────────────────────────────────

function OtpCard({ username, otp, onClose }: { username: string; otp: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,0,7,0.9)', backdropFilter: 'blur(10px)', animation: 'u-fade 0.3s ease', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, background: '#0a0010', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: 30, textAlign: 'center', animation: 'u-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 0 50px rgba(74,222,128,0.12)' }}>
        <div style={{ width: 54, height: 54, borderRadius: '50%', margin: '0 auto 14px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#4ade80', animation: 'u-check 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>✓</div>
        <div style={{ ...S, fontSize: 13, color: 'var(--text)' }}>@{username} is ready</div>
        <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', marginTop: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>one-time password</div>
        <div style={{ marginTop: 8, padding: '14px', borderRadius: 12, background: 'rgba(196,20,40,0.08)', border: '1px dashed rgba(196,20,40,0.4)', fontFamily: 'monospace', fontSize: 22, letterSpacing: '0.2em', color: '#fff', textShadow: '0 0 16px rgba(232,25,92,0.6)' }}>{otp}</div>
        <button onClick={() => { navigator.clipboard.writeText(otp).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }}
          style={{ ...S, marginTop: 12, padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.12)'}`, color: copied ? '#4ade80' : 'rgba(254,240,244,0.6)', fontSize: 11 }}>
          {copied ? '✓ copied' : '⧉ copy'}
        </button>
        <div style={{ ...S, fontSize: 8.5, color: 'rgba(254,240,244,0.3)', marginTop: 12, lineHeight: 1.6 }}>share it with {username} — they’ll set their own password or key on first login. valid until first use.</div>
        <button onClick={onClose} style={{ ...S, marginTop: 16, padding: '9px 0', width: '100%', borderRadius: 8, cursor: 'pointer', background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.4)', color: 'var(--text)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>done</button>
      </div>
      <style>{`@keyframes u-fade{from{opacity:0}to{opacity:1}}@keyframes u-pop{from{opacity:0;transform:scale(0.9) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes u-check{from{transform:scale(0)}to{transform:scale(1)}}`}</style>
    </div>
  )
}

// ─── Create / edit modal ──────────────────────────────────────────────────────

function UserModal({ initial, onClose, onSaved, onCreated }: {
  initial?: SafeUser
  onClose: () => void
  onSaved: (u: SafeUser) => void
  onCreated: (u: SafeUser, otp: string) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [avatar, setAvatar] = useState(initial?.avatar ?? '')
  const [perms, setPerms] = useState<Section[]>(initial?.permissions ?? ['overview'])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const editing = !!initial

  const togglePerm = (p: Section) => setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const upload = async (file: File) => {
    setUploading(true); setError('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const d = await r.json()
      if (r.ok && d.url) setAvatar(d.url); else setError(d.error ?? 'Upload failed')
    } catch { setError('Upload failed') }
    setUploading(false)
  }

  const submit = async () => {
    if (!editing && !/^[a-z0-9_.-]{2,24}$/.test(username.trim().toLowerCase())) {
      setError('Username: 2-24 chars (a-z, 0-9, . _ -)'); return
    }
    setSaving(true); setError('')
    try {
      if (editing) {
        const r = await fetch(`/api/admin/users/${initial.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, avatar, permissions: initial.isRoot ? undefined : perms }),
        })
        const d = await r.json()
        if (r.ok) onSaved(d.user); else setError(d.error ?? 'Error')
      } else {
        const r = await fetch('/api/admin/users', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username: username.trim().toLowerCase(), avatar, permissions: perms }),
        })
        const d = await r.json()
        if (r.ok) onCreated(d.user, d.otp); else setError(d.error ?? 'Error')
      }
    } catch { setError('Connection error') }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,0,7,0.85)', backdropFilter: 'blur(8px)', padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)', borderRadius: 16, padding: 26, maxHeight: '90vh', overflowY: 'auto', animation: 'u-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ ...S, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)' }}>{editing ? 'edit user' : 'new user'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <button onClick={() => fileRef.current?.click()} style={{ width: 60, height: 60, borderRadius: '50%', border: '1px solid rgba(196,20,40,0.3)', background: avatar ? `center/cover url(${avatar})` : 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {!avatar && <span style={{ fontSize: 18, opacity: 0.4 }}>{uploading ? '…' : '📷'}</span>}
          </button>
          <div>
            <div style={{ ...S, fontSize: 10, color: 'var(--text)' }}>profile photo</div>
            <div style={{ ...S, fontSize: 8.5, color: 'rgba(254,240,244,0.3)', marginTop: 2 }}>{uploading ? 'uploading…' : 'click to upload'}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>display name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Luna" style={FIELD} />
          </div>
          {!editing && (
            <div>
              <label style={labelStyle}>username</label>
              <input value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="luna" style={{ ...FIELD, fontFamily: 'monospace' }} />
            </div>
          )}

          {!initial?.isRoot && (
            <div>
              <label style={labelStyle}>permissions</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {SECTIONS.map(s => {
                  const on = perms.includes(s.key)
                  return (
                    <button key={s.key} type="button" onClick={() => togglePerm(s.key)} style={{
                      ...S, fontSize: 9, padding: '5px 11px', borderRadius: 20, cursor: 'pointer',
                      background: on ? 'rgba(196,20,40,0.18)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${on ? 'rgba(196,20,40,0.45)' : 'rgba(255,255,255,0.08)'}`,
                      color: on ? 'var(--text)' : 'rgba(254,240,244,0.4)', transition: 'all 0.15s',
                    }}>
                      {on ? '✓ ' : ''}{s.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && <div style={{ ...S, fontSize: 10, color: 'var(--primary)', textAlign: 'center' }}>{error}</div>}

          <button onClick={submit} disabled={saving} style={{ ...S, padding: '10px 0', marginTop: 4, background: saving ? 'rgba(196,20,40,0.08)' : 'rgba(196,20,40,0.2)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8, color: saving ? 'var(--text-muted)' : 'var(--text)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'saving…' : editing ? 'save changes' : 'create user'}
          </button>
        </div>
      </div>
      <style>{`@keyframes u-pop{from{opacity:0;transform:scale(0.92) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = { ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<SafeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SafeUser | null>(null)
  const [otpCard, setOtpCard] = useState<{ username: string; otp: string } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/admin/users')
      .then(r => { if (r.status === 403 || r.status === 401) { router.replace('/admin'); return null } return r.json() })
      .then(d => { if (d?.users) { setUsers(d.users); setLoading(false) } })
      .catch(() => {})
  }, [router])

  useEffect(() => { load() }, [load])

  const remove = async (u: SafeUser) => {
    if (!confirm(`Delete @${u.username}?`)) return
    setDeleting(u.id)
    const r = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    if (r.ok) setUsers(prev => prev.filter(x => x.id !== u.id))
    setDeleting(null)
  }

  const resendOtp = async (u: SafeUser) => {
    const r = await fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resetOtp' }) })
    const d = await r.json()
    if (r.ok && d.otp) { setOtpCard({ username: u.username, otp: d.otp }); load() }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', margin: 0 }}>users</h1>
          <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            {users.length} account{users.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }} style={{ ...S, padding: '9px 18px', background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8, color: 'var(--text)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
          + new user
        </button>
      </div>

      {loading ? (
        <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.3)', textAlign: 'center', paddingTop: 50, letterSpacing: '0.1em' }}>loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {users.map(u => {
            const initials = (u.name || u.username).slice(0, 2).toUpperCase()
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12,
                background: u.isRoot ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${u.isRoot ? 'rgba(255,215,0,0.22)' : 'rgba(255,255,255,0.07)'}`,
              }}>
                {u.avatar
                  ? <img src={u.avatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(196,20,40,0.25)' }} />
                  : <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: u.isRoot ? 'linear-gradient(135deg,#c41428,#e8195c)' : 'rgba(196,20,40,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...S, fontSize: 12, color: '#fff' }}>{u.isRoot ? '👑' : initials}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ ...S, fontSize: 12, color: 'var(--text)' }}>{u.name}</span>
                    {u.isRoot && <Badge color="#ffd700" bg="rgba(255,215,0,0.15)">owner</Badge>}
                    {!u.isRoot && (u.pendingSetup
                      ? <Badge color="#fbbf24" bg="rgba(251,191,36,0.12)">pending setup</Badge>
                      : <Badge color="#4ade80" bg="rgba(74,222,128,0.12)">active</Badge>)}
                    {!u.isRoot && !u.pendingSetup && <span style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)' }}>{u.authMethod === 'key' ? '🔑 key' : '🔒 password'}</span>}
                  </div>
                  <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.35)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{u.username}{u.isRoot ? ' · full access' : u.permissions.length ? ` · ${u.permissions.join(', ')}` : ' · no access'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {!u.isRoot && u.pendingSetup && (
                    <button onClick={() => resendOtp(u)} title="Show one-time password" style={iconBtn}>⧉ otp</button>
                  )}
                  <button onClick={() => { setEditing(u); setShowModal(true) }} style={iconBtn}>✎</button>
                  {!u.isRoot && (
                    <button onClick={() => remove(u)} disabled={deleting === u.id} style={{ ...iconBtn, color: 'rgba(254,240,244,0.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(196,20,40,0.4)'; e.currentTarget.style.color = 'var(--primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(254,240,244,0.3)' }}>
                      {deleting === u.id ? '…' : '✕'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <UserModal
          initial={editing ?? undefined}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={u => { setUsers(prev => prev.map(x => x.id === u.id ? u : x)); setShowModal(false); setEditing(null) }}
          onCreated={(u, otp) => { setUsers(prev => [...prev, u]); setShowModal(false); setEditing(null); setOtpCard({ username: u.username, otp }) }}
        />
      )}
      {otpCard && <OtpCard username={otpCard.username} otp={otpCard.otp} onClose={() => setOtpCard(null)} />}
    </div>
  )
}

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span style={{ ...S, fontSize: 7, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: bg, border: `1px solid ${color}40`, color }}>{children}</span>
}

const iconBtn: React.CSSProperties = { ...S, padding: '5px 9px', fontSize: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(254,240,244,0.5)', cursor: 'pointer', transition: 'all 0.15s' }
