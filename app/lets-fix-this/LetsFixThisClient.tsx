'use client'

import { useState, useEffect } from 'react'

const SECRET_CODE = 'silvy'

const STYLES = `
  @keyframes gate-in {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes letter-in {
    from { opacity: 0; transform: translateY(30px); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-8px); }
    40%      { transform: translateX(8px); }
    60%      { transform: translateX(-5px); }
    80%      { transform: translateX(5px); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-8px); }
  }
  @keyframes glow-pulse {
    0%,100% { box-shadow: 0 0 40px rgba(196,20,40,0.22), 0 0 80px rgba(107,0,16,0.1); }
    50%     { box-shadow: 0 0 65px rgba(196,20,40,0.4), 0 0 120px rgba(107,0,16,0.2); }
  }
  @keyframes petal-fall {
    0%   { transform: translateY(-5vh) rotate(0deg); opacity: 0; }
    8%   { opacity: 0.7; }
    92%  { opacity: 0.5; }
    100% { transform: translateY(108vh) rotate(var(--rot)); opacity: 0; }
  }
  @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes btn-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  .ltf-gate-card {
    animation: gate-in 0.9s cubic-bezier(0.16,1,0.3,1) both,
               glow-pulse 5s ease-in-out infinite;
  }
  .ltf-letter-card {
    animation: letter-in 1.1s cubic-bezier(0.16,1,0.3,1) 0.15s both,
               glow-pulse 5s ease-in-out 0.15s infinite;
  }
  .ltf-logo {
    animation: float 4s ease-in-out infinite;
  }
  .ltf-input {
    width: 100%; box-sizing: border-box;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(196,20,40,0.28);
    border-radius: 12px;
    padding: 13px 18px;
    font-family: 'Space Mono', monospace;
    font-size: 15px;
    color: rgba(245,232,255,0.9);
    outline: none;
    text-align: center;
    letter-spacing: 0.15em;
    transition: border-color 0.25s ease, box-shadow 0.25s ease;
  }
  .ltf-input:focus {
    border-color: rgba(196,20,40,0.6);
    box-shadow: 0 0 0 3px rgba(196,20,40,0.12);
  }
  .ltf-input.error {
    border-color: #f87171;
    animation: shake 0.5s ease;
  }
  .ltf-btn {
    width: 100%; margin-top: 12px; border: none; outline: none; cursor: pointer;
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 18px;
    padding: 13px; border-radius: 12px; letter-spacing: 0.04em; color: #fef0f4;
    background: linear-gradient(90deg, #c41428, #8b0000, #d4304a, #c41428);
    background-size: 200% auto;
    animation: btn-shimmer 3s linear infinite;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }
  .ltf-btn:hover  { transform: scale(1.02); opacity: 0.92; }
  .ltf-btn:active { transform: scale(0.98); }
  .ltf-petal {
    position: fixed; top: 0; pointer-events: none; z-index: 3;
    font-size: var(--sz);
    animation: petal-fall var(--dur) ease-in var(--delay) forwards;
  }
  .ltf-condition {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 10px 14px; border-radius: 10px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(196,20,40,0.12);
    margin-bottom: 8px;
    transition: background 0.2s ease;
  }
  .ltf-condition:last-child { margin-bottom: 0; }
  .ltf-divider {
    display: flex; align-items: center; gap: 10px; margin: 20px 0;
  }
  .ltf-divider-line {
    flex: 1; height: 1px;
  }
`

const PETALS = ['🌸', '🌺', '🩷', '✨', '💜']

let pid = 0
interface Petal { id: number; x: number; sz: number; rot: number; dur: number; delay: number; emoji: string }

function Petals() {
  const [petals, setPetals] = useState<Petal[]>([])
  useEffect(() => {
    const spawn = () => {
      const p: Petal = {
        id: pid++,
        x: Math.random() * 100,
        sz: Math.random() * 14 + 8,
        rot: (Math.random() - 0.5) * 400,
        dur: Math.random() * 7 + 6,
        delay: 0,
        emoji: PETALS[Math.floor(Math.random() * PETALS.length)],
      }
      setPetals(prev => [...prev.slice(-18), p])
      setTimeout(() => setPetals(prev => prev.filter(x => x.id !== p.id)), (p.dur + p.delay) * 1000 + 500)
    }
    const t = setInterval(spawn, 1400)
    spawn()
    return () => clearInterval(t)
  }, [])

  return (
    <>
      {petals.map(p => (
        <div key={p.id} className="ltf-petal" style={{
          left: `${p.x}%`,
          ['--sz' as string]: `${p.sz}px`,
          ['--dur' as string]: `${p.dur}s`,
          ['--delay' as string]: `${p.delay}s`,
          ['--rot' as string]: `${p.rot}deg`,
        } as React.CSSProperties}>
          {p.emoji}
        </div>
      ))}
    </>
  )
}

