'use client'

import { useEffect, useState } from 'react'

export type BannerStyle = 'compact' | 'card' | 'bar'
export type DebugMode = 'live' | 'next' | 'offline'

export const DEBUG_KEY = 'fansly_debug'

export interface FanslyLiveStatus {
  isLive: boolean
  title: string
  url: string
  redirectWhenLive: boolean
  bannerStyle: BannerStyle
  ctaText: string
  liveSince: string | null
  schedule: { id: string; title: string; at: string }[]
  pushKey: string | null
  debug?: boolean
}

const POLL_MS = 30_000

function readDebug(): DebugMode | null {
  try {
    const v = localStorage.getItem(DEBUG_KEY)
    return v === 'live' || v === 'next' || v === 'offline' ? v : null
  } catch { return null }
}

/** Admin "test live": swaps the real status for a fake one, in this browser only. */
function applyDebug(real: FanslyLiveStatus, mode: DebugMode): FanslyLiveStatus {
  const base = { ...real, debug: true, pushKey: null }
  if (mode === 'live') {
    return { ...base, isLive: true, title: real.title || 'Debug stream', liveSince: new Date(Date.now() - 42 * 60_000).toISOString() }
  }
  if (mode === 'next') {
    return { ...base, isLive: false, schedule: [{ id: 'debug', title: 'Debug stream', at: new Date(Date.now() + 28 * 3600_000).toISOString() }] }
  }
  return { ...base, isLive: false, schedule: [] }
}

const FALLBACK: FanslyLiveStatus = {
  isLive: false, title: '', url: 'https://fansly.com/Reokiy/live', redirectWhenLive: false,
  bannerStyle: 'compact', ctaText: 'join the stream', liveSince: null, schedule: [], pushKey: null,
}

