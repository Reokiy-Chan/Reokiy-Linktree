'use client'

import { useState, useEffect } from 'react'
import ParticlesBg from '../components/ParticlesBg'
import Carousel from '../components/Carousel'

/* ── Sticker component ── */
const STICKER_ANIM = [
  { dur: 3.2, delay: 0.0 }, { dur: 4.1, delay: 0.7 },
  { dur: 3.7, delay: 0.3 }, { dur: 4.5, delay: 1.1 },
  { dur: 3.0, delay: 0.5 }, { dur: 4.8, delay: 0.2 },
]

function Sticker({ src, alt, idx = 0, style }: { src: string; alt: string; idx?: number; style?: React.CSSProperties }) {
  const a = STICKER_ANIM[idx % STICKER_ANIM.length]
  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: 56, height: 56,
        objectFit: 'contain',
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
        animation: `float ${a.dur}s ease-in-out infinite`,
        animationDelay: `${a.delay}s`,
        ...style,
      }}
    />
  )
}

/* ── Floating sticker decoration ── */
const FLOAT_ANIMS = [
  { dur: 4.2, delay: 0.0 }, { dur: 5.1, delay: 1.0 },
  { dur: 4.7, delay: 0.5 }, { dur: 6.0, delay: 1.5 },
  { dur: 5.5, delay: 0.8 }, { dur: 4.0, delay: 2.0 },
]

function FloatingSticker({ src, top, left, size = 40, idx = 0 }: { src: string; top: string; left: string; size?: number; idx?: number }) {
  const a = FLOAT_ANIMS[idx % FLOAT_ANIMS.length]
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      style={{
        position: 'absolute', top, left,
        width: size, height: size,
        objectFit: 'contain',
        opacity: 0.15,
        animation: `float ${a.dur}s ease-in-out infinite`,
        animationDelay: `${a.delay}s`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

/* ── Section header ── */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      marginBottom: 20,
    }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--glass-border))' }} />
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 13,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--pink)',
        whiteSpace: 'nowrap',
      }}>{children}</h2>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--glass-border), transparent)' }} />
    </div>
  )
}

/* ── Game card ── */
function GameCard({ emoji, game, description, sticker }: { emoji: string; game: string; description: string; sticker: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px',
        background: hovered ? 'rgba(var(--primary-rgb),0.08)' : 'var(--glass)',
        border: `1px solid ${hovered ? 'rgba(var(--primary-rgb),0.4)' : 'var(--glass-border)'}`,
        borderRadius: 14,
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateX(4px)' : 'none',
        cursor: 'default',
      }}
    >
      <div style={{
        width: 44, height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.3s ease',
        transform: hovered ? 'scale(1.2) rotate(-5deg)' : 'scale(1)',
      }}>
        {sticker > 0 ? (
          <img
            src={`/emojis/reokichan 56 ${sticker}.png`}
            alt={game}
            style={{ width: 44, height: 44, objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 32 }}>{emoji}</span>
        )}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text)', letterSpacing: '0.06em' }}>
          {game}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {description}
        </div>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 20, opacity: hovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>
        {emoji}
      </div>
    </div>
  )
}

const GAMES = [
  { emoji: '🌐', game: 'VRChat', description: 'My cozy home', sticker: 1 },
  { emoji: '⚔️', game: 'The Outlast Trials', description: 'I never got raped so many times in a row', sticker: 2 },
  { emoji: '🏝️', game: 'Terraria', description: 'Its cool', sticker: 3 },
  { emoji: '🧱', game: 'Unity', description: 'Im a masoquist, i love it (+200 avis and 3 worlds)', sticker: 4 },
  { emoji: '🌸', game: '7 Days To Die', description: 'I love my basy', sticker: 5 },
  { emoji: '🎯', game: 'Phasmophobia', description: 'The ghost are afraid of me', sticker: 6 },
]

const STICKER_VARIANTS = [1, 2, 3, 4, 5, 6]