function Divider({ emoji = '🖤' }: { emoji?: string }) {
  return (
    <div className="ltf-divider">
      <div className="ltf-divider-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(196,20,40,0.3))' }} />
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <div className="ltf-divider-line" style={{ background: 'linear-gradient(90deg, rgba(196,20,40,0.3), transparent)' }} />
    </div>
  )
}

// ─── Code gate ────────────────────────────────────────────────────────────────
function CodeGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const attempt = () => {
    if (value.trim().toLowerCase() === SECRET_CODE) {
      onUnlock()
    } else {
      setError(true); setShake(true)
      setValue('')
      setTimeout(() => setShake(false), 600)
      setTimeout(() => setError(false), 2500)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#030009', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <style>{STYLES}</style>
      <Petals />

      {/* vignette */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 80% 90% at 50% 50%, transparent 20%, rgba(3,0,9,0.75) 70%, rgba(3,0,9,0.97) 100%)', pointerEvents: 'none', zIndex: 1 }} />

      <div className="ltf-gate-card" style={{
        position: 'relative', zIndex: 10,
        maxWidth: 360, width: '100%',
        background: 'rgba(10,0,20,0.78)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(196,20,40,0.22)',
        borderRadius: 24, padding: '40px 32px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div className="ltf-logo" style={{ marginBottom: 18 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(196,20,40,0.18), rgba(107,0,16,0.1))',
            border: '1px solid rgba(196,20,40,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 0 28px rgba(196,20,40,0.28)',
          }}>
            <img src="/images/logo.png" alt="reokiy" style={{ width: '88%', height: '88%', objectFit: 'cover', objectPosition: 'center 55%', borderRadius: '50%' }} />
          </div>
        </div>

        <div style={{ fontFamily: 'Pinyon Script, cursive', fontSize: 38, color: '#f0a0b8', lineHeight: 1.1, marginBottom: 6, textShadow: '0 0 24px rgba(196,20,40,0.3)' }}>
          private
        </div>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 15, color: 'rgba(245,232,255,0.38)', marginBottom: 28, lineHeight: 1.6 }}>
          this page is only for one person 🖤
        </p>

        <input
          className={`ltf-input${shake ? ' error' : ''}`}
          type="password"
          placeholder="code"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          autoComplete="off"
          spellCheck={false}
        />

        {error && (
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#f87171', marginTop: 10, letterSpacing: '0.06em' }}>
            incorrect code :(
          </p>
        )}

        <button className="ltf-btn" onClick={attempt}>open</button>

        <p style={{ marginTop: 20, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(245,232,255,0.2)', letterSpacing: '0.02em' }}>
          reokiy • s7lver
        </p>
      </div>
    </main>
  )
}

// ─── Letter ───────────────────────────────────────────────────────────────────
const CONDITIONS = [
  { icon: '💕', text: 'I want our relationship to be public — I\'m not going to negotiate this one. I want everybody to know you\'re mine, and just mine.' },
  { icon: '📱', text: 'I want the right to ask you to show me your Discord at any moment. I\'ll do the same if you want.' },
  { icon: '🥽', text: 'No more VRChat hangouts with friends if I\'m not present or if I don\'t know the people. We can negotiate this one.' },
  { icon: '✈️', text: 'As you can imagine, I don\'t feel comfortable anymore with your travel to Barcelona, much less if you sleep with them — but we can try to find a solution if possible.' },
  { icon: '🔒', text: 'And the most important: NO MORE HIDING AND LIES. Right now you can confess anything you\'re hiding like that, and I won\'t get mad. But if I catch you again on something like this or cheating on me in any way, I\'ll automatically cut our relationship and friendship. I\'m being serious. Think twice.' },
  { icon: '💔', text: 'I want you to automatically break up with this guy and tell him the truth.' },
  { icon: '🚫', text: 'No more collabs on Fansly for some weeks. I can be your test subject, but not others.' },
]

function Letter({ visible }: { visible: boolean }) {
  const p: React.CSSProperties = {
    fontFamily: 'Cormorant Garamond, serif',
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 1.85,
    color: 'rgba(245,232,255,0.86)',
    letterSpacing: '0.01em',
    marginBottom: 18,
    margin: '0 0 18px',
  }
  const muted: React.CSSProperties = { color: 'rgba(245,232,255,0.42)', fontSize: 15 }

  return (
    <main style={{ position: 'relative', minHeight: '100vh', background: '#030009', overflow: 'hidden' }}>
      <style>{STYLES}</style>
      <Petals />

      {/* Vignette */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 85% 90% at 50% 40%, transparent 10%, rgba(3,0,9,0.5) 55%, rgba(3,0,9,0.96) 100%)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 50% 40% at 50% 100%, rgba(196,20,40,0.07) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px 70px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="ltf-logo" style={{ marginBottom: 14 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto',
              background: 'rgba(196,20,40,0.12)', border: '1px solid rgba(196,20,40,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              boxShadow: '0 0 24px rgba(196,20,40,0.22)',
            }}>
              <img src="/images/logo.png" alt="reokiy" style={{ width: '88%', height: '88%', objectFit: 'cover', objectPosition: 'center 55%', borderRadius: '50%' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'Pinyon Script, cursive', fontSize: 42, color: '#f0a0b8', textShadow: '0 0 28px rgba(196,20,40,0.3)', lineHeight: 1.1 }}>
            para ti
          </div>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(245,232,255,0.28)', marginTop: 6, letterSpacing: '0.06em' }}>
            from s7lver 🖤
          </p>
        </div>

        {/* Card */}
        <div
          className="ltf-letter-card"
          style={{
            maxWidth: 540, width: '100%',
            background: 'rgba(10,0,20,0.72)',
            backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(196,20,40,0.2)',
            borderRadius: 22,
            padding: '36px 32px',
            opacity: visible ? 1 : 0,
          }}
        >
          <Divider emoji="🖤" />

          {/* Opening */}
          <p style={p}>Hey babe,</p>
          <p style={p}>
            well... yesterday was a terrible day ngl. And I don&apos;t know how to start with this, but hey, here we are.
          </p>

          <Divider emoji="💜" />

          {/* Heavy part */}
          <p style={p}>
            All of this had caused me yesterday to well... I was on the verge of doing one of two things: either cutting myself or taking drugs. I also had thoughts about jumping off a bridge near my house...{' '}
            <span style={muted}>just to show you how much this has affected me. I know I shouldn&apos;t think like that, but your friend started to say stuff like you were going to ghost me or never talk to me again. And I lost my head. I didn&apos;t have an attack like this in my whole life... (I&apos;m sorry that you needed to read that, but it&apos;s just to show you that this is not a game for me)</span>
          </p>
          <p style={p}>
            The only reason I didn&apos;t do any of those, it&apos;s because s7 stopped me and immobilized me in bed, but I was struggling ngl.{' '}
            <span style={muted}>(I think also she&apos;s more mad with you than I am)</span>
          </p>

          <Divider emoji="🩷" />

          {/* The hurt */}
          <p style={p}>
            Ngl I have a lot of questions right now around my head and... I don&apos;t know if I wanna know the answers, but I know you sent him videos in femboy clothes — videos that you swore were just for me{' '}
            <span style={muted}>(and the worst part is that we already had an argument because of that)</span>.
            I also saw your messages with him, and ngl they tore my heart apart. So I ask you, please choose one of us. Not both.
          </p>
          <p style={p}>
            But you know what is the thing that hurt more? That while you were calling me selfish and too restrictive, you were with this guy. That absolutely destroyed me.
          </p>

          <Divider emoji="✨" />

          {/* Hope */}
          <p style={p}>
            As you can understand, my trust is absolutely broken, but there&apos;s nothing that you can&apos;t fix — and the fact that you&apos;re still here and didn&apos;t disappear is already a first good step.
          </p>
          <p style={p}>
            Also as I told you before, I promise I&apos;ll give you another chance. But here are my conditions for it. I know some of them are a bit much, but as I said, you broke my trust, and rebuilding trust takes time.
          </p>

          {/* Conditions */}
          <div style={{ margin: '6px 0 20px' }}>
            {CONDITIONS.map((c, i) => (
              <div key={i} className="ltf-condition">
                <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.6 }}>{c.icon}</span>
                <span style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontStyle: 'italic', fontSize: 16,
                  color: 'rgba(245,232,255,0.8)',
                  lineHeight: 1.7, letterSpacing: '0.01em',
                }}>
                  {c.text}
                </span>
              </div>
            ))}
          </div>

          <Divider emoji="🌸" />

          {/* Closing */}
          <p style={{ ...p, marginBottom: 0 }}>
            I really hope we can talk about this. And feel free to tell me anything that I do that causes you pain too. Trust me, if you do all of that, I promise I&apos;ll forgive every single thing.
          </p>

          {/* Signature */}
          <div style={{ marginTop: 28, textAlign: 'right' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 16, color: 'rgba(245,232,255,0.45)', marginBottom: 4 }}>
              Love you dear,
            </div>
            <div style={{ fontFamily: 'Pinyon Script, cursive', fontSize: 40, color: '#f0a0b8', textShadow: '0 0 20px rgba(196,20,40,0.28)', lineHeight: 1.1 }}>
              s7lver
            </div>
          </div>
        </div>

        {/* Back link */}
        <a
          href="/"
          style={{ marginTop: 30, fontFamily: 'Space Mono, monospace', fontSize: 11, letterSpacing: '0.1em', color: 'rgba(245,232,255,0.16)', textDecoration: 'none', transition: 'color 0.2s ease' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(196,20,40,0.5)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(245,232,255,0.16)' }}
        >
          ← back
        </a>
      </div>
    </main>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function LetsFixThisClient() {
  const [unlocked, setUnlocked] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!unlocked) return
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [unlocked])

  if (!unlocked) return <CodeGate onUnlock={() => setUnlocked(true)} />
  return <Letter visible={visible} />
}
