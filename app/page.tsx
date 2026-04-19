'use client'

import { useState } from 'react'
import ParticlesBg from './components/ParticlesBg'
import DiscordStatus from './components/DiscordStatus'

/* ─── SVG Icons ─────────────────────────────────────────── */
const Icons = {
  Discord: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  ),
  Twitter: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  Bluesky: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/>
    </svg>
  ),
  Fansly: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M12 21.593c-.39 0-.772-.155-1.057-.44l-8.38-8.38a5.97 5.97 0 0 1 0-8.436 5.97 5.97 0 0 1 8.437 0l1 1 1-1a5.97 5.97 0 0 1 8.437 0 5.97 5.97 0 0 1 0 8.437l-8.38 8.38c-.285.284-.668.44-1.057.44z"/>
    </svg>
  ),
}

/* ─── Link Data ──────────────────────────────────────────── */
interface LinkItem {
  label: string
  sublabel?: string
  href: string
  icon: keyof typeof Icons
  accent: string
  featured?: boolean
}

const links: LinkItem[] = [
  {
    label: 'discord',
    sublabel: 'join the server',
    href: 'https://discord.com/invite/CSxbWqjsaC',
    icon: 'Discord',
    accent: '#5865F2',
    featured: true,
  },
  {
    label: 'twitter / x',
    sublabel: '@reoki14',
    href: 'https://x.com/Reoki14',
    icon: 'Twitter',
    accent: '#e8195c',
  },
  {
    label: 'bluesky',
    sublabel: '@reokiy.bsky.social',
    href: 'https://bsky.app/profile/reokiy.bsky.social',
    icon: 'Bluesky',
    accent: '#0085ff',
  },
  {
    label: 'fansly',
    sublabel: '18+ content ♥',
    href: 'https://fansly.com/Reokiy/posts',
    icon: 'Fansly',
    accent: '#e8195c',
  },
]

/* ─── Decorative Stars ───────────────────────────────────── */
const STARS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: Math.random() * 2 + 1,
  delay: Math.random() * 4,
  duration: Math.random() * 3 + 2,
}))