export default function AboutMe() {
  const [loaded, setLoaded] = useState(false)
  const [activeStickerIdx, setActiveStickerIdx] = useState(0)

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100)
    const interval = setInterval(() => {
      setActiveStickerIdx(i => (i + 1) % STICKER_VARIANTS.length)
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  return (
    <main className="main-layout">
      <ParticlesBg />

      {/* Floating bg stickers */}
      {[1,3,5,2,4,6].map((v, i) => (
        <FloatingSticker
          key={v}
          src={`/emojis/reokichan 112 ${v}.png`}
          top={`${10 + i * 15}%`}
          left={i % 2 === 0 ? '4%' : '92%'}
          size={50}
          idx={i}
        />
      ))}

      <div
        className="content-wrapper"
        style={{
          maxWidth: 520,
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      >
        {/* ── Back link ── */}
        <a href="/" style={{
          alignSelf: 'flex-start',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          textDecoration: 'none',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--pink)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
        >
          ← back to links
        </a>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative' }}>
          {/* Animated sticker showcase */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {STICKER_VARIANTS.map((v, i) => (
              <img
                key={v}
                src={`/emojis/reokichan 56 ${v}.png`}
                alt={`reokichan ${v}`}
                style={{
                  width: 44, height: 44,
                  objectFit: 'contain',
                  opacity: activeStickerIdx === i ? 1 : 0.3,
                  transform: activeStickerIdx === i ? 'scale(1.3) translateY(-4px)' : 'scale(1)',
                  transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                  filter: activeStickerIdx === i ? 'drop-shadow(0 0 8px rgba(var(--pink-rgb),0.6))' : 'none',
                }}
              />
            ))}
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 10vw, 54px)',
            fontWeight: 600,
            fontStyle: 'italic',
            background: `linear-gradient(90deg, var(--text) 0%, var(--pink) 50%, var(--text) 100%)`,
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 4s linear infinite',
            marginBottom: 8,
          }}>
            about reokiy
          </h1>

          <p style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}>
            Hewooo~ Im Reokiy ♥
          </p>
        </div>

        {/* ── Who am I ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionHeader>Who I Am</SectionHeader>
          <div style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 15,
                color: 'rgba(var(--text-rgb,254,240,244),0.88)',
                lineHeight: 1.8,
              }}>
                Hewooo. I'm <strong style={{ color: 'var(--pink)', fontStyle: 'normal' }}>Reokiy</strong>, 
                also known as Lucy. I'm 21 and a femboy who loves creating NSFW content~ 🌐
                <br /><br />
                I love making people happy and laughing with them, 
                and I love being around them as a silly gremlin elf :3
                <br /><br />
                I also love Unity and create all my avatars myself.
                If anyone needs help, I'm happy to help!~ ✨
                <br /><br />
                I have my own Discord server to stay up to date — please join to keep updated! tehehe :3
              </p>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 4].map((v, i) => (
                <Sticker key={v} idx={i} src={`/emojis/reokichan 56 ${v}.png`} alt="reokichan sticker" />
              ))}
            </div>
          </div>
        </div>

        {/* ── What I do ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionHeader>What i do</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '🌐', title: 'VRChat content', desc: 'i like to experiment with a lot of types of content' },
              { icon: '📸', title: 'Picrutres', desc: 'I really love making pictures as a cute elf' },
              { icon: '💬', title: 'Discord and Yapping', desc: 'I really love my dc server and to be yapping arround there' },
              { icon: '🔞', title: 'Lewd Content', desc: '18+ on fansly, but keep it as our secret~' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10,
                border: '1px solid var(--glass-border)',
              }}>
                <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text)', letterSpacing: '0.06em', marginBottom: 2 }}>
                    {title}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: 'var(--text-muted)' }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── How I started ── */}
        <div className="card" style={{ marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
          <SectionHeader>How did i started</SectionHeader>
          <div style={{
            position: 'absolute', right: -20, top: -20,
            opacity: 0.08, pointerEvents: 'none',
          }}>
            <img src="/emojis/reokichan 112 3.png" alt="" style={{ width: 100, height: 100, objectFit: 'contain' }} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: 0, flexDirection: 'column' }}>
              {[
                { year: '2020', text: 'I started creating NSFW content with a Koikatsu character I made before I found VRchat. I enjoyed making them.' },
                { year: '2022', text: 'After that, I found VRchat and started off simple with some pictures.' },
                { year: '2024', text: 'After that, I made Pornhub videos and got my first followers and likes.' },
                { year: 'Today', text: 'Since then, I have stopped making Pornhub videos and started focusing more on my content on X/Twitter, Bluesky and Fansly.' },
              ].map(({ year, text }, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < 4 ? 16 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(var(--primary-rgb),0.15)',
                      border: '1px solid rgba(var(--primary-rgb),0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-body)', fontSize: 8,
                      color: 'var(--pink)', letterSpacing: '0.05em', flexShrink: 0,
                    }}>
                      {year}
                    </div>
                    {i < 4 && <div style={{ width: 1, flex: 1, background: 'var(--glass-border)', minHeight: 16, marginTop: 4 }} />}
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 14,
                    color: 'rgba(254,240,244,0.82)',
                    lineHeight: 1.7,
                    paddingTop: 8,
                  }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Games ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionHeader>Games I Play</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {GAMES.map(g => (
              <GameCard key={g.game} {...g} />
            ))}
          </div>
          {/* Sticker strip */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8,
            marginTop: 20, flexWrap: 'wrap',
          }}>
            {STICKER_VARIANTS.map(v => (
              <img
                key={v}
                src={`/emojis/reokichan 28 ${v}.png`}
                alt={`sticker ${v}`}
                style={{
                  width: 28, height: 28,
                  objectFit: 'contain',
                  animation: `float ${2.5 + v * 0.3}s ease-in-out infinite`,
                  animationDelay: `${v * 0.2}s`,
                  filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.3))',
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Gallery ── */}
        <div className="card" style={{ marginBottom: 16, padding: '20px 20px 12px' }}>
          <SectionHeader>galería</SectionHeader>
          <div style={{ margin: '0 -20px -12px' }}>
            <Carousel autoPlay interval={4000} />
          </div>
        </div>

        {/* ── Fun facts ── */}
        <div className="card" style={{ marginBottom: 32 }}>
          <SectionHeader>fun facts</SectionHeader>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              '🌙 Gooning final boss',
              '🎧 Always With Music',
              '🩷 Elf Supremacy',
              '🥺 Quite Sensible',
              '☕ I require caffeine',
              '🌸 world collectionist',
              '😭 I laugh about the problems',
              '✨ I belive in gooning god',
            ].map(fact => (
              <span key={fact} style={{
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                letterSpacing: '0.08em',
                padding: '6px 12px',
                borderRadius: 999,
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-muted)',
              }}>
                {fact}
              </span>
            ))}
          </div>
        </div>

        <div className="footer-text">
          reokiy • your lewd dumb elf 🖤
        </div>
      </div>
    </main>
  )
}
