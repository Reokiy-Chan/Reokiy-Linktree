'use client'

import { useState, useEffect, useRef } from 'react'
import type { Raffle } from '@/app/lib/raffles'

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
  return <span style={{ ...S, fontSize: 9, color: left === 'terminado' ? 'var(--primary)' : 'rgba(254,240,244,0.5)' }}>⏱ {left}</span>
}

function RaffleDetail({ raffle, onBack }: { raffle: Raffle; onBack: () => void }) {
  const [username, setUsername] = useState('')
  const [entering, setEntering] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const isActive = raffle.status === 'active'

  const handleEnter = async () => {
    if (!username.trim()) { setMsg({ text: 'Introduce tu username de Discord', ok: false }); return }
    setEntering(true); setMsg(null)
    try {
      const res = await fetch(`/api/raffles/${raffle.id}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordUsername: username.trim() }),
      })
      const data = await res.json()
      setMsg({ text: res.ok ? '¡Participando! Suerte 🎲' : (data.error ?? 'Error'), ok: res.ok })
    } catch {
      setMsg({ text: 'Error de conexión', ok: false })
    }
    setEntering(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button onClick={onBack} style={{ ...S, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(254,240,244,0.4)', fontSize: 10, letterSpacing: '0.08em', padding: '0 0 18px 0', textTransform: 'uppercase' }}>
        ← todos los sorteos
      </button>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--text)', lineHeight: 1.2 }}>{raffle.title}</div>
            <span style={{ ...S, fontSize: 7, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 9px', borderRadius: 20, flexShrink: 0, marginTop: 3, background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: isActive ? '#4ade80' : 'rgba(254,240,244,0.3)' }}>{isActive ? '● activo' : '○ terminado'}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.3)' }}>{raffle.entries.length} participante{raffle.entries.length !== 1 ? 's' : ''}</span>
            {raffle.endsAt && isActive && <Countdown endsAt={raffle.endsAt} />}
            {raffle.endsAt && !isActive && <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.3)' }}>Terminó {new Date(raffle.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>}
          </div>
        </div>

        {raffle.description && (
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.6)', lineHeight: 1.7, background: 'rgba(255,255,255,0.025)', borderRadius: 10, padding: '13px 15px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {raffle.description}
          </div>
        )}

        {raffle.prizes.length > 0 && (
          <div>
            <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>premios</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {raffle.prizes.map((p, i) => (
                <span key={p.id} style={{ ...S, fontSize: 11, padding: '5px 13px', borderRadius: 20, background: 'rgba(196,20,40,0.12)', border: '1px solid rgba(196,20,40,0.28)', color: 'rgba(254,240,244,0.8)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: 'var(--primary)', fontSize: 9 }}>{i + 1}.</span>{p.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {raffle.winnerId && (
          <div style={{ background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.22)', borderRadius: 12, padding: '13px 15px' }}>
            <div style={{ ...S, fontSize: 8, color: 'rgba(255,215,0,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>ganador</div>
            <div style={{ ...S, fontSize: 15, color: '#ffd700' }}>🏆 {raffle.winnerId}</div>
          </div>
        )}

        {!isActive && raffle.entries.length > 0 && (
          <div>
            <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>participantes ({raffle.entries.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
              {raffle.entries.map((e, i) => (
                <div key={i} style={{ ...S, fontSize: 11, padding: '7px 12px', background: e.discordUsername === raffle.winnerId ? 'rgba(255,215,0,0.07)' : 'rgba(255,255,255,0.025)', border: `1px solid ${e.discordUsername === raffle.winnerId ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 8, color: e.discordUsername === raffle.winnerId ? '#ffd700' : 'var(--text)' }}>
                  {e.discordUsername === raffle.winnerId ? '🏆 ' : ''}{e.discordUsername}
                </div>
              ))}
            </div>
          </div>
        )}

        {isActive && (
          <div style={{ background: 'rgba(196,20,40,0.05)', border: '1px solid rgba(196,20,40,0.2)', borderRadius: 12, padding: '15px' }}>
            <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>participar</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={username} onChange={e => { setUsername(e.target.value); setMsg(null) }} onKeyDown={e => { if (e.key === 'Enter') handleEnter() }} placeholder="tu username de Discord" style={{ ...S, flex: 1, padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)', borderRadius: 8, color: 'var(--text)', fontSize: 12, outline: 'none' }} />
              <button onClick={handleEnter} disabled={entering} style={{ ...S, padding: '9px 16px', borderRadius: 8, cursor: entering ? 'not-allowed' : 'pointer', background: entering ? 'rgba(196,20,40,0.08)' : 'rgba(196,20,40,0.22)', border: '1px solid rgba(196,20,40,0.4)', color: entering ? 'var(--text-muted)' : 'var(--text)', fontSize: 11, whiteSpace: 'nowrap' }}>
                {entering ? '…' : '🎲 entrar'}
              </button>
            </div>
            {msg && <div style={{ ...S, fontSize: 10, marginTop: 8, color: msg.ok ? '#4ade80' : 'var(--primary)' }}>{msg.ok ? '✓ ' : '⚠ '}{msg.text}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function RaffleCard({ raffle, onClick }: { raffle: Raffle; onClick: () => void }) {
  const isActive = raffle.status === 'active'
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <div
        style={{ background: isActive ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.015)', border: `1px solid ${isActive ? 'rgba(196,20,40,0.22)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 13, padding: '13px 15px', transition: 'all 0.15s', opacity: isActive ? 1 : 0.65 }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = isActive ? 'rgba(196,20,40,0.08)' : 'rgba(255,255,255,0.03)'; el.style.borderColor = isActive ? 'rgba(196,20,40,0.38)' : 'rgba(255,255,255,0.1)' }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = isActive ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.015)'; el.style.borderColor = isActive ? 'rgba(196,20,40,0.22)' : 'rgba(255,255,255,0.06)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, color: 'var(--text)', lineHeight: 1.2 }}>{raffle.title}</div>
          <span style={{ ...S, fontSize: 7, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, flexShrink: 0, marginTop: 2, background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: isActive ? '#4ade80' : 'rgba(254,240,244,0.3)' }}>{isActive ? '● activo' : '○ terminado'}</span>
        </div>
        {raffle.description && (
          <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.4)', lineHeight: 1.5, marginBottom: 7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{raffle.description}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.28)' }}>{raffle.entries.length} participante{raffle.entries.length !== 1 ? 's' : ''}</span>
            {raffle.prizes.length > 0 && <span style={{ ...S, fontSize: 9, color: 'rgba(196,20,40,0.6)' }}>{raffle.prizes.length} premio{raffle.prizes.length !== 1 ? 's' : ''}</span>}
            {isActive && raffle.endsAt && <Countdown endsAt={raffle.endsAt} />}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {raffle.winnerId && !isActive && <span style={{ ...S, fontSize: 9, color: '#ffd700' }}>🏆 {raffle.winnerId}</span>}
            <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.2)' }}>ver →</span>
          </div>
        </div>
      </div>
    </button>
  )
}

