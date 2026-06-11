'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import WorldMapV2 from '../components/WorldMapV2'

interface LiveVisit {
  lat: number; lon: number
  country: string; city: string; page: string; timestamp: string
}
interface PresenceSession {
  sessionId: string; page: string; city: string; country: string
  countryCode: string; lat?: number; lon?: number
  connectedAt: number; lastSeen: number
}
interface LiveEvent {
  type: 'connect' | 'disconnect'
  sessionId: string; city: string; country: string; page: string
  lat?: number; lon?: number; ts: number
}
interface StreamData {
  activeLastHour: number; todayTotal: number
  recent: LiveVisit[]; online?: PresenceSession[]; events?: LiveEvent[]; ts: number
}
interface FeedItem {
  kind: 'visit' | 'connect' | 'disconnect'
  label: string; page: string; ts: number; key: string
}

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.028)', border: `1px solid ${accent ? `${accent}40` : 'rgba(196,20,40,0.18)'}`,
      borderRadius: 10, padding: '12px 18px', flex: 1, minWidth: 120,
    }}>
      <div style={{ ...S, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent ?? 'rgba(196,20,40,0.65)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: accent ?? 'var(--text)', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function ago(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`
}

const FEED_META: Record<FeedItem['kind'], { color: string; icon: string; word: string }> = {
  connect: { color: '#4ade80', icon: '▲', word: 'connected' },
  disconnect: { color: '#f87171', icon: '▼', word: 'disconnected' },
  visit: { color: 'var(--primary)', icon: '◆', word: 'pageview' },
}

export default function LivePage() {
  const router = useRouter()
  const [stream, setStream] = useState<StreamData>({ activeLastHour: 0, todayTotal: 0, recent: [], ts: 0 })
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [liveVisits, setLiveVisits] = useState<LiveVisit[]>([])
  const [online, setOnline] = useState<PresenceSession[]>([])
  const [events, setEvents] = useState<LiveEvent[]>([])
  const seenRef = useRef(new Set<string>())

  useEffect(() => {
    const es = new EventSource('/api/admin/stream')
    es.onmessage = e => {
      try {
        const d = JSON.parse(e.data) as StreamData
        setStream(d)
        setLiveVisits(d.recent)
        setOnline(d.online ?? [])
        if (d.events?.length) setEvents(d.events)

        const added: FeedItem[] = []
        for (const ev of d.events ?? []) {
          const key = `${ev.type}:${ev.sessionId}:${ev.ts}`
          if (seenRef.current.has(key)) continue
          seenRef.current.add(key)
          added.push({ kind: ev.type, label: ev.city || ev.country || 'somewhere', page: ev.page, ts: ev.ts, key })
        }
        for (const v of d.recent ?? []) {
          const key = `visit:${v.timestamp}:${v.lat}:${v.lon}`
          if (seenRef.current.has(key)) continue
          seenRef.current.add(key)
          added.push({ kind: 'visit', label: v.city || v.country || '—', page: v.page, ts: new Date(v.timestamp).getTime(), key })
        }
        if (added.length) {
          added.sort((a, b) => b.ts - a.ts)
          setFeed(prev => [...added, ...prev].slice(0, 30))
        }
        if (seenRef.current.size > 600) {
          seenRef.current = new Set([...seenRef.current].slice(-300))
        }
      } catch { }
    }
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) router.replace('/admin/login')
    }
    return () => es.close()
  }, [router])

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', margin: 0 }}>live</h1>
        <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
          real-time activity
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(196,20,40,0.18)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <span style={{ ...S, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)' }}>live map</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80', animation: 'lp 2s ease-in-out infinite' }} />
              <span style={{ ...S, fontSize: 11, color: '#4ade80', letterSpacing: '0.1em' }}>{online.length} online</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: 'lp 2s ease-in-out infinite' }} />
              <span style={{ ...S, fontSize: 11, color: 'var(--primary)', letterSpacing: '0.1em' }}>live</span>
            </div>
          </div>
        </div>
        {/* Mapa — los controles zoom y toggles van dentro de WorldMapV2 con showControls */}
        <WorldMapV2 height={380} showControls liveVisits={liveVisits} online={online} liveEvents={events} />
      </div>

      <div style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(196,20,40,0.15)', borderRadius: 12, padding: '14px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...S, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)', marginBottom: 12 }}>live feed</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {feed.length === 0 ? (
            <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.2)', fontStyle: 'italic' }}>waiting for visitors…</div>
          ) : feed.map((item, i) => {
            const meta = FEED_META[item.kind]
            return (
              <div key={item.key} style={{
                padding: '7px 0',
                borderBottom: i < feed.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                animation: i === 0 ? 'fi 0.3s ease' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ ...S, fontSize: 12, color: meta.color, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    {meta.icon} {meta.word}
                  </span>
                  <span style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.28)' }}>{ago(item.ts)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 1 }}>
                  <span style={{ ...S, fontSize: 12, color: 'var(--text)' }}>{item.label}</span>
                  <span style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.35)' }}>{item.page}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Online sessions strip */}
  {
    online.length > 0 && (
      <div style={{ background: 'rgba(74,222,128,0.03)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ ...S, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(74,222,128,0.6)', marginBottom: 10 }}>
          online now — {online.length} visitor{online.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {online.map(s => (
            <div key={s.sessionId} style={{
              ...S, fontSize: 12, padding: '4px 12px', borderRadius: 20,
              background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)',
              color: 'rgba(254,240,244,0.7)', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80', display: 'inline-block' }} />
              {s.city || s.country || 'unknown'}
              <span style={{ color: 'rgba(254,240,244,0.3)' }}>·</span>
              <span style={{ color: 'rgba(254,240,244,0.4)' }}>{s.page}</span>
              <span style={{ color: 'rgba(74,222,128,0.5)', fontSize: 12 }}>{ago(s.connectedAt)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <StatPill label="Online now" value={online.length} accent="#4ade80" />
        <StatPill label="Active (1h)" value={stream.activeLastHour} />
        <StatPill label="Visits today" value={stream.todayTotal} />
        <StatPill label="Last seen" value={feed[0] ? feed[0].label : '—'} />
      </div>

      <style>{`
        @keyframes lp { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fi { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width: 768px) { .live-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  )
}
