'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  FanslyLiveState, ScheduledStream, StreamTemplate, BannerStyle, NotifySettings,
} from '@/app/lib/fansly-live'
import { DEBUG_KEY, type DebugMode } from '@/app/components/FanslyLiveBanner'

type Channel = 'discord' | 'bluesky' | 'push'
interface Snapshot { live: FanslyLiveState; channels: Record<Channel, boolean>; subscribers: number }
type Results = Partial<Record<Channel, { ok: boolean; detail: string }>>

// ─── Site-style primitives ───────────────────────────────────────────────────

const mono: React.CSSProperties = { fontFamily: 'var(--font-body)' }
const cardStyle: React.CSSProperties = {
  background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 14,
  padding: '16px 18px', marginBottom: 14, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
}
const fieldStyle: React.CSSProperties = {
  ...mono, width: '100%', padding: '8px 11px', fontSize: 12, color: 'var(--text)',
  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
  borderRadius: 8, outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  ...mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
  color: 'var(--text-muted)', display: 'block', marginBottom: 5,
}
const noteStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--text-muted)',
}

function Btn({ children, onClick, solid, disabled, small, danger }: {
  children: React.ReactNode; onClick: () => void; solid?: boolean; disabled?: boolean; small?: boolean; danger?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      ...mono, cursor: disabled ? 'default' : 'pointer', letterSpacing: '0.05em', color: '#fff',
      fontSize: small ? 10 : 12, padding: small ? '4px 10px' : '8px 16px', borderRadius: 10,
      border: `1px solid ${danger ? 'rgba(248,113,113,0.5)' : 'rgba(var(--primary-rgb),0.5)'}`,
      background: solid ? 'var(--primary)' : danger ? 'rgba(248,113,113,0.1)' : 'rgba(var(--primary-rgb),0.14)',
      opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}

function Tag({ children, on, onClick }: { children: React.ReactNode; on?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      ...mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 11px',
      borderRadius: 999, cursor: onClick ? 'pointer' : 'default', color: on ? 'var(--text)' : 'var(--text-muted)',
      border: `1px solid ${on ? 'rgba(var(--primary-rgb),0.6)' : 'var(--glass-border)'}`,
      background: on ? 'rgba(var(--primary-rgb),0.14)' : 'transparent',
    }}>{children}</button>
  )
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label style={{ ...mono, fontSize: 12, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
      {children}
    </label>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div style={{ ...mono, fontSize: 13, color: 'var(--text)', marginBottom: 12, letterSpacing: '0.04em' }}>{children}</div>
}

// datetime-local needs local time without timezone
function toLocalInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(v: string): string | undefined {
  const d = new Date(v)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

function duration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000))
  return min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : `${min}m`
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FanslyLivePage() {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [redirect, setRedirect] = useState(true)
  const [style, setStyle] = useState<BannerStyle>('compact')
  const [cta, setCta] = useState('')
  const [notify, setNotify] = useState<NotifySettings | null>(null)
  const [schedule, setSchedule] = useState<ScheduledStream[]>([])
  const [templates, setTemplates] = useState<StreamTemplate[]>([])
  const [tplName, setTplName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [debug, setDebug] = useState<DebugMode | null>(null)
  const [, tick] = useState(0)

  const adopt = useCallback((s: Snapshot, keepForm = false) => {
    setSnap(s)
    if (keepForm) return
    const l = s.live
    setTitle(l.title); setUrl(l.url); setRedirect(l.redirectWhenLive); setStyle(l.bannerStyle)
    setCta(l.ctaText); setNotify(l.notify); setSchedule(l.schedule); setTemplates(l.templates)
  }, [])

  useEffect(() => {
    fetch('/api/admin/fansly').then(r => r.ok ? r.json() : null).then((s: Snapshot | null) => { if (s) adopt(s) }).catch(() => {})
    try { const v = localStorage.getItem(DEBUG_KEY); if (v === 'live' || v === 'next' || v === 'offline') setDebug(v) } catch {}
    const id = setInterval(() => tick(n => n + 1), 30_000)
    return () => clearInterval(id)
  }, [adopt])

  async function call(method: 'PATCH' | 'POST', body: Record<string, unknown>, okText: string, keepForm = false) {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/fansly', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json() as Snapshot & { error?: string; notifications?: Results }
      if (!res.ok) { setMsg({ ok: false, text: d.error ?? 'Something went wrong' }); return }
      adopt(d, keepForm)
      const n = d.notifications ? Object.entries(d.notifications).map(([c, r]) => `${c}: ${r.detail}`).join(' · ') : ''
      setMsg({ ok: true, text: n ? `${okText} — ${n}` : okText })
    } catch { setMsg({ ok: false, text: 'Network error' }) } finally { setBusy(false) }
  }

  async function testChannel(channel: Channel) {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/fansly', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test', channel }),
      })
      const d = await res.json() as { result?: { ok: boolean; detail: string }; error?: string }
      setMsg({ ok: !!d.result?.ok, text: `${channel}: ${d.result?.detail ?? d.error ?? 'Failed'}` })
    } catch { setMsg({ ok: false, text: 'Network error' }) } finally { setBusy(false) }
  }

  function setDebugMode(mode: DebugMode | null) {
    setDebug(mode)
    try { mode ? localStorage.setItem(DEBUG_KEY, mode) : localStorage.removeItem(DEBUG_KEY) } catch {}
  }

  const upd = (id: string, p: Partial<ScheduledStream>) => setSchedule(s => s.map(x => x.id === id ? { ...x, ...p } : x))

  if (!snap || !notify) return <div style={{ ...noteStyle }}>loading…</div>
  const { live, channels } = snap
  const hist = live.history
  const avgMs = hist.length ? hist.reduce((a, h) => a + (new Date(h.endedAt).getTime() - new Date(h.startedAt).getTime()), 0) / hist.length : 0
  const last = hist[0]

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: 'var(--text)', fontWeight: 400, marginBottom: 2 }}>fansly live</h1>
      <p style={{ ...noteStyle, marginBottom: 18 }}>
        fansly has no public api, so going live is a switch here (or a scheduled auto-start).
      </p>

      {msg && <div style={{ ...mono, fontSize: 12, marginBottom: 14, color: msg.ok ? '#4ade80' : '#f87171' }}>{msg.ok ? '✓' : '✕'} {msg.text}</div>}

      {/* Live status */}
      <div style={{ ...cardStyle, borderColor: live.isLive ? 'rgba(var(--primary-rgb),0.6)' : 'var(--glass-border)', boxShadow: live.isLive ? '0 0 28px rgba(var(--primary-rgb),0.2)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...mono, fontSize: 14, color: 'var(--text)' }}>{live.isLive ? '● live now' : '○ offline'}</div>
            <div style={noteStyle}>
              {live.isLive && live.liveSince
                ? `${duration(Date.now() - new Date(live.liveSince).getTime())} · ${live.clicks} click${live.clicks !== 1 ? 's' : ''} · peak ${live.peakVisitors} visitor${live.peakVisitors !== 1 ? 's' : ''}${live.autoStarted ? ' · auto-started' : ''}`
                : 'turn on when you start streaming on fansly.'}
            </div>
          </div>
          {live.isLive
            ? <Btn danger disabled={busy} onClick={() => call('POST', { action: 'end' }, 'Stream ended')}>end stream</Btn>
            : <Btn solid disabled={busy} onClick={() => call('POST', { action: 'start', title, url }, 'You are live', true)}>go live</Btn>}
        </div>
      </div>

      {/* Debug */}
      <div style={{ ...cardStyle, borderColor: 'rgba(251,191,36,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Heading>debug mode</Heading>
          <span style={{ ...mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', marginBottom: 12 }}>only you</span>
        </div>
        <div style={{ ...noteStyle, marginBottom: 10 }}>
          preview the banner in this browser. nothing is announced, no clicks are counted, visitors see nothing.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tag on={debug === 'live'} onClick={() => setDebugMode('live')}>live</Tag>
          <Tag on={debug === 'next'} onClick={() => setDebugMode('next')}>next stream</Tag>
          <Tag on={debug === 'offline'} onClick={() => setDebugMode('offline')}>offline</Tag>
          {debug && <Btn small onClick={() => setDebugMode(null)}>stop preview</Btn>}
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ ...mono, fontSize: 11, color: 'var(--pink)', marginLeft: 'auto' }}>open homepage →</a>
        </div>
      </div>

      {/* Stream + banner */}
      <div style={cardStyle}>
        <Heading>stream and banner</Heading>
        <label style={labelStyle}>title (optional)</label>
        <input value={title} maxLength={80} onChange={e => setTitle(e.target.value)} placeholder="late night chill" style={{ ...fieldStyle, marginBottom: 12 }} />
        <label style={labelStyle}>stream link (https://fansly.com/…)</label>
        <input value={url} onChange={e => setUrl(e.target.value)} style={{ ...fieldStyle, marginBottom: 12 }} />

        <label style={labelStyle}>banner style</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Tag on={style === 'compact'} onClick={() => setStyle('compact')}>compact</Tag>
          <Tag on={style === 'card'} onClick={() => setStyle('card')}>card</Tag>
          <Tag on={style === 'bar'} onClick={() => setStyle('bar')}>top bar</Tag>
        </div>
        <label style={labelStyle}>button text</label>
        <input value={cta} maxLength={30} onChange={e => setCta(e.target.value)} placeholder="join the stream" style={{ ...fieldStyle, marginBottom: 12 }} />
        <div style={{ marginBottom: 14 }}>
          <Check checked={redirect} onChange={setRedirect}>fansly links jump straight to the stream while live</Check>
        </div>

        <label style={labelStyle}>templates</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          {templates.map(t => (
            <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Tag onClick={() => { setTitle(t.title); setUrl(t.url) }}>{t.name}</Tag>
              <button type="button" aria-label={`Delete template ${t.name}`} onClick={() => setTemplates(x => x.filter(y => y.id !== t.id))}
                style={{ ...mono, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11 }}>✕</button>
            </span>
          ))}
          <input value={tplName} maxLength={30} onChange={e => setTplName(e.target.value)} placeholder="new template name" style={{ ...fieldStyle, width: 170, padding: '4px 10px', fontSize: 11 }} />
          <Btn small disabled={!tplName.trim()} onClick={() => {
            setTemplates(x => [...x, { id: crypto.randomUUID(), name: tplName.trim(), title, url }].slice(0, 12)); setTplName('')
          }}>+ save current</Btn>
        </div>
        <Btn disabled={busy} onClick={() => call('PATCH', { title, url, redirectWhenLive: redirect, bannerStyle: style, ctaText: cta, templates }, 'Saved', true)}>save</Btn>
      </div>

      {/* Schedule */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Heading>upcoming streams</Heading>
          <Btn small onClick={() => {
            const at = new Date(Date.now() + 24 * 3600_000); at.setMinutes(0, 0, 0)
            setSchedule(s => [...s, { id: crypto.randomUUID(), title: title || 'Live stream', at: at.toISOString() }])
          }}>+ add</Btn>
        </div>
        {schedule.length === 0 && <div style={noteStyle}>nothing scheduled.</div>}
        {schedule.map(s => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) auto auto', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <input value={s.title} maxLength={80} onChange={e => upd(s.id, { title: e.target.value })} style={fieldStyle} aria-label="Stream title" />
            <input type="datetime-local" value={toLocalInput(s.at)} aria-label="Start"
              onChange={e => { const v = fromLocalInput(e.target.value); if (v) upd(s.id, { at: v, done: false }) }} style={fieldStyle} />
            <input type="datetime-local" value={toLocalInput(s.endAt)} aria-label="End (optional)"
              onChange={e => upd(s.id, { endAt: fromLocalInput(e.target.value) })} style={fieldStyle} />
            <Check checked={!!s.autoStart} onChange={v => upd(s.id, { autoStart: v, done: false })}>auto</Check>
            <button type="button" aria-label="Remove stream" onClick={() => setSchedule(x => x.filter(y => y.id !== s.id))}
              style={{ ...mono, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        ))}
        <div style={{ ...noteStyle, margin: '4px 0 12px' }}>
          columns: title · start · end (optional). with “auto”, the live switches on by itself at the start time and off at the end time.
        </div>
        <Btn disabled={busy} onClick={() => call('PATCH', { schedule }, 'Schedule saved', true)}>save schedule</Btn>
      </div>

      {/* Notifications */}
      <div style={cardStyle}>
        <Heading>announce when I go live</Heading>
        {([
          ['discord', 'discord', 'FANSLY_DISCORD_WEBHOOK'],
          ['bluesky', 'bluesky', 'BLUESKY_HANDLE + BLUESKY_APP_PASSWORD'],
          ['push', '"notify me" button', 'VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY'],
        ] as [Channel, string, string][]).map(([ch, name, env]) => (
          <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <Check checked={notify[ch]} onChange={v => setNotify({ ...notify, [ch]: v })}>{name}</Check>
            {channels[ch]
              ? <>
                  <span style={noteStyle}>{ch === 'push' ? `· ${snap.subscribers} subscribed` : '· connected'}</span>
                  <Btn small disabled={busy} onClick={() => testChannel(ch)}>send test</Btn>
                </>
              : <span style={{ ...mono, fontSize: 10, color: '#fbbf24' }}>set {env} in the environment</span>}
          </div>
        ))}
        <label style={{ ...labelStyle, marginTop: 12 }}>message ({'{title}'} and {'{link}'} are replaced)</label>
        <input value={notify.message} maxLength={280} onChange={e => setNotify({ ...notify, message: e.target.value })} style={{ ...fieldStyle, marginBottom: 12 }} />
        <Btn disabled={busy} onClick={() => call('PATCH', { notify }, 'Notifications saved', true)}>save</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          ['clicks, last stream', last ? String(last.clicks) : '—'],
          ['peak visitors', last ? String(last.peakVisitors) : '—'],
          ['avg length', hist.length ? duration(avgMs) : '—'],
          ['streams logged', String(hist.length)],
        ].map(([l, v]) => (
          <div key={l} style={{ ...cardStyle, marginBottom: 0 }}>
            <div style={{ ...labelStyle, marginBottom: 4 }}>{l}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <Heading>history</Heading>
        {hist.length === 0 ? <div style={noteStyle}>finished streams show up here.</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) 1fr 1fr 70px 70px', gap: '6px 10px', ...mono, fontSize: 11 }}>
            {['stream', 'date', 'length', 'clicks', 'peak'].map(h => <span key={h} style={{ ...labelStyle, marginBottom: 0 }}>{h}</span>)}
            {hist.map(h => [
              <span key={h.id + 't'} style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.title}{h.auto ? ' ·auto' : ''}</span>,
              <span key={h.id + 'd'} style={{ color: 'var(--text-muted)' }}>{new Date(h.startedAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>,
              <span key={h.id + 'l'} style={{ color: 'var(--text-muted)' }}>{duration(new Date(h.endedAt).getTime() - new Date(h.startedAt).getTime())}</span>,
              <span key={h.id + 'c'} style={{ color: 'var(--text-muted)' }}>{h.clicks}</span>,
              <span key={h.id + 'p'} style={{ color: 'var(--text-muted)' }}>{h.peakVisitors}</span>,
            ])}
          </div>
        )}
      </div>
    </div>
  )
}
