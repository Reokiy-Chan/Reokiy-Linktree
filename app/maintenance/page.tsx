'use client'

import { useEffect, useState } from 'react'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

export default function MaintenancePage() {
  const [message, setMessage] = useState<string | null>(null)
  const [dots, setDots] = useState('')

  // Pull the custom message and auto-bounce back home when maintenance ends
  useEffect(() => {
    const check = () => {
      fetch('/api/settings/status')
        .then(r => r.json())
        .then((d: { maintenance?: boolean; message?: string | null }) => {
          if (!d.maintenance) { window.location.href = '/'; return }
          setMessage(d.message ?? null)
        })
        .catch(() => {})
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 600)
    return () => clearInterval(id)
  }, [])

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden',
      padding: '24px 16px', textAlign: 'center',
    }}>
      <div style={{
        position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 460, height: 460, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(196,20,40,0.09) 0%, transparent 70%)',
        pointerEvents: 'none', animation: 'mt-breathe 5s ease-in-out infinite',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 420, animation: 'mt-in 0.7s ease both' }}>
        <div style={{ fontSize: 44, animation: 'mt-wrench 3.2s ease-in-out infinite', display: 'inline-block' }}>🔧</div>

        <div style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(26px, 7vw, 34px)',
          color: 'var(--text)', marginTop: 16,
        }}>
          under maintenance
        </div>

        <div style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.4)', marginTop: 14, lineHeight: 1.8 }}>
          {message || 'be right back ✦ making things prettier for you'}
        </div>

        {/* Animated progress shimmer */}
        <div style={{ marginTop: 30, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '38%', borderRadius: 2,
            background: 'linear-gradient(90deg, transparent, #c41428, #e8195c, transparent)',
            animation: 'mt-bar 2.2s ease-in-out infinite',
          }} />
        </div>

        <div style={{ ...S, fontSize: 8.5, color: 'rgba(254,240,244,0.22)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 14 }}>
          working on it{dots}
        </div>

        <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.15)', letterSpacing: '0.1em', marginTop: 36 }}>
          this page refreshes automatically
        </div>

        <div style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13,
          color: 'rgba(254,240,244,0.18)', marginTop: 10,
        }}>
          reokiy ✦
        </div>
      </div>

      <style>{`
        @keyframes mt-in { from { opacity: 0; transform: translateY(16px); filter: blur(4px) } to { opacity: 1; transform: translateY(0); filter: blur(0) } }
        @keyframes mt-wrench { 0%,100% { transform: rotate(0deg) } 20% { transform: rotate(-18deg) } 40% { transform: rotate(12deg) } 60% { transform: rotate(-8deg) } 80% { transform: rotate(4deg) } }
        @keyframes mt-bar { 0% { left: -40% } 100% { left: 105% } }
        @keyframes mt-breathe { 0%,100% { opacity: 0.7; transform: translate(-50%,-50%) scale(1) } 50% { opacity: 1; transform: translate(-50%,-50%) scale(1.08) } }
      `}</style>
    </main>
  )
}
