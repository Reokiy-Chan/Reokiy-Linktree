'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { AuditEntry, AuditAction } from '@/app/lib/audit'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

const ACTION_META: Record<string, { label: string; bg: string; color: string }> = {
  'login':    { label: 'login',    bg: 'rgba(59,130,246,0.15)',   color: '#93c5fd' },
  'settings': { label: 'settings', bg: 'rgba(251,191,36,0.15)',   color: '#fbbf24' },
  'user':     { label: 'user',     bg: 'rgba(167,139,250,0.15)',  color: '#c4b5fd' },
  'code':     { label: 'code',     bg: 'rgba(74,222,128,0.15)',   color: '#4ade80' },
  'raffle':   { label: 'raffle',   bg: 'rgba(251,146,60,0.15)',   color: '#fb923c' },
  'account':  { label: 'account',  bg: 'rgba(232,25,92,0.15)',    color: '#e8195c' },
  'webauthn': { label: 'webauthn', bg: 'rgba(255,255,255,0.08)',  color: 'rgba(254,224,244,0.5)' },
}

function getActionMeta(action: AuditAction) {
  const category = action.split('.')[0]
  return ACTION_META[category] ?? { label: category, bg: 'rgba(255,255,255,0.06)', color: 'rgba(254,224,244,0.4)' }
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const meta = getActionMeta(entry.action)
  const initials = (entry.actorName || entry.actorUsername).slice(0, 2).toUpperCase()
  const [hover, setHover] = useState(false)

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      transition: 'background 0.15s',
      background: hover ? 'rgba(255,255,255,0.02)' : 'transparent',
    }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar */}
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        {entry.actorAvatar
          ? <img src={entry.actorAvatar} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
          : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(196,20,40,0.25)', border: '1px solid rgba(196,20,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(254,224,244,0.7)' }}>
              {initials}
            </div>}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ ...S, fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{entry.actorName}</span>
          <span style={{ ...S, fontSize: 11, color: 'rgba(254,224,244,0.3)' }}>@{entry.actorUsername}</span>
          <span style={{
            ...S, fontSize: 10, padding: '1px 8px', borderRadius: 10,
            background: meta.bg, color: meta.color,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {entry.action}
          </span>
        </div>
        {entry.target && (
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,224,244,0.75)', marginBottom: 2 }}>
            → <strong style={{ color: 'var(--text)' }}>{entry.target}</strong>
            {entry.detail && <span style={{ color: 'rgba(254,224,244,0.4)', marginLeft: 8 }}>{entry.detail}</span>}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div style={{ ...S, fontSize: 11, color: 'rgba(254,224,244,0.25)', flexShrink: 0, marginTop: 2, cursor: 'default' }}
        title={new Date(entry.ts).toLocaleString('en-GB')}>
        {relativeTime(entry.ts)}
      </div>
    </div>
  )
}

export default function AuditPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/admin/audit')
      .then(r => { if (r.status === 401) { router.replace('/admin/login'); return null } return r.json() })
      .then(d => { if (d?.entries) setEntries(d.entries) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const filtered = useMemo(() => {
    if (!query.trim()) return entries
    const q = query.toLowerCase()
    return entries.filter(e =>
      e.actorUsername.toLowerCase().includes(q) ||
      e.actorName.toLowerCase().includes(q) ||
      e.action.includes(q) ||
      (e.target ?? '').toLowerCase().includes(q) ||
      (e.detail ?? '').toLowerCase().includes(q)
    )
  }, [entries, query])

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', margin: 0 }}>audit log</h1>
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,224,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            admin activity history
          </div>
        </div>
        <span style={{ ...S, fontSize: 12, color: 'rgba(254,224,244,0.25)', letterSpacing: '0.06em' }}>
          {filtered.length} {filtered.length !== entries.length ? `/ ${entries.length}` : ''} entries
        </span>
      </div>

      {/* Barra de búsqueda */}
      <div style={{ marginBottom: 12, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(254,224,244,0.25)', pointerEvents: 'none' }}>⌕</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="search by user, action, target…"
          style={{
            ...S, width: '100%', boxSizing: 'border-box',
            padding: '10px 12px 10px 34px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)',
            borderRadius: 10, color: 'var(--text)', fontSize: 12, outline: 'none',
          }}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(254,224,244,0.3)', fontSize: 14 }}>
            ✕
          </button>
        )}
      </div>

      {/* Lista */}
      <div style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(196,20,40,0.12)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,224,244,0.3)', textAlign: 'center', padding: '60px 0', letterSpacing: '0.1em' }}>loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,224,244,0.3)', textAlign: 'center', padding: '60px 0', letterSpacing: '0.1em' }}>
            {query ? 'no results' : 'no audit entries yet'}
          </div>
        ) : (
          filtered.map(e => <AuditRow key={e.id} entry={e} />)
        )}
      </div>
    </div>
  )
}