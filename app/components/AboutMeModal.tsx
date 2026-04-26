'use client'

import { useEffect, useCallback, useState } from 'react'

const STICKER_CYCLE = [1, 2, 3, 4, 5, 6]

const GAMES = [
  { emoji: '🌐', name: 'VRChat', note: 'my cozy home' },
  { emoji: '⚔️', name: 'Outlast Trials', note: 'unhinged' },
  { emoji: '🏝️', name: 'Terraria', note: 'its cool' },
  { emoji: '🧱', name: 'Unity', note: '+200 avis, 3 worlds' },
  { emoji: '🌸', name: '7 Days To Die', note: 'i love my basy' },
]

const FACTS = [
  '🌙 gooning final boss',
  '🎧 always with music',
  '🩷 elf supremacy',
  '☕ caffeine dependent',
  '🌸 world collectionist',
  '✨ silly gremlin',
  '😭 laughs at problems',
  '🔞 lewd content maker',
]

const TIMELINE = [
  { year: '2020', text: 'Started with Koikatsu NSFW art' },
  { year: '2022', text: 'Found VRChat & started pics' },
  { year: '2024', text: 'Pornhub debut, first followers' },
  { year: 'now', text: 'X, Bluesky & Fansly focused' },
]

const WHAT_I_DO = [
  { icon: '🌐', label: 'VRChat content' },
  { icon: '📸', label: 'lewdpics' },
  { icon: '💬', label: 'discord yapping' },
  { icon: '🔞', label: 'fansly 18+' },
]

/* ── glass tile ─────────────────────────────────────────── */
function Tile({
  children, style, delay = 0, glow,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  delay?: number
  glow?: string
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.045)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20,
      padding: '18px 20px',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,0.14)',
        'inset 0 -1px 0 rgba(0,0,0,0.08)',
        glow ? `0 0 28px ${glow}` : '',
        '0 4px 24px rgba(0,0,0,0.3)',
      ].filter(Boolean).join(','),
      animation: `tile-in 0.45s cubic-bezier(0.34,1.2,0.64,1) ${delay}s both, tile-float ${3.5 + delay * 2}s ease-in-out ${delay * 0.5}s infinite`,
      ...style,
    }}>
      {children}
    </div>
  )
}

function TileLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)',
      fontSize: 8,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'rgba(var(--primary-rgb),0.7)',
      marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