/** Polls the public live status. Failures keep the last known value. */
export function useFanslyLive(): FanslyLiveStatus | null {
  const [real, setReal] = useState<FanslyLiveStatus | null>(null)
  const [debug, setDebug] = useState<DebugMode | null>(null)

  useEffect(() => {
    let alive = true
    const load = () => fetch('/api/fansly', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: FanslyLiveStatus) => { if (alive) setReal(d) })
      .catch(() => {})
    load()
    const id = setInterval(() => { if (!document.hidden) load() }, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])

  useEffect(() => {
    setDebug(readDebug())
    const onStorage = (e: StorageEvent) => { if (e.key === DEBUG_KEY || e.key === null) setDebug(readDebug()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (debug) return applyDebug(real ?? FALLBACK, debug)
  return real
}

/** Counts a click on the live banner. Debug previews are never counted. */
export function trackLiveClick(status: FanslyLiveStatus | null) {
  if (status?.debug) return
  try { navigator.sendBeacon('/api/fansly/click') } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function formatCountdown(diff: number): string {
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function formatElapsed(since: string | null, now: number): string {
  if (!since) return ''
  const min = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000))
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`
}

const DebugTag = () => (
  <span style={{
    fontFamily: 'var(--font-body)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '2px 7px', borderRadius: 999, color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)',
    marginLeft: 8, verticalAlign: 'middle',
  }}>debug</span>
)

const liveBox: React.CSSProperties = {
  background: 'rgba(var(--primary-rgb),0.1)',
  border: '1px solid rgba(var(--primary-rgb),0.55)',
  boxShadow: '0 0 28px rgba(var(--primary-rgb),0.22)',
  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  animation: 'fadeInUp 0.5s ease both',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text)', letterSpacing: '0.08em', textTransform: 'lowercase',
}
const subStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--text-muted)',
}
const dotStyle: React.CSSProperties = {
  width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0,
  boxShadow: '0 0 10px var(--primary)', animation: 'pulse-dot 1.6s ease-in-out infinite',
}

// ─── Live banner (three styles) ──────────────────────────────────────────────

function LiveBanner({ status }: { status: FanslyLiveStatus }) {
  const now = useNow(30_000)
  const elapsed = formatElapsed(status.liveSince, now)
  const detail = [status.title, elapsed].filter(Boolean).join(' · ')
  const cta = status.ctaText || 'join the stream'
  const common = {
    href: status.url, target: '_blank', rel: 'noopener noreferrer',
    onClick: () => trackLiveClick(status), 'aria-label': `Live on Fansly. ${cta}`,
  } as const

  if (status.bannerStyle === 'bar') {
    return (
      <a {...common} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', marginBottom: 16, padding: '9px 14px', borderRadius: 12, textDecoration: 'none',
        background: 'rgba(var(--primary-rgb),0.85)', boxShadow: '0 0 24px rgba(var(--primary-rgb),0.3)',
        fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', color: '#fff',
        animation: 'fadeInUp 0.5s ease both',
      }}>
        <span style={{ ...dotStyle, background: '#fff', boxShadow: '0 0 8px #fff' }} />
        live now · tap to watch{status.debug && <DebugTag />}
      </a>
    )
  }

  if (status.bannerStyle === 'card') {
    return (
      <a {...common} style={{
        display: 'block', width: '100%', marginBottom: 16, padding: '16px 14px', borderRadius: 16,
        textAlign: 'center', textDecoration: 'none', ...liveBox,
      }}>
        <div style={{ ...labelStyle, fontSize: 11, letterSpacing: '0.1em' }}>live on fansly{status.debug && <DebugTag />}</div>
        {detail && <div style={{ ...subStyle, margin: '2px 0 12px' }}>{detail}</div>}
        <span style={{
          display: 'inline-block', padding: '8px 18px', borderRadius: 10, background: 'var(--primary)',
          fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '0.05em', color: '#fff',
          boxShadow: '0 4px 18px var(--primary-glow)',
        }}>{cta}</span>
      </a>
    )
  }

  return (
    <a {...common} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 16,
      padding: '13px 16px', borderRadius: 14, textDecoration: 'none', ...liveBox,
    }}>
      <span style={dotStyle} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={labelStyle}>live now on fansly{status.debug && <DebugTag />}</div>
        {detail && <div style={{ ...subStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>}
      </div>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--pink)' }}>{cta} →</span>
    </a>
  )
}

// ─── "Notify me" (Web Push) ──────────────────────────────────────────────────

function urlBase64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const padded = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function NotifyButton({ pushKey }: { pushKey: string }) {
  const [supported, setSupported] = useState(false)
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    setSupported(true)
    navigator.serviceWorker.getRegistration('/fansly-sw.js')
      .then(reg => reg?.pushManager.getSubscription())
      .then(sub => setOn(!!sub))
      .catch(() => {})
  }, [])

  if (!supported) return null

  async function toggle() {
    setBusy(true); setDenied(false)
    try {
      const reg = await navigator.serviceWorker.register('/fansly-sw.js')
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await fetch('/api/fansly/push', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        })
        await existing.unsubscribe()
        setOn(false)
        return
      }
      if ((await Notification.requestPermission()) !== 'granted') { setDenied(true); return }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(pushKey) })
      const res = await fetch('/api/fansly/push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (!res.ok) { await sub.unsubscribe(); return }
      setOn(true)
    } catch {} finally { setBusy(false) }
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} style={{
      fontFamily: 'var(--font-body)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '5px 10px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
      border: `1px solid ${on ? 'rgba(var(--primary-rgb),0.6)' : 'var(--glass-border)'}`,
      background: on ? 'rgba(var(--primary-rgb),0.14)' : 'transparent',
      color: denied ? '#fbbf24' : on ? 'var(--text)' : 'var(--text-muted)',
    }}>
      {denied ? 'blocked in browser' : on ? 'notifying you ✓' : 'notify me'}
    </button>
  )
}

// ─── Next stream ─────────────────────────────────────────────────────────────

function NextBanner({ status }: { status: FanslyLiveStatus }) {
  const now = useNow(1000)
  const next = status.schedule.find(s => new Date(s.at).getTime() > now)
  if (!next) return null
  const diff = new Date(next.at).getTime() - now
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 16,
      padding: '11px 16px', borderRadius: 14,
      background: 'var(--glass)', border: '1px solid var(--glass-border)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      animation: 'fadeInUp 0.5s ease both',
    }}>
      <span style={{ fontSize: 16, color: 'var(--pink)' }} aria-hidden>▶</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={labelStyle}>next live · {next.title}{status.debug && <DebugTag />}</div>
        <div style={subStyle}>
          {new Date(next.at).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · in {formatCountdown(diff)}
        </div>
      </div>
      {status.pushKey && <NotifyButton pushKey={status.pushKey} />}
    </div>
  )
}

export default function FanslyLiveBanner({ status }: { status: FanslyLiveStatus | null }) {
  if (!status) return null
  return status.isLive ? <LiveBanner status={status} /> : <NextBanner status={status} />
}
