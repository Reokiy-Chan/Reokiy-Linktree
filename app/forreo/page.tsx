'use client'

import { useState, useEffect, useCallback } from 'react'

interface Heart {
  id: number
  x: number
  size: number
  rot: number
  duration: number
  delay: number
  color: string
  emoji: string
}

const HEART_EMOJIS = ['🖤', '🌸', '🩷', '❤️', '💕', '💗', '💝', '🌺', '✨', '💫', '🌹']
const HEART_COLORS = ['#c41428', '#6b0010', '#f0a0b8', '#ffffff', '#d4304a', '#ff7090']

let heartId = 0

export default function Forreo() {
  const [hearts, setHearts] = useState<Heart[]>([])
  const [clicked, setClicked] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [petals, setPetals] = useState<Heart[]>([])

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100)
  }, [])

  const spawnHearts = useCallback((count: number) => {
    const newHearts: Heart[] = Array.from({ length: count }, () => ({
      id: heartId++,
      x: Math.random() * 100,
      size: Math.random() * 28 + 16,
      rot: (Math.random() - 0.5) * 720,
      duration: Math.random() * 2.5 + 1.5,
      delay: Math.random() * 0.8,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
    }))
    setHearts(prev => [...prev, ...newHearts])
    setTimeout(() => {
      setHearts(prev => prev.filter(h => !newHearts.find(n => n.id === h.id)))
    }, 5000)
  }, [])

  const handleClick = useCallback(() => {
    setClicked(true)
    // Burst 1
    spawnHearts(30)
    // Burst 2
    setTimeout(() => spawnHearts(25), 400)
    // Burst 3
    setTimeout(() => spawnHearts(20), 800)

    // Keep spawning gently
    const interval = setInterval(() => spawnHearts(8), 800)
    setTimeout(() => clearInterval(interval), 6000)
  }, [spawnHearts])

  // Ambient petal effect
  useEffect(() => {
    const spawnPetal = () => {
      const petal: Heart = {
        id: heartId++,
        x: Math.random() * 100,
        size: Math.random() * 12 + 6,
        rot: (Math.random() - 0.5) * 360,
        duration: Math.random() * 6 + 5,
        delay: 0,
        color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
        emoji: Math.random() > 0.5 ? '🌸' : '🌺',
      }
      setPetals(prev => [...prev.slice(-20), petal])
      setTimeout(() => {
        setPetals(prev => prev.filter(p => p.id !== petal.id))
      }, (petal.duration + petal.delay) * 1000 + 500)
    }

    const interval = setInterval(spawnPetal, 1200)
    return () => clearInterval(interval)
  }, [])

  return (
    <main style={{
      position: 'relative',
      minHeight: '100vh',
      overflow: 'hidden',
      background: '#030009',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400;1,600&family=Pinyon+Script&family=Space+Mono:wght@400&display=swap');

        @keyframes heart-rise {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-110vh) scale(0.2) rotate(var(--rot));
            opacity: 0;
          }
        }

        @keyframes petal-fall {
          0% {
            transform: translateY(-5vh) rotate(0deg) translateX(0);
            opacity: 0;
          }
          10% { opacity: 0.8; }
          90% { opacity: 0.6; }
          100% {
            transform: translateY(105vh) rotate(var(--rot)) translateX(40px);
            opacity: 0;
          }
        }

        @keyframes vignette-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.85; }
        }

        @keyframes note-appear {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.97);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(196,20,40,0.3), 0 0 80px rgba(107,0,16,0.15); }
          50% { box-shadow: 0 0 60px rgba(196,20,40,0.5), 0 0 120px rgba(107,0,16,0.25); }
        }

        @keyframes button-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes sparkle-spin {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(360deg) scale(1); }
        }

        .heart-particle {
          position: fixed;
          bottom: -10px;
          pointer-events: none;
          z-index: 100;
          font-size: var(--size);
          animation: heart-rise var(--dur) cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--delay) forwards;
        }

        .petal {
          position: fixed;
          top: 0;
          pointer-events: none;
          z-index: 5;
          font-size: var(--size);
          animation: petal-fall var(--dur) ease-in var(--delay) forwards;
        }

        .note-card {
          animation: note-appear 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }

        .magic-btn {
          position: relative;
          overflow: hidden;
          cursor: pointer;
          border: none;
          outline: none;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 18px;
          padding: 14px 36px;
          border-radius: 999px;
          background: linear-gradient(90deg, #c41428, #8b0000, #d4304a, #c41428);
          background-size: 200% auto;
          color: #fef0f4;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          animation: button-shimmer 3s linear infinite;
          letter-spacing: 0.05em;
        }

        .magic-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(196,20,40,0.55), 0 0 60px rgba(240,160,184,0.2);
        }

        .magic-btn:active {
          transform: scale(0.98);
        }

        .magic-btn.activated {
          animation: button-shimmer 1s linear infinite;
          box-shadow: 0 0 40px rgba(196,20,40,0.65), 0 0 80px rgba(240,160,184,0.25);
        }
      `}</style>

      {/* Full-screen background image */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(/images/note-photo.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        filter: 'brightness(0.4) saturate(1.2)',
        zIndex: 0,
      }} />

      {/* Radial vignette overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 80% at 50% 40%, transparent 0%, rgba(3,0,9,0.6) 60%, rgba(3,0,9,0.95) 100%)',
        zIndex: 1,
        animation: 'vignette-pulse 4s ease-in-out infinite',
      }} />

      {/* Ambient color overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(196,20,40,0.12) 0%, transparent 70%)',
        zIndex: 2,
        pointerEvents: 'none',
      }} />

      {/* Floating petals */}
      {petals.map(p => (
        <div
          key={p.id}
          className="petal"
          style={{
            left: `${p.x}%`,
            ['--size' as string]: `${p.size}px`,
            ['--dur' as string]: `${p.duration}s`,
            ['--delay' as string]: `${p.delay}s`,
            ['--rot' as string]: `${p.rot}deg`,
          } as React.CSSProperties}
        >
          {p.emoji}
        </div>
      ))}

      {/* Heart particles */}
      {hearts.map(h => (
        <div
          key={h.id}
          className="heart-particle"
          style={{
            left: `${h.x}%`,
            ['--size' as string]: `${h.size}px`,
            ['--dur' as string]: `${h.duration}s`,
            ['--delay' as string]: `${h.delay}s`,
            ['--rot' as string]: `${h.rot}deg`,
          } as React.CSSProperties}
        >
          {h.emoji}
        </div>
      ))}

      {/* Main content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div
          className="note-card"
          style={{
            maxWidth: 500,
            width: '100%',
            background: 'rgba(10, 0, 20, 0.7)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(196,20,40,0.25)',
            borderRadius: '24px',
            padding: '40px 36px',
            textAlign: 'center',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.5s ease',
            animation: 'glow-pulse 4s ease-in-out infinite',
          }}
        >
          {/* Top decorative line */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '28px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(196,20,40,0.4))' }} />
            <span style={{ fontSize: '18px' }}>🖤</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(196,20,40,0.4), transparent)' }} />
          </div>

          {/* Heading */}
          <div style={{
            fontFamily: 'Pinyon Script, cursive',
            fontSize: '52px',
            color: '#f0a0b8',
            lineHeight: 1.1,
            marginBottom: '24px',
            textShadow: '0 0 30px rgba(196,20,40,0.4)',
          }}>
            for you
          </div>

          {/* Note text */}
          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic',
            fontSize: '19px',
            lineHeight: 1.75,
            color: 'rgba(245,232,255,0.92)',
            letterSpacing: '0.02em',
            marginBottom: '32px',
          }}>
            hai sweetie 🩷<br />
            <br />
            i know you already had a link tree, but i wanted to do this for you as a surprise.
            <br /><br />
            i love you sweetie, thank you for making my days better love.
            <br /><br />
            I Hope you like it
            <span style={{ color: '#f0a0b8', fontFamily: 'Pinyon Script, cursive', fontSize: '26px', display: 'inline-block', marginLeft: '6px' }}>
              mwah mwah
            </span>
            &nbsp;💜
          </p>

          {/* Signature decoration */}
          <div style={{
            fontFamily: 'Pinyon Script, cursive',
            fontSize: '28px',
            color: 'rgba(196,20,40,0.6)',
            marginBottom: '32px',
          }}>
            — with all my love
          </div>

          {/* Bottom decorative line */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(240,160,184,0.3))' }} />
            <span style={{ fontSize: '14px' }}>✦</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(240,160,184,0.3), transparent)' }} />
          </div>

          {/* Magic button */}
          <button
            onClick={handleClick}
            className={`magic-btn${clicked ? ' activated' : ''}`}
          >
            {clicked ? '💝 i love you honey pie 💝' : '✨ press me ✨'}
          </button>

          {/* After click message */}
          {clicked && (
            <p style={{
              marginTop: '20px',
              fontFamily: 'Cormorant Garamond, serif',
              fontStyle: 'italic',
              fontSize: '15px',
              color: 'rgba(240,160,184,0.8)',
              animation: 'note-appear 0.6s ease both',
            }}>
              you make everything beautiful 🌸
            </p>
          )}
        </div>

        {/* Photo credit / back link */}
        <a
          href="/"
          style={{
            marginTop: '28px',
            fontFamily: 'Space Mono, monospace',
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: 'rgba(245,232,255,0.25)',
            textDecoration: 'none',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(196,20,40,0.6)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(245,232,255,0.25)' }}
        >
          ← back to links
        </a>
      </div>
    </main>
  )
}