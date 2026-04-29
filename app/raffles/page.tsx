'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Raffle } from '@/app/lib/raffles'
import ParticlesBg from '@/app/components/ParticlesBg'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

function Countdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState('')
  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setLeft('terminado'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (d > 0) setLeft(`${d}d ${h}h ${m}m`)
      else if (h > 0) setLeft(`${h}h ${m}m ${s}s`)
      else setLeft(`${m}m ${s}s`)
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [endsAt])
  return (
    <span style={{ ...S, fontSize: 9, color: left === 'terminado' ? 'var(--primary)' : '#fbbf24', display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: left === 'terminado' ? 'var(--primary)' : '#fbbf24', boxShadow: left !== 'terminado' ? '0 0 6px #fbbf24' : 'none', display: 'inline-block', animation: left !== 'terminado' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none' }} />
      {left}
    </span>
  )
}

function RaffleCard({ raffle }: { raffle: Raffle }) {
  const router = useRouter()
  const isActive = raffle.status === 'active'
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => router.push(`/raffles/${raffle.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        animation: 'fadeInUp 0.4s ease both',
      }}
    >
      <div style={{
        background: hovered
          ? (isActive ? 'rgba(196,20,40,0.08)' : 'rgba(255,255,255,0.04)')
          : (isActive ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)'),
        border: `1px solid ${hovered
          ? (isActive ? 'rgba(196,20,40,0.4)' : 'rgba(255,255,255,0.12)')
          : (isActive ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.06)')}`,
        borderRadius: 16,
        padding: '20px 22px',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        opacity: isActive ? 1 : 0.6,
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered && isActive ? '0 8px 32px rgba(196,20,40,0.1)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow accent */}
        {isActive && (
          <div style={{
            position: 'absolute', top: 0, right: 0, width: 120, height: 120,
            background: 'radial-gradient(circle at top right, rgba(196,20,40,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--text)', lineHeight: 1.2 }}>
            {raffle.title}
          </div>
          <span style={{
            ...S, fontSize: 7, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px',
            borderRadius: 20, flexShrink: 0, marginTop: 3,
            background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: isActive ? '#4ade80' : 'rgba(254,240,244,0.3)',
          }}>
            {isActive ? '● active' : '○ completed'}
          </span>
        </div>

        {raffle.description && (
          <div style={{
            ...S, fontSize: 11, color: 'rgba(254,240,244,0.45)', lineHeight: 1.6, marginBottom: 14,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {raffle.description}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.3)' }}>
              <span style={{ color: 'rgba(254,240,244,0.7)' }}>{raffle.entries.length}</span> participant{raffle.entries.length !== 1 ? 's' : ''}
            </span>
            {raffle.prizes.length > 0 && (
              <span style={{ ...S, fontSize: 9, color: 'rgba(196,20,40,0.7)' }}>
                🎁 {raffle.prizes.length} reward{raffle.prizes.length !== 1 ? 's' : ''}
              </span>
            )}
            {isActive && raffle.endsAt && <Countdown endsAt={raffle.endsAt} />}
            {!isActive && raffle.endsAt && (
              <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.25)' }}>
                ended {new Date(raffle.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {raffle.winnerId && (
              <span style={{ ...S, fontSize: 9, color: '#ffd700' }}>🏆 {raffle.winnerId}</span>
            )}
            <span style={{ ...S, fontSize: 9, color: hovered ? 'rgba(196,20,40,0.8)' : 'rgba(254,240,244,0.2)', transition: 'color 0.2s', letterSpacing: '0.06em' }}>
              see →
            </span>
          </div>
        </div>

        {/* Prize pills */}
        {raffle.prizes.length > 0 && raffle.prizes.length <= 4 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
            {raffle.prizes.map((p, i) => (
              <span key={p.id} style={{
                ...S, fontSize: 9, padding: '3px 10px', borderRadius: 20,
                background: 'rgba(196,20,40,0.1)', border: '1px solid rgba(196,20,40,0.22)',
                color: 'rgba(254,240,244,0.65)', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ color: 'var(--primary)', fontSize: 8 }}>{i + 1}.</span>{p.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

export default function RafflesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'active' | 'ended'>('active')
  const [raffles, setRaffles] = useState<{ active: Raffle[]; ended: Raffle[] }>({ active: [], ended: [] })
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Initial load
    fetch('/api/raffles')
      .then(r => r.json())
      .then((d: { active?: Raffle[]; ended?: Raffle[] }) => {
        setRaffles({ active: d.active ?? [], ended: d.ended ?? [] })
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // SSE real-time
    const es = new EventSource('/api/raffles/stream')
    esRef.current = es
    es.onopen = () => setConnected(true)
    es.onmessage = e => {
      try {
        const d = JSON.parse(e.data) as { active: Raffle[]; ended: Raffle[] }
        setRaffles({ active: d.active ?? [], ended: d.ended ?? [] })
        setLoading(false)
        setConnected(true)
      } catch {}
    }
    es.onerror = () => { setConnected(false); es.close() }
    return () => { es.close(); esRef.current = null }
  }, [])

  const displayed = tab === 'active' ? raffles.active : raffles.ended
  const hasActive = raffles.active.length > 0

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <ParticlesBg />

      {/* Ambient glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--primary-rgb),0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Back */}
        <button
          onClick={() => router.push('/')}
          style={{ ...S, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(254,240,244,0.3)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 0 32px 0', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(254,240,244,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,240,244,0.3)')}
        >
          ← Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 36, color: 'var(--text)', lineHeight: 1 }}>
              Giveaways
            </div>
            {connected && hasActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'pulse-dot 2s ease-in-out infinite' }} />
                <span style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>on live</span>
              </div>
            )}
          </div>
          <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.08em' }}>
            win exclusive rewards here
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 11, padding: 3, marginBottom: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
          {(['active', 'ended'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...S, flex: 1, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '9px 0', borderRadius: 9, cursor: 'pointer', border: 'none',
                background: tab === t ? 'rgba(196,20,40,0.22)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'rgba(254,240,244,0.3)',
                transition: 'all 0.15s',
                boxShadow: tab === t ? 'inset 0 0 0 1px rgba(196,20,40,0.3)' : 'none',
              }}
            >
              {t === 'active' ? 'active' : 'completed'}
              {(t === 'active' ? raffles.active : raffles.ended).length > 0 && (
                <span style={{
                  marginLeft: 6, padding: '1px 6px', borderRadius: 10,
                  background: tab === t ? 'rgba(196,20,40,0.3)' : 'rgba(255,255,255,0.06)',
                  fontSize: 8,
                }}>
                  {(t === 'active' ? raffles.active : raffles.ended).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.25)', textAlign: 'center', padding: '60px 0', letterSpacing: '0.1em' }}>
            cargando…
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(196,20,40,0.15)', borderRadius: 16, padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎲</div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'rgba(254,240,244,0.4)', marginBottom: 6 }}>
              {tab === 'active' ? 'there is no active giveaways' : 'there is not ended giveaways... yet'}
            </div>
            <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.2)', letterSpacing: '0.08em' }}>
              {tab === 'active' ? 'maybe you could come check soon' : 'they can appear at any moment...'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayed.map((r, i) => (
              <div key={r.id} style={{ animationDelay: `${i * 0.06}s` }}>
                <RaffleCard raffle={r} />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.4; transform:scale(0.75) } }
      `}</style>
    </main>
  )
}