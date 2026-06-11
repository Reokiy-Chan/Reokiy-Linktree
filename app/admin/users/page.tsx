'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Section, Permission } from '@/app/lib/users'

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'overview', label: 'Overview' }, { key: 'live', label: 'Live' },
  { key: 'traffic', label: 'Traffic' }, { key: 'sessions', label: 'Sessions' },
  { key: 'codes', label: 'Codes' }, { key: 'giveaways', label: 'Giveaways' },
  { key: 'settings', label: 'Settings' }, { key: 'users', label: 'Users' },
]

const ACTION_PERMS: { key: Permission; label: string; desc: string }[] = [
  { key: 'HandleUsers', label: 'HandleUsers', desc: 'editar info y permisos de otros usuarios' },
  { key: 'HandleUserActions', label: 'HandleUserActions', desc: 'suspender, resetear OTP (sin editar info)' },
]

interface SafeUser {
  id: string; username: string; name: string; avatar?: string
  authMethod: 'password' | 'key' | 'webauthn'; pendingSetup: boolean
  permissions: Permission[]; isRoot?: boolean; createdAt: string; lastLogin?: string
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
        <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', marginTop: 12, lineHeight: 1.6 }}>share it with {username} — they'll set their own password on first login. valid until first use.</div>
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
  const [perms, setPerms] = useState<Permission[]>(initial?.permissions ?? ['overview'])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const editing = !!initial

