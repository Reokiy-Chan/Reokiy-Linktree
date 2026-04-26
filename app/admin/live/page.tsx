'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import WorldMapV2 from '../components/WorldMapV2'

interface LiveVisit {
  lat: number; lon: number
  country: string; city: string; page: string; timestamp: string
}
interface StreamData {
  activeLastHour: number; todayTotal: number
  recent: LiveVisit[]; ts: number
}

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.028)', border: '1px solid rgba(196,20,40,0.18)',
      borderRadius: 10, padding: '12px 18px', flex: 1, minWidth: 120,
    }}>
      <div style={{ ...S, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

export default function LivePage() {
  const router = useRouter()
  const [stream, setStream] = useState<StreamData>({ activeLastHour: 0, todayTotal: 0, recent: [], ts: 0 })
  const [feed, setFeed] = useState<LiveVisit[]>([])
  const [liveVisits, setLiveVisits] = useState<LiveVisit[]>([])
  const seenRef = useRef(new Set<string>())

  useEffect(() => {
    const es = new EventSource('/api/admin/stream')
    es.onmessage = e => {
      try {
        const d = JSON.parse(e.data) as StreamData
        setStream(d)
        setLiveVisits(d.recent)
        if (d.recent) {
          for (const v of d.recent) {
            const key = v.timestamp + v.lat + v.lon
            if (!seenRef.current.has(key)) {
              seenRef.current.add(key)
              setFeed(prev => [v, ...prev].slice(0, 20))
            }
          }
        }
      } catch {}
    }
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) router.replace('/admin/login')
    }
    return () => es.close()
  }, [router])

  const ago = (ts: string) => {
    const s = Math.round((Date.now() - new Date(ts).getTime()) / 1000)
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', margin: 0 }}>live</h1>
        <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
          real-time activity
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14, marginBottom: 14 }} className="live-grid">
        <div style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(196,20,40,0.15)', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
          <div style={{ ...S, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)', padding: '14px 16px 0' }}>
            live requests
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'absolute', top: 14, right: 16 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 6px var(--primary)', animation: 'lp 2s ease-in-out infinite' }} />
            <span style={{ ...S, fontSize: 9, color: 'var(--primary)', letterSpacing: '0.1em' }}>LIVE</span>
          </div>
          <WorldMapV2 height={380} showControls liveVisits={liveVisits} />
        </div>

        <div style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(196,20,40,0.15)', borderRadius: 12, padding: '14px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...S, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)', marginBottom: 12 }}>live feed</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {feed.length === 0 ? (
              <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.2)', fontStyle: 'italic' }}>waiting for visits…</div>
            ) : feed.map((v, i) => (
              <div key={v.timestamp + i} style={{
                padding: '7px 0',
                borderBottom: i < feed.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                animation: i === 0 ? 'fi 0.3s ease' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ ...S, fontSize: 10, color: 'var(--text)' }}>{v.city || v.country || '—'}</span>
                  <span style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.28)' }}>{ago(v.timestamp)}</span>
                </div>
                <div style={{ ...S, fontSize: 9, color: 'var(--primary)', marginTop: 1 }}>{v.page}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <StatPill label="Active (1h)" value={stream.activeLastHour} />
        <StatPill label="Visits Today" value={stream.todayTotal} />
        <StatPill label="Last Visit" value={feed[0] ? (feed[0].city || feed[0].country || '—') : '—'} />
        <StatPill label="Last Page" value={feed[0]?.page ?? '—'} />
      </div>

      <style>{`
        @keyframes lp { 0%,100%{opacity:1;box-shadow:0 0 6px var(--primary)} 50%{opacity:0.4;box-shadow:0 0 2px var(--primary)} }
        @keyframes fi { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width: 768px) { .live-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  )
}
