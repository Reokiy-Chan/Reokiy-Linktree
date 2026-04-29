'use client'

import { useState, useEffect, useRef, use } from 'react'
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: left === 'terminado' ? 'var(--primary)' : '#fbbf24',
        boxShadow: left === 'terminado' ? 'none' : '0 0 8px #fbbf24',
        animation: left !== 'terminado' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
      }} />
      <span style={{ ...S, fontSize: 11, color: left === 'terminado' ? 'var(--primary)' : '#fbbf24', letterSpacing: '0.06em' }}>
        {left}
      </span>
    </div>
  )
}

export default function RafflePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [raffle, setRaffle] = useState<Raffle | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [username, setUsername] = useState('')
  const [entering, setEntering] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [liveCount, setLiveCount] = useState<number | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Initial load
    fetch('/api/raffles')
      .then(r => r.json())
      .then((d: { active?: Raffle[]; ended?: Raffle[] }) => {
        const all = [...(d.active ?? []), ...(d.ended ?? [])]
        const found = all.find(r => r.id === id)
        if (found) { setRaffle(found); setLiveCount(found.entries.length); setLoading(false) }
        else { setNotFound(true); setLoading(false) }
      })
      .catch(() => { setNotFound(true); setLoading(false) })

    // SSE for real-time updates
    const es = new EventSource('/api/raffles/stream')
    esRef.current = es
    es.onmessage = e => {
      try {
        const d = JSON.parse(e.data) as { active: Raffle[]; ended: Raffle[] }
        const all = [...(d.active ?? []), ...(d.ended ?? [])]
        const found = all.find(r => r.id === id)
        if (found) {
          setRaffle(found)
          setLiveCount(found.entries.length)
          if (loading) setLoading(false)
        } else if (!loading) {
          setNotFound(true)
        }
      } catch {}
    }
    es.onerror = () => es.close()
    return () => { es.close(); esRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleEnter = async () => {
    if (!username.trim()) { setMsg({ text: 'Introduce tu username de Discord', ok: false }); return }
    setEntering(true); setMsg(null)
    try {
      const res = await fetch(`/api/raffles/${id}/enter`, {
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

  const isActive = raffle?.status === 'active'
  const alreadyEntered = msg?.ok === true

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <ParticlesBg />
      <div style={{ position: 'fixed', top: '25%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--primary-rgb),0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Back */}
        <button
          onClick={() => router.push('/raffles')}
          style={{ ...S, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(254,240,244,0.3)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 0 32px 0', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(254,240,244,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,240,244,0.3)')}
        >
          ← todos los sorteos
        </button>

        {loading ? (
          <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.3)', textAlign: 'center', padding: '80px 0', letterSpacing: '0.1em' }}>cargando…</div>
        ) : notFound || !raffle ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎲</div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: 'var(--text)', marginBottom: 10 }}>sorteo no encontrado</div>
            <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.08em' }}>este sorteo no existe o ya terminó</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeInUp 0.4s ease both' }}>

            {/* Header card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? 'rgba(196,20,40,0.18)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 20, padding: '26px 26px 22px', position: 'relative', overflow: 'hidden' }}>
              {isActive && (
                <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: 'radial-gradient(circle at top right, rgba(196,20,40,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 30, color: 'var(--text)', lineHeight: 1.2 }}>{raffle.title}</div>
                <span style={{
                  ...S, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px',
                  borderRadius: 20, flexShrink: 0, marginTop: 4,
                  background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: isActive ? '#4ade80' : 'rgba(254,240,244,0.3)',
                }}>
                  {isActive ? '● activo' : '○ terminado'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.45)' }}>
                  <span style={{ color: 'var(--text)', fontSize: 13 }}>{liveCount ?? raffle.entries.length}</span> participante{(liveCount ?? raffle.entries.length) !== 1 ? 's' : ''}
                  {isActive && <span style={{ color: '#4ade80', marginLeft: 4, fontSize: 8 }}>●</span>}
                </span>
                {raffle.prizes.length > 0 && (
                  <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.45)' }}>
                    <span style={{ color: 'rgba(196,20,40,0.9)', fontSize: 13 }}>{raffle.prizes.length}</span> premio{raffle.prizes.length !== 1 ? 's' : ''}
                  </span>
                )}
                {raffle.endsAt && isActive && <Countdown endsAt={raffle.endsAt} />}
                {raffle.endsAt && !isActive && (
                  <span style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.3)' }}>
                    terminó el {new Date(raffle.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {raffle.description && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>descripción</div>
                <div style={{ ...S, fontSize: 13, color: 'rgba(254,240,244,0.7)', lineHeight: 1.8 }}>{raffle.description}</div>
              </div>
            )}

            {/* Prizes */}
            {raffle.prizes.length > 0 && (
              <div style={{ background: 'rgba(196,20,40,0.04)', border: '1px solid rgba(196,20,40,0.14)', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>premios</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {raffle.prizes.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ ...S, fontSize: 10, color: 'var(--primary)', fontWeight: 'bold' }}>{i + 1}</span>
                      </div>
                      <div>
                        <div style={{ ...S, fontSize: 13, color: 'rgba(254,240,244,0.88)' }}>{p.label}</div>
                        {p.description && <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.35)', marginTop: 2 }}>{p.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Winner */}
            {raffle.winnerId && (
              <div style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 16, padding: '20px 22px' }}>
                <div style={{ ...S, fontSize: 8, color: 'rgba(255,215,0,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>🏆 ganador</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 36 }}>🏆</div>
                  <div style={{ ...S, fontSize: 22, color: '#ffd700', letterSpacing: '0.04em' }}>{raffle.winnerId}</div>
                </div>
                {raffle.pickedAt && (
                  <div style={{ ...S, fontSize: 9, color: 'rgba(255,215,0,0.4)', marginTop: 8 }}>
                    elegido el {new Date(raffle.pickedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            )}

            {/* Participation form */}
            {isActive && !alreadyEntered && (
              <div style={{ background: 'rgba(196,20,40,0.05)', border: '1px solid rgba(196,20,40,0.22)', borderRadius: 16, padding: '22px 20px' }}>
                <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>participar</div>
                <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.32)', marginBottom: 16, lineHeight: 1.6 }}>
                  Introduce tu username de Discord exactamente como aparece en tu perfil.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={username}
                    onChange={e => { setUsername(e.target.value); setMsg(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') handleEnter() }}
                    placeholder="tu username de Discord"
                    style={{
                      ...S, flex: 1, padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)',
                      borderRadius: 10, color: 'var(--text)', fontSize: 13, outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleEnter}
                    disabled={entering}
                    style={{
                      ...S, padding: '12px 22px', borderRadius: 10, cursor: entering ? 'not-allowed' : 'pointer',
                      background: entering ? 'rgba(196,20,40,0.08)' : 'rgba(196,20,40,0.22)',
                      border: '1px solid rgba(196,20,40,0.4)',
                      color: entering ? 'var(--text-muted)' : 'var(--text)', fontSize: 12,
                      whiteSpace: 'nowrap', letterSpacing: '0.06em', transition: 'all 0.2s',
                    }}
                  >
                    {entering ? '…' : '🎲 entrar'}
                  </button>
                </div>
                {msg && (
                  <div style={{ ...S, fontSize: 11, marginTop: 10, color: msg.ok ? '#4ade80' : 'var(--primary)', letterSpacing: '0.04em' }}>
                    {msg.ok ? '✓ ' : '⚠ '}{msg.text}
                  </div>
                )}
              </div>
            )}

            {/* Already entered success */}
            {alreadyEntered && (
              <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 16, padding: '28px 20px', textAlign: 'center', animation: 'fadeInUp 0.4s ease both' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🎲</div>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: '#4ade80', marginBottom: 8 }}>¡ya estás participando!</div>
                <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.08em' }}>suerte en el sorteo ✦</div>
              </div>
            )}

            {/* Participants list (shown when ended) */}
            {!isActive && raffle.entries.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                  participantes ({raffle.entries.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 240, overflowY: 'auto' }}>
                  {raffle.entries.map((e, i) => (
                    <div key={i} style={{
                      ...S, fontSize: 12, padding: '9px 14px',
                      background: e.discordUsername === raffle.winnerId ? 'rgba(255,215,0,0.07)' : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${e.discordUsername === raffle.winnerId ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 9, color: e.discordUsername === raffle.winnerId ? '#ffd700' : 'var(--text)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span>{e.discordUsername === raffle.winnerId ? '🏆 ' : ''}{e.discordUsername}</span>
                      <span style={{ fontSize: 9, color: 'rgba(254,240,244,0.2)' }}>
                        {new Date(e.enteredAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active participants preview */}
            {isActive && raffle.entries.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'pulse-dot 2s ease-in-out infinite' }} />
                  <span style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {raffle.entries.length} participando ahora
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {raffle.entries.slice(-12).map((e, i) => (
                    <span key={i} style={{ ...S, fontSize: 9, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(254,240,244,0.45)' }}>
                      {e.discordUsername}
                    </span>
                  ))}
                  {raffle.entries.length > 12 && (
                    <span style={{ ...S, fontSize: 9, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(254,240,244,0.25)' }}>
                      +{raffle.entries.length - 12} más
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.4; transform:scale(0.7) } }
      `}</style>
    </main>
  )
}