  const togglePerm = (p: Permission) => setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

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
            <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', marginTop: 2 }}>{uploading ? 'uploading…' : 'click to upload'}</div>
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
            <>
              <div>
                <label style={labelStyle}>secciones</label>
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
              <div>
                <label style={labelStyle}>permisos de acción</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {ACTION_PERMS.map(p => {
                    const on = perms.includes(p.key)
                    return (
                      <button key={p.key} type="button" onClick={() => togglePerm(p.key)} style={{
                        ...S, textAlign: 'left', padding: '8px 11px', borderRadius: 8, cursor: 'pointer',
                        background: on ? 'rgba(196,20,40,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${on ? 'rgba(196,20,40,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ fontSize: 9, color: on ? 'var(--text)' : 'rgba(254,240,244,0.5)', fontFamily: 'monospace' }}>{on ? '✓ ' : ''}{p.label}</div>
                        <div style={{ fontSize: 8, color: 'rgba(254,240,244,0.3)', marginTop: 2 }}>{p.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
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

// ─── User detail modal ────────────────────────────────────────────────────────

function UserDetailModal({ user, me, onClose, onEdit, onOtp, onDeleted }: {
  user: SafeUser
  me: SafeUser
  onClose: () => void
  onEdit: () => void
  onOtp: (u: SafeUser) => void
  onDeleted: (id: string) => void
}) {
  const canEdit = me.isRoot || me.permissions.includes('HandleUsers')
  const canAction = me.isRoot || me.permissions.includes('HandleUserActions') || me.permissions.includes('HandleUsers')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar @${user.username}?`)) return
    setDeleting(true)
    const r = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (r.ok) { onDeleted(user.id); onClose() }
    setDeleting(false)
  }

  const handleResetOtp = async () => {
    const r = await fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resetOtp' }) })
    const d = await r.json()
    if (r.ok && d.otp) onOtp({ ...user, otp: d.otp } as SafeUser & { otp: string })
  }

  const initials = (user.name || user.username).slice(0, 2).toUpperCase()
  const sectionPerms = user.permissions.filter(p => SECTIONS.some(s => s.key === p))
  const actionPerms = user.permissions.filter(p => ACTION_PERMS.some(a => a.key === p))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,0,7,0.85)', backdropFilter: 'blur(10px)', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)', borderRadius: 16, padding: 24, animation: 'u-pop 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ ...S, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)' }}>usuario</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {canEdit && (
              <button onClick={onEdit} style={{ ...S, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.3)', borderRadius: 6, color: 'rgba(196,20,40,0.8)', fontSize: 9, cursor: 'pointer' }}>✎ editar</button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          {user.avatar
            ? <img src={user.avatar} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(196,20,40,0.3)', flexShrink: 0 }} />
            : <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: user.isRoot ? 'linear-gradient(135deg,#c41428,#e8195c)' : 'rgba(196,20,40,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', border: user.isRoot ? '2px solid rgba(255,215,0,0.4)' : '2px solid rgba(196,20,40,0.25)' }}>
                {user.isRoot ? '👑' : initials}
              </div>
          }
          <div>
            <div style={{ ...S, fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{user.name}</div>
            <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', marginTop: 2 }}>@{user.username}</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              {user.isRoot && <Badge color="#ffd700" bg="rgba(255,215,0,0.15)">owner</Badge>}
              {!user.isRoot && (user.pendingSetup
                ? <Badge color="#fbbf24" bg="rgba(251,191,36,0.12)">pending setup</Badge>
                : <Badge color="#4ade80" bg="rgba(74,222,128,0.12)">active</Badge>)}
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 14px', ...S, fontSize: 10, marginBottom: 16 }}>
          <span style={{ color: 'rgba(254,240,244,0.35)' }}>auth</span>
          <span style={{ color: 'var(--text)' }}>{user.authMethod}</span>
          {user.lastLogin && <>
            <span style={{ color: 'rgba(254,240,244,0.35)' }}>último acceso</span>
            <span style={{ color: 'rgba(254,240,244,0.5)' }}>{new Date(user.lastLogin).toLocaleDateString('es-ES')}</span>
          </>}
          <span style={{ color: 'rgba(254,240,244,0.35)' }}>creado</span>
          <span style={{ color: 'rgba(254,240,244,0.4)' }}>{new Date(user.createdAt).toLocaleDateString('es-ES')}</span>
        </div>

        {/* Permissions */}
        {!user.isRoot && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>permisos</div>
            {sectionPerms.length === 0 && actionPerms.length === 0
              ? <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.25)' }}>sin acceso</span>
              : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {sectionPerms.map(p => (
                    <span key={p} style={{ ...S, fontSize: 8, padding: '2px 8px', borderRadius: 20, background: 'rgba(196,20,40,0.12)', border: '1px solid rgba(196,20,40,0.3)', color: 'rgba(254,240,244,0.6)' }}>{p}</span>
                  ))}
                  {actionPerms.map(p => (
                    <span key={p} style={{ ...S, fontSize: 8, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.3)', color: 'rgba(255,165,0,0.8)', fontFamily: 'monospace' }}>{p}</span>
                  ))}
                </div>
            }
          </div>
        )}

        {/* Actions */}
        {canAction && !user.isRoot && (
          <div style={{ display: 'flex', gap: 6 }}>
            {user.pendingSetup && (
              <button onClick={handleResetOtp} style={{ ...S, flex: 1, padding: '7px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(254,240,244,0.5)', fontSize: 9, cursor: 'pointer' }}>⧉ nuevo OTP</button>
            )}
            {canEdit && (
              <button onClick={handleDelete} disabled={deleting} style={{ ...S, padding: '7px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, color: 'rgba(254,240,244,0.3)', fontSize: 9, cursor: 'pointer' }}>
                {deleting ? '…' : '🗑'}
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes u-pop{from{opacity:0;transform:scale(0.92) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = { ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span style={{ ...S, fontSize: 7, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: bg, border: `1px solid ${color}40`, color }}>{children}</span>
}

const iconBtn: React.CSSProperties = { ...S, padding: '5px 9px', fontSize: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(254,240,244,0.5)', cursor: 'pointer', transition: 'all 0.15s' }

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<SafeUser[]>([])
  const [me, setMe] = useState<SafeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SafeUser | null>(null)
  const [detailUser, setDetailUser] = useState<SafeUser | null>(null)
  const [otpCard, setOtpCard] = useState<{ username: string; otp: string } | null>(null)

  const load = useCallback(() => {
    fetch('/api/admin/users')
      .then(r => { if (r.status === 403 || r.status === 401) { router.replace('/admin'); return null } return r.json() })
      .then(d => { if (d?.users) { setUsers(d.users); setLoading(false) } })
      .catch(() => {})
  }, [router])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setMe(d.user) })
      .catch(() => {})
  }, [])

  const remove = async (u: SafeUser) => {
    if (!confirm(`Delete @${u.username}?`)) return
    const r = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    if (r.ok) setUsers(prev => prev.filter(x => x.id !== u.id))
  }

  const resendOtp = async (u: SafeUser) => {
    const r = await fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resetOtp' }) })
    const d = await r.json()
    if (r.ok && d.otp) { setOtpCard({ username: u.username, otp: d.otp }); load() }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', margin: 0 }}>users</h1>
          <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            {users.length} account{users.length !== 1 ? 's' : ''}
          </div>
        </div>
        {(me?.isRoot || me?.permissions.includes('HandleUsers')) && (
          <button onClick={() => { setEditing(null); setShowModal(true) }} style={{ ...S, padding: '9px 18px', background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8, color: 'var(--text)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
            + new user
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.3)', textAlign: 'center', paddingTop: 50, letterSpacing: '0.1em' }}>loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {users.map(u => {
            const initials = (u.name || u.username).slice(0, 2).toUpperCase()
            return (
              <div
                key={u.id}
                onClick={() => setDetailUser(u)}
                style={{
                  background: u.isRoot ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${u.isRoot ? 'rgba(255,215,0,0.22)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 12, padding: '16px 12px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, textAlign: 'center', transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(196,20,40,0.4)'; e.currentTarget.style.background = 'rgba(196,20,40,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = u.isRoot ? 'rgba(255,215,0,0.22)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = u.isRoot ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.025)' }}
              >
                {u.avatar
                  ? <img src={u.avatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(196,20,40,0.25)', flexShrink: 0 }} />
                  : <div style={{ width: 48, height: 48, borderRadius: '50%', background: u.isRoot ? 'linear-gradient(135deg,#c41428,#e8195c)' : 'rgba(196,20,40,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', flexShrink: 0 }}>
                      {u.isRoot ? '👑' : initials}
                    </div>
                }
                <div>
                  <div style={{ ...S, fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>{u.name}</div>
                  <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', marginTop: 2 }}>@{u.username}</div>
                </div>
                <div>
                  {u.isRoot
                    ? <Badge color="#ffd700" bg="rgba(255,215,0,0.15)">owner</Badge>
                    : u.pendingSetup
                      ? <Badge color="#fbbf24" bg="rgba(251,191,36,0.12)">setup pendiente</Badge>
                      : <Badge color="#4ade80" bg="rgba(74,222,128,0.12)">activo</Badge>
                  }
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

      {detailUser && me && (
        <UserDetailModal
          user={detailUser}
          me={me}
          onClose={() => setDetailUser(null)}
          onEdit={() => { setEditing(detailUser); setDetailUser(null); setShowModal(true) }}
          onOtp={u => {
            const uTyped = u as SafeUser & { otp?: string }
            if (uTyped.otp) setOtpCard({ username: u.username, otp: uTyped.otp })
          }}
          onDeleted={id => setUsers(prev => prev.filter(x => x.id !== id))}
        />
      )}

      {otpCard && <OtpCard username={otpCard.username} otp={otpCard.otp} onClose={() => setOtpCard(null)} />}
    </div>
  )
}