/* ─── Main Component ─────────────────────────────────────── */
export default function Home() {
  const [hoveredLink, setHoveredLink] = useState<number | null>(null)

  return (
    <main style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '60px 20px 80px',
      zIndex: 1,
    }}>
      {/* Background image */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/images/bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.2) saturate(1.4) blur(2px)',
        zIndex: 0,
        transform: 'scale(1.05)',
      }} />

      <ParticlesBg />

      {/* Decorative stars */}
      {STARS.map(s => (
        <span key={s.id} style={{
          position: 'fixed',
          top: s.top,
          left: s.left,
          width: s.size,
          height: s.size,
          borderRadius: '50%',
          background: 'white',
          opacity: 0,
          animation: `twinkle ${s.duration}s ease-in-out infinite`,
          animationDelay: `${s.delay}s`,
          zIndex: 0,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Content wrapper */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: 460,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
      }}>

        {/* Avatar ring */}
        <div
          className="animate-float"
          style={{
            position: 'relative',
            marginBottom: '20px',
          }}
        >
          {/* Outer spinning ring */}
          <div style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: '1px solid transparent',
            borderTopColor: 'var(--primary)',
            borderRightColor: 'rgba(240,160,184,0.45)',
            animation: 'spin-slow 7s linear infinite',
          }} />
          {/* Inner glow ring */}
          <div style={{
            width: 130,
            height: 130,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(196,20,40,0.2), rgba(107,0,16,0.25))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 32px rgba(196,20,40,0.35), 0 0 64px rgba(107,0,16,0.15)',
          }}>
            <div style={{
              width: 118,
              height: 118,
              borderRadius: '50%',
              background: '#0a0008',
              border: '2px solid rgba(196,20,40,0.35)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src="/images/logo.png"
                alt="Reokiy logo"
                style={{
                  width: '140%',
                  height: '140%',
                  objectFit: 'cover',
                  objectPosition: 'center 55%',
                  marginTop: '8px',
                }}
              />
            </div>
          </div>
        </div>

        {/* Name */}
        <h1
          className="animate-glitch"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '48px',
            fontWeight: 600,
            fontStyle: 'italic',
            letterSpacing: '-0.01em',
            background: 'linear-gradient(90deg, var(--text) 0%, var(--pink) 50%, var(--text) 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 4s linear infinite, glitch-clip 12s ease-in-out infinite',
            marginBottom: '6px',
            textAlign: 'center',
          }}
        >
          reokiy
        </h1>

        {/* Subtitle tag */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '14px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {['lewd elf', 'vrchat', '18+', 'dumb & cute'].map(tag => (
            <span key={tag} style={{
              fontSize: '10px',
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '3px 10px',
              borderRadius: '999px',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)',
              background: 'var(--glass)',
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Bio */}
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '16px',
          fontStyle: 'italic',
          color: 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.6,
          maxWidth: 320,
          marginBottom: '32px',
        }}>
          hey i&apos;m reokiy, your lewd dumb elf
          <br />check out my links :3
        </p>

        {/* ── Social Hub Card (Discord status + app logos) ── */}
        <div style={{
          width: '100%',
          background: 'var(--glass)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative gradient blob inside card */}
          <div style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,20,40,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            fontSize: '10px',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '14px',
          }}>
            socials
          </div>

          {/* App icons grid */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '16px',
          }}>
            {([
              { icon: 'Discord', color: '#5865F2', label: 'Discord', href: 'https://discord.com/invite/CSxbWqjsaC' },
              { icon: 'Twitter', color: '#e8195c', label: 'Twitter/X', href: 'https://x.com/Reoki14' },
              { icon: 'Bluesky', color: '#0085ff', label: 'Bluesky', href: 'https://bsky.app/profile/reokiy.bsky.social' },
              { icon: 'Fansly', color: '#ff5fa0', label: 'Fansly', href: 'https://fansly.com/Reokiy/posts' },
            ] as Array<{ icon: keyof typeof Icons; color: string; label: string; href: string }>).map(({ icon, color, label, href }) => {
              const Icon = Icons[icon]
              return (
                <a
                  key={icon}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: `${color}18`,
                    border: `1px solid ${color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = `${color}30`
                    el.style.borderColor = `${color}80`
                    el.style.transform = 'translateY(-2px)'
                    el.style.boxShadow = `0 4px 16px ${color}30`
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = `${color}18`
                    el.style.borderColor = `${color}30`
                    el.style.transform = ''
                    el.style.boxShadow = ''
                  }}
                >
                  <Icon />
                </a>
              )
            })}
          </div>

          {/* Discord Status */}
          <DiscordStatus />
        </div>

        {/* ── Individual Link Cards ── */}
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {links.map((link, i) => {
            const Icon = Icons[link.icon]
            const isHovered = hoveredLink === i
            return (
              <a
                key={i}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setHoveredLink(i)}
                onMouseLeave={() => setHoveredLink(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 18px',
                  background: isHovered ? `${link.accent}14` : 'var(--glass)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${isHovered ? `${link.accent}50` : 'var(--glass-border)'}`,
                  borderRadius: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isHovered ? 'translateX(4px)' : 'none',
                  boxShadow: isHovered ? `0 4px 24px ${link.accent}20, inset 0 0 0 1px ${link.accent}20` : 'none',
                  animation: `fadeInUp 0.5s ease ${i * 0.06 + 0.2}s both`,
                  textDecoration: 'none',
                }}
              >
                {/* Icon bubble */}
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: `${link.accent}20`,
                  border: `1px solid ${link.accent}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: link.accent,
                  flexShrink: 0,
                  transition: 'all 0.25s ease',
                  boxShadow: isHovered ? `0 0 16px ${link.accent}40` : 'none',
                }}>
                  <Icon />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--text)',
                    letterSpacing: '0.05em',
                    textTransform: 'lowercase',
                  }}>
                    {link.label}
                  </div>
                  {link.sublabel && (
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                    }}>
                      {link.sublabel}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div style={{
                  color: isHovered ? link.accent : 'rgba(245,232,255,0.2)',
                  transition: 'all 0.25s ease',
                  transform: isHovered ? 'translateX(2px)' : 'none',
                  fontSize: '14px',
                }}>
                  →
                </div>
              </a>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: '13px',
          color: 'rgba(245,232,255,0.25)',
        }}>
          reokiy • your lewd dumb elf 🖤
        </div>
      </div>
    </main>
  )
}