interface RafflePopupProps { open: boolean; onClose: () => void }

export default function RafflePopup({ open, onClose }: RafflePopupProps) {
  const [tab, setTab] = useState<'active' | 'ended'>('active')
  const [raffles, setRaffles] = useState<{ active: Raffle[]; ended: Raffle[] }>({ active: [], ended: [] })
  const [selected, setSelected] = useState<Raffle | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!open) { esRef.current?.close(); esRef.current = null; return }
    const es = new EventSource('/api/raffles/stream')
    esRef.current = es
    es.onmessage = e => {
      try {
        const d = JSON.parse(e.data) as { active: Raffle[]; ended: Raffle[] }
        const next = { active: d.active ?? [], ended: d.ended ?? [] }
        setRaffles(next)
        setSelected(prev => {
          if (!prev) return null
          return [...next.active, ...next.ended].find(r => r.id === prev.id) ?? prev
        })
      } catch {}
    }
    es.onerror = () => { es.close() }
    return () => { es.close(); esRef.current = null }
  }, [open])

  if (!open) return null

  const displayed = tab === 'active' ? raffles.active : raffles.ended

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(5,0,7,0.8)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) { setSelected(null); onClose() } }}
    >
      <div style={{ width: '100%', maxWidth: 520, background: 'linear-gradient(180deg, rgba(14,0,22,0.99) 0%, rgba(10,0,16,0.99) 100%)', border: '1px solid rgba(196,20,40,0.2)', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: '16px 20px 36px', maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(196,20,40,0.1)', animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 21, color: 'var(--text)', lineHeight: 1 }}>sorteos</div>
            {!selected && <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>gana premios exclusivos</div>}
          </div>
          <button onClick={() => { setSelected(null); onClose() }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 13, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {selected ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <RaffleDetail raffle={selected} onBack={() => setSelected(null)} />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: 3, marginBottom: 12 }}>
              {(['active', 'ended'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ ...S, flex: 1, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 0', borderRadius: 7, cursor: 'pointer', border: 'none', background: tab === t ? 'rgba(196,20,40,0.22)' : 'transparent', color: tab === t ? 'var(--text)' : 'rgba(254,240,244,0.3)', transition: 'all 0.15s' }}>
                  {t === 'active' ? 'activos' : 'terminados'} {(t === 'active' ? raffles.active : raffles.ended).length > 0 && `(${(t === 'active' ? raffles.active : raffles.ended).length})`}
                </button>
              ))}
            </div>

            {tab === 'active' && raffles.active.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'pulse-dot 2s ease-in-out infinite' }} />
                <span style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>en vivo</span>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displayed.length === 0 ? (
                <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.2)', textAlign: 'center', padding: '36px 0', letterSpacing: '0.08em' }}>
                  {tab === 'active' ? 'No hay sorteos activos ahora' : 'No hay sorteos terminados'}
                </div>
              ) : displayed.map(r => (
                <RaffleCard key={r.id} raffle={r} onClick={() => setSelected(r)} />
              ))}
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity:0.6 } to { transform: translateY(0); opacity:1 } }
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.4; transform:scale(0.75) } }
      `}</style>
    </div>
  )
}