/* ── modal ──────────────────────────────────────────────── */
export default function AboutMeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stickerIdx, setStickerIdx] = useState(0)

  useEffect(() => {
    if (!open) return
    const t = setInterval(() => setStickerIdx(i => (i + 1) % STICKER_CYCLE.length), 1200)
    return () => clearInterval(t)
  }, [open])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, handleKey])

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes tile-in {
          from { opacity:0; transform:translateY(18px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes tile-float {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-4px); }
        }
        @keyframes modal-in {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes panel-in {
          from { opacity:0; transform:translate(-50%,-48%) scale(0.94); }
          to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
        }
        .fact-chip:hover {
          background: rgba(var(--primary-rgb),0.15) !important;
          border-color: rgba(var(--primary-rgb),0.4) !important;
          color: var(--pink) !important;
        }
        .game-row:hover { background: rgba(255,255,255,0.05) !important; }

        @media (max-width: 680px) {
          .bento-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto !important;
          }
          .bento-bio   { grid-column: 1 !important; grid-row: auto !important; }
          .bento-games { grid-column: 1 !important; grid-row: auto !important; }
          .bento-what  { grid-column: 1 !important; grid-row: auto !important; }
          .bento-facts { grid-column: 1 !important; grid-row: auto !important; }
          .bento-time  { grid-column: 1 !important; grid-row: auto !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: 'rgba(2,0,5,0.82)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          animation: 'modal-in 0.3s ease forwards',
        }}
      />

      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          zIndex: 3001,
          width: 'min(860px, 95vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'panel-in 0.4s cubic-bezier(0.34,1.1,0.64,1) forwards',
          padding: '4px',
        }}
      >
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 4px 14px',
        }}>
          {/* Sticker row + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {STICKER_CYCLE.map((v, i) => (
              <img
                key={v}
                src={`/emojis/reokichan 28 ${v}.png`}
                alt=""
                style={{
                  width: 22, height: 22, objectFit: 'contain',
                  opacity: stickerIdx === i ? 1 : 0.2,
                  transform: stickerIdx === i ? 'scale(1.4) translateY(-2px)' : 'scale(1)',
                  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  filter: stickerIdx === i ? 'drop-shadow(0 0 6px rgba(var(--pink-rgb),0.7))' : 'none',
                }}
              />
            ))}
            <span style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 15, color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.1em', marginLeft: 6,
            }}>
              about reokiy
            </span>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Bento grid */}
        <div
          className="bento-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gridTemplateRows: 'auto auto auto',
            gap: 10,
          }}
        >

          {/* ── BIO ── */}
          <Tile
            delay={0}
            glow="rgba(var(--primary-rgb),0.1)"
            style={{ gridColumn: '1', gridRow: '1 / 3' } as React.CSSProperties}
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
              <TileLabel>who i am</TileLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(var(--primary-rgb),0.12)',
                  border: '1.5px solid rgba(var(--primary-rgb),0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <img src="/images/logo.png" alt="reokiy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--text)', lineHeight: 1 }}>
                    Reokiy
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 4 }}>
                    also known as Lucy • 21
                  </div>
                </div>
              </div>

              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'rgba(254,240,244,0.8)', lineHeight: 1.75, flex: 1 }}>
                Hewooo~ I&apos;m a femboy who loves creating NSFW content and making people happy as a silly gremlin elf :3
                <br /><br />
                I love Unity and build all my avatars myself.
                I have my own Discord server — join to stay updated! tehehe ♥
              </p>

              {/* Tag chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['lewd elf ♥', 'vrchat', '18+', 'unity dev', 'dumb & cute'].map(t => (
                  <span key={t} style={{
                    fontFamily: 'var(--font-body)', fontSize: 9, letterSpacing: '0.07em',
                    padding: '4px 10px', borderRadius: 999,
                    background: 'rgba(var(--primary-rgb),0.1)',
                    border: '1px solid rgba(var(--primary-rgb),0.28)',
                    color: 'var(--pink)',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Tile>

          {/* ── GAMES ── */}
          <Tile delay={0.07} style={{ gridColumn: '2', gridRow: '1' } as React.CSSProperties}>
            <TileLabel>games i play</TileLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {GAMES.map(g => (
                <div
                  key={g.name}
                  className="game-row"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 8px', borderRadius: 10,
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{g.emoji}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text)', letterSpacing: '0.04em' }}>{g.name}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 11, color: 'var(--text-muted)' }}>{g.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </Tile>

          {/* ── WHAT I DO ── */}
          <Tile delay={0.12} style={{ gridColumn: '2', gridRow: '2' } as React.CSSProperties}>
            <TileLabel>what i do</TileLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {WHAT_I_DO.map(w => (
                <div key={w.label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 5, padding: '10px 8px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, textAlign: 'center',
                }}>
                  <span style={{ fontSize: 22 }}>{w.icon}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{w.label}</span>
                </div>
              ))}
            </div>
          </Tile>

          {/* ── FUN FACTS ── */}
          <Tile delay={0.17} glow="rgba(var(--pink-rgb),0.08)" style={{ gridColumn: '1', gridRow: '3' } as React.CSSProperties}>
            <TileLabel>fun facts</TileLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FACTS.map(f => (
                <span
                  key={f}
                  className="fact-chip"
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: 9, letterSpacing: '0.06em',
                    padding: '5px 11px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    color: 'var(--text-muted)',
                    cursor: 'default', transition: 'all 0.15s',
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </Tile>

          {/* ── TIMELINE ── */}
          <Tile delay={0.22} style={{ gridColumn: '2', gridRow: '3' } as React.CSSProperties}>
            <TileLabel>my story</TileLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TIMELINE.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(var(--primary-rgb),0.12)',
                      border: '1px solid rgba(var(--primary-rgb),0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-body)', fontSize: 7,
                      color: 'var(--pink)', letterSpacing: '0.03em',
                    }}>
                      {t.year}
                    </div>
                    {i < TIMELINE.length - 1 && (
                      <div style={{ width: 1, height: 12, background: 'rgba(var(--primary-rgb),0.2)', marginTop: 3 }} />
                    )}
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-display)', fontStyle: 'italic',
                    fontSize: 12, color: 'rgba(254,240,244,0.65)', lineHeight: 1.5, paddingTop: 4,
                  }}>
                    {t.text}
                  </p>
                </div>
              ))}
            </div>
          </Tile>

        </div>
      </div>
    </>
  )
}
