'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

const PAGE_SHELL: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: 'var(--bg)', position: 'relative', overflow: 'hidden',
  padding: '24px 16px', textAlign: 'center',
}
const GLOW_ORB: React.CSSProperties = {
  position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
  width: 420, height: 420, borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(196,20,40,0.1) 0%, transparent 70%)',
  pointerEvents: 'none',
}
const GLITCH_404: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 600,
  fontSize: 'clamp(90px, 24vw, 150px)', lineHeight: 1, color: 'var(--primary)',
  textShadow: '0 0 36px rgba(196,20,40,0.55), 0 0 90px rgba(196,20,40,0.25)',
}
const HOME_LINK: React.CSSProperties = {
  fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 32,
  padding: '11px 28px', borderRadius: 999,
  background: 'rgba(196,20,40,0.12)', border: '1px solid rgba(196,20,40,0.4)',
  color: 'var(--text)', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
  transition: 'background 0.25s ease, color 0.25s ease, border-color 0.25s ease, opacity 0.25s ease, transform 0.25s ease',
  animation: 'nf-float 5s ease-in-out infinite',
}

interface Star { left: number; top: number; size: number; delay: number; duration: number }

export default function NotFound() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    setStars(Array.from({ length: 26 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 4,
      duration: 2.5 + Math.random() * 3,
    })))
  }, [])

  return (
    <main style={PAGE_SHELL}>
      {/* Twinkling stars */}
      {stars.map((s, i) => (
        <span key={i} style={{
          position: 'absolute', left: `${s.left}%`, top: `${s.top}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: i % 3 === 0 ? '#c41428' : '#fef0f4',
          animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Glow */}
      <div style={GLOW_ORB} />

      <div style={{ position: 'relative', zIndex: 1, animation: 'nf-in 0.7s ease both' }}>
        <div className="animate-glitch" style={GLITCH_404}>
          404
        </div>

        <div style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(18px, 5vw, 24px)',
          color: 'var(--text)', marginTop: 14,
        }}>
          you seem a little lost, darling
        </div>

        <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 12 }}>
          this page doesn&apos;t exist ✦
        </div>

        <Link href="/" style={HOME_LINK}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,20,40,0.24)'; e.currentTarget.style.boxShadow = '0 0 26px rgba(196,20,40,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(196,20,40,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          ← take me home
        </Link>

        <div style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13,
          color: 'rgba(254,240,244,0.18)', marginTop: 44,
        }}>
          reokiy ✦
        </div>
      </div>

      <style>{`
        @keyframes nf-in { from { opacity: 0; transform: translateY(18px) scale(0.97); filter: blur(5px) } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0) } }
        @keyframes nf-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
      `}</style>
    </main>
  )
}
