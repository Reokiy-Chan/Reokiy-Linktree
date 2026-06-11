'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
type Permission = 'admin' | 'owner'

interface PendingMessage { text: string; from: string; at: string }

interface SafeUser {
  id: string; username: string; name: string; avatar?: string
  authMethod: 'password' | 'key' | 'webauthn'; pendingSetup: boolean
  permissions: Permission[]; isRoot?: boolean; suspended?: boolean
  pendingMessage?: PendingMessage
  createdAt: string; lastLogin?: string
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
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, background: '#0a0010', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: 30, textAlign: 'center', animation: 'u-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 0 50px rgba(74,222,128,0.12)' }}>
        <div style={{ width: 54, height: 54, borderRadius: '50%', margin: '0 auto 14px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#4ade80', animation: 'u-check 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>✓</div>
        <div style={{ ...S, fontSize: 13, color: 'var(--text)' }}>@{username} is ready</div>
        <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.4)', marginTop: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>one-time password</div>
        <div style={{ marginTop: 8, padding: '14px', borderRadius: 12, background: 'rgba(196,20,40,0.08)', border: '1px dashed rgba(196,20,40,0.4)', fontFamily: 'monospace', fontSize: 22, letterSpacing: '0.2em', color: '#fff', textShadow: '0 0 16px rgba(232,25,92,0.6)' }}>{otp}</div>
        <button type="button" onClick={() => { navigator.clipboard.writeText(otp).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }}
          style={{ ...S, marginTop: 12, padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.12)'}`, color: copied ? '#4ade80' : 'rgba(254,240,244,0.6)', fontSize: 12 }}>
          {copied ? '✓ copied' : '⧉ copy'}
        </button>
        <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', marginTop: 12, lineHeight: 1.6 }}>share it with {username} — they'll set their own password on first login. valid until first use.</div>
        <button type="button" onClick={onClose} style={{ ...S, marginTop: 16, padding: '9px 0', width: '100%', borderRadius: 8, cursor: 'pointer', background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.4)', color: 'var(--text)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>done</button>
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
  const [perms, setPerms] = useState<Permission[]>(initial?.permissions?.length ? initial.permissions : ['admin'])
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
      <div style={{ width: '100%', maxWidth: 420, background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)', borderRadius: 16, padding: 26, maxHeight: '90vh', overflowY: 'auto', animation: 'u-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ ...S, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)' }}>{editing ? 'edit user' : 'new user'}</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <button type="button" onClick={() => fileRef.current?.click()} style={{ width: 60, height: 60, borderRadius: '50%', border: '1px solid rgba(196,20,40,0.3)', background: avatar ? `center/cover url(${avatar})` : 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {!avatar && <span style={{ fontSize: 18, opacity: 0.4 }}>{uploading ? '…' : '📷'}</span>}
          </button>
          <div>
            <div style={{ ...S, fontSize: 12, color: 'var(--text)' }}>profile photo</div>
            <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', marginTop: 2 }}>{uploading ? 'uploading…' : 'click to upload'}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>display name</label>
            <input value={name} onChange={e => setName(e.target.value)} aria-label="Luna" placeholder="Luna" style={FIELD} />
          </div>
          {!editing && (
            <div>
              <label style={labelStyle}>username</label>
              <input value={username} onChange={e => setUsername(e.target.value.toLowerCase())} aria-label="luna" placeholder="luna" style={{ ...FIELD, fontFamily: 'monospace' }} />
            </div>
          )}

          {!initial?.isRoot && (
            <div>
              <label style={labelStyle}>permission level</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {([
                  { key: 'admin' as Permission, label: 'Admin', desc: 'Full access — cannot create or delete users' },
                  { key: 'owner' as Permission, label: 'Owner', desc: 'Full access — can create, edit and delete users' },
                ] as const).map(opt => {
                  const on = perms.includes(opt.key)
                  return (
                    <button key={opt.key} type="button" onClick={() => setPerms([opt.key])} style={{
                      ...S, textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: on ? 'rgba(196,20,40,0.12)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${on ? 'rgba(196,20,40,0.45)' : 'rgba(255,255,255,0.07)'}`,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${on ? '#c41428' : 'rgba(255,255,255,0.2)'}`, background: on ? '#c41428' : 'transparent', flexShrink: 0, transition: 'background 0.15s, border-color 0.15s' }} />
                        <span style={{ fontSize: 12, color: on ? 'var(--text)' : 'rgba(254,240,244,0.5)', fontWeight: on ? 500 : 400 }}>{opt.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(254,240,244,0.3)', marginTop: 4, paddingLeft: 22 }}>{opt.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && <div style={{ ...S, fontSize: 12, color: 'var(--primary)', textAlign: 'center' }}>{error}</div>}

          <button type="button" onClick={submit} disabled={saving} style={{ ...S, padding: '10px 0', marginTop: 4, background: saving ? 'rgba(196,20,40,0.08)' : 'rgba(196,20,40,0.2)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8, color: saving ? 'var(--text-muted)' : 'var(--text)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'saving…' : editing ? 'save changes' : 'create user'}
          </button>
        </div>
      </div>
      <style>{`@keyframes u-pop{from{opacity:0;transform:scale(0.92) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  )
}

// ─── User detail modal ────────────────────────────────────────────────────────

function UserDetailModal({ user, me, onClose, onEdit, onOtp, onDeleted, onUpdated }: {
  user: SafeUser; me: SafeUser; onClose: () => void; onEdit: () => void
  onOtp: (username: string, otp: string) => void
  onDeleted: (id: string) => void
  onUpdated: (u: SafeUser) => void
}) {
  const canOwner = me.isRoot || me.permissions.includes('owner')
  const canAction = me.isRoot || me.permissions.includes('owner') || me.permissions.includes('admin')
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msgOpen, setMsgOpen] = useState(false)
  const [msgText, setMsgText] = useState('')
  const initials = (user.name || user.username).slice(0, 2).toUpperCase()

  const action = async (act: string, extra?: Record<string, unknown>) => {
    setBusy(act)
    const r = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, ...extra }),
    })
    const d = await r.json()
    setBusy(null)
    if (!r.ok) return alert(d.error ?? 'Error')
    if (d.otp) onOtp(user.username, d.otp)
    if (d.ok || d.user) onUpdated(d.user ? d.user : { ...user, ...(act === 'suspend' ? { suspended: true } : act === 'unsuspend' ? { suspended: false } : {}) })
  }

  const handleDelete = async () => {
    if (!confirm(`Delete @${user.username}?`)) return
    setDeleting(true)
    const r = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (r.ok) { onDeleted(user.id); onClose() }
    setDeleting(false)
  }

  const sendMessage = async () => {
    if (!msgText.trim()) return
    await action('sendMessage', { text: msgText.trim() })
    setMsgText(''); setMsgOpen(false)
  }

  const permLevel = user.isRoot ? 'root' : user.permissions.includes('owner') ? 'owner' : user.permissions.includes('admin') ? 'admin' : 'none'
  const permColor = permLevel === 'root' ? '#ffd700' : permLevel === 'owner' ? '#e8195c' : permLevel === 'admin' ? '#60a5fa' : 'rgba(255,255,255,0.3)'
  const permBg = permLevel === 'root' ? 'rgba(255,215,0,0.1)' : permLevel === 'owner' ? 'rgba(232,25,92,0.1)' : permLevel === 'admin' ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.04)'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,0,7,0.85)', backdropFilter: 'blur(10px)', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)', borderRadius: 16, padding: 24, maxHeight: '90vh', overflowY: 'auto', animation: 'u-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ ...S, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)' }}>user</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {canOwner && !user.isRoot && (
              <button type="button" onClick={onEdit} style={{ ...S, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.3)', borderRadius: 6, color: 'rgba(196,20,40,0.8)', fontSize: 12, cursor: 'pointer' }}>✎ edit</button>
            )}
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 16 }}>✕</button>
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
            <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.4)', marginTop: 2 }}>@{user.username}</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ ...S, fontSize: 11, padding: '2px 8px', borderRadius: 20, background: permBg, border: `1px solid ${permColor}40`, color: permColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{permLevel}</span>
              {user.pendingSetup && <Badge color="#fbbf24" bg="rgba(251,191,36,0.12)">pending setup</Badge>}
              {user.suspended && <Badge color="#f87171" bg="rgba(248,113,113,0.1)">suspended</Badge>}
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 14px', ...S, fontSize: 12, marginBottom: 16 }}>
          <span style={{ color: 'rgba(254,240,244,0.35)' }}>auth</span>
          <span style={{ color: 'var(--text)' }}>{user.authMethod}</span>
          {user.lastLogin && <>
            <span style={{ color: 'rgba(254,240,244,0.35)' }}>last login</span>
            <span style={{ color: 'rgba(254,240,244,0.5)' }}>{new Date(user.lastLogin).toLocaleDateString('en-GB')}</span>
          </>}
          <span style={{ color: 'rgba(254,240,244,0.35)' }}>created</span>
          <span style={{ color: 'rgba(254,240,244,0.4)' }}>{new Date(user.createdAt).toLocaleDateString('en-GB')}</span>
        </div>

        {/* Actions — only for non-root users */}
        {canAction && !user.isRoot && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ ...S, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.25)', marginBottom: 2 }}>actions</div>

            {/* Require password change */}
            <button type="button" disabled={!!busy} onClick={() => { if (confirm(`Force @${user.username} to reset their password?`)) action('requirePasswordChange') }}
              style={{ ...S, padding: '9px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(254,240,244,0.65)', fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔑</span>
              <div>
                <div>Require password change</div>
                <div style={{ fontSize: 11, color: 'rgba(254,240,244,0.3)', marginTop: 1 }}>generates a new OTP — they must reset on next login</div>
              </div>
            </button>

            {/* Send message */}
            <button type="button" onClick={() => setMsgOpen(o => !o)}
              style={{ ...S, padding: '9px 12px', background: msgOpen ? 'rgba(196,20,40,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${msgOpen ? 'rgba(196,20,40,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, color: 'rgba(254,240,244,0.65)', fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>✉</span>
              <div>
                <div>Send message</div>
                <div style={{ fontSize: 11, color: 'rgba(254,240,244,0.3)', marginTop: 1 }}>shown in their panel until dismissed</div>
              </div>
            </button>
            {msgOpen && (
              <div style={{ display: 'flex', gap: 6, paddingLeft: 4 }}>
                <input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="type your message…"
                  style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(196,20,40,0.2)', borderRadius: 7, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 12, outline: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                />
                <button type="button" onClick={sendMessage} disabled={!msgText.trim() || !!busy}
                  style={{ ...S, padding: '7px 12px', background: 'rgba(196,20,40,0.2)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 7, color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}>
                  send
                </button>
              </div>
            )}

            {/* Suspend / Unsuspend */}
            {user.suspended ? (
              <button type="button" disabled={!!busy} onClick={() => action('unsuspend')}
                style={{ ...S, padding: '9px 12px', background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, color: '#4ade80', fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>▶</span>
                <div>
                  <div>Unsuspend account</div>
                  <div style={{ fontSize: 11, color: 'rgba(74,222,128,0.4)', marginTop: 1 }}>restore login access</div>
                </div>
              </button>
            ) : (
              <button type="button" disabled={!!busy} onClick={() => { if (confirm(`Suspend @${user.username}? They won't be able to log in.`)) action('suspend') }}
                style={{ ...S, padding: '9px 12px', background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, color: '#f87171', fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>⏸</span>
                <div>
                  <div>Suspend account</div>
                  <div style={{ fontSize: 11, color: 'rgba(248,113,113,0.35)', marginTop: 1 }}>blocks login without deleting</div>
                </div>
              </button>
            )}

            {/* Delete — owner only */}
            {canOwner && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                style={{ ...S, padding: '9px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: 'rgba(254,240,244,0.3)', fontSize: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>🗑</span>
                <div>Delete user</div>
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes u-pop{from{opacity:0;transform:scale(0.92) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = { ...S, fontSize: 12, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span style={{ ...S, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: bg, border: `1px solid ${color}40`, color }}>{children}</span>
}

const iconBtn: React.CSSProperties = { ...S, padding: '5px 9px', fontSize: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(254,240,244,0.5)', cursor: 'pointer', transition: 'background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s, transform 0.15s' }

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<SafeUser[]>([])
  const [me, setMe] = useState<SafeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SafeUser | null>(null)
  const [detailUser, setDetailUser] = useState<SafeUser | null>(null)
  const [otpCard, setOtpCard] = useState<{ username: string; otp: string } | null>(null)

  const load = useCallback(() => {
    fetch('/api/admin/users')
      .then(async r => {
        if (r.status === 401) { router.replace('/admin/login'); return null }
        if (!r.ok) { const body = await r.json().catch(() => ({})); setAccessError(`HTTP ${r.status}: ${body.error ?? 'unknown'}`); setLoading(false); return null }
        return r.json()
      })
      .then(d => { if (d?.users) { setUsers(d.users); setLoading(false) } })
      .catch(e => { setAccessError(String(e)); setLoading(false) })
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

  const handleUpdated = (u: SafeUser) => setUsers(prev => prev.map(x => x.id === u.id ? u : x))

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', margin: 0 }}>users</h1>
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            {users.length} account{users.length !== 1 ? 's' : ''}
          </div>
        </div>
        {(me?.isRoot || me?.permissions.includes('owner')) && (
          <button type="button" onClick={() => { setEditing(null); setShowModal(true) }} style={{ ...S, padding: '9px 18px', background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8, color: 'var(--text)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
            + new user
          </button>
        )}
      </div>

      {accessError && (
        <div style={{ ...S, fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          {accessError}
        </div>
      )}

      {loading ? (
        <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', textAlign: 'center', paddingTop: 50, letterSpacing: '0.1em' }}>loading…</div>
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
                  <div style={{ ...S, fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{u.name}</div>
                  <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.35)', marginTop: 2 }}>@{u.username}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                  {u.isRoot
                    ? <Badge color="#ffd700" bg="rgba(255,215,0,0.15)">root</Badge>
                    : u.permissions.includes('owner')
                      ? <Badge color="#e8195c" bg="rgba(232,25,92,0.1)">owner</Badge>
                      : <Badge color="#60a5fa" bg="rgba(96,165,250,0.1)">admin</Badge>
                  }
                  {u.suspended && <Badge color="#f87171" bg="rgba(248,113,113,0.08)">suspended</Badge>}
                  {u.pendingSetup && <Badge color="#fbbf24" bg="rgba(251,191,36,0.08)">setup</Badge>}
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
          onOtp={(username, otp) => setOtpCard({ username, otp })}
          onDeleted={id => { setUsers(prev => prev.filter(x => x.id !== id)); setDetailUser(null) }}
          onUpdated={u => { handleUpdated(u); setDetailUser(u) }}
        />
      )}

      {otpCard && <OtpCard username={otpCard.username} otp={otpCard.otp} onClose={() => setOtpCard(null)} />}
    </div>
  )
}
