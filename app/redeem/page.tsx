'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type RewardType = 'link' | 'text' | 'image' | 'fansly'
type GiftPattern = 'none' | 'dots' | 'stripes' | 'stars' | 'hearts' | 'checks' | 'diamonds' | 'waves' | 'zigzag' | 'custom'
type ScratchDifficulty = 'easy' | 'normal' | 'hard' | 'very_hard'

interface Reward {
  rewardType: RewardType
  rewardContent: string
  rewardTitle: string | null
  giftAnimation: boolean
  giftBoxColor: string
  giftRibbonColor: string
  giftPattern?: GiftPattern
  giftPatternColor?: string
  giftPatternImage?: string
  scratchCard?: boolean
  scratchCardColor?: string
  scratchCardLabel?: string
  scratchTextColor?: string
  scratchAccentColor?: string
  scratchCardWidth?: number
  scratchCardHeight?: number
  scratchRevealThreshold?: number
  scratchDifficulty?: ScratchDifficulty
}

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
function lighten(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`
}
function darken(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`
}

// Map difficulty to brush radius
function difficultyToRadius(difficulty: ScratchDifficulty, height: number): number {
  const base = Math.max(height / 8, 14)
  switch (difficulty) {
    case 'easy':      return Math.floor(base * 2.0)   // very big brush
    case 'normal':    return Math.floor(base * 1.0)   // default
    case 'hard':      return Math.floor(base * 0.5)   // small brush
    case 'very_hard': return Math.floor(base * 0.25)  // tiny brush
  }
}

function ReokiyBackground() {
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    fetch('/api/carousel').then(r => r.json()).then((data: { images: string[] }) => {
      if (data.images?.length) {
        const pick = data.images[Math.floor(Math.random() * data.images.length)]
        setBgUrl(`/images/carrousel/${encodeURIComponent(pick)}`)
      }
    }).catch(() => {})
  }, [])
  if (!bgUrl) return null
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bgUrl} alt="" aria-hidden onLoad={() => setLoaded(true)}
        style={{ position:'fixed', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', filter:'blur(18px) saturate(0.7)', transform:'scale(1.08)', zIndex:0, opacity:loaded?0.18:0, transition:'opacity 1.2s ease', pointerEvents:'none', userSelect:'none' }} />
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', background:'radial-gradient(ellipse at center, transparent 20%, rgba(5,0,7,0.72) 100%)' }} />
    </>
  )
}

function ScratchCard({
  code,
  overlayColor = '#2a1a2e',
  label,
  textColor,
  accentColor = '#c41428',
  width = 360,
  height = 160,
  revealThreshold = 55,
  difficulty = 'normal',
}: {
  code: string
  overlayColor?: string
  label?: string
  textColor?: string
  accentColor?: string
  width?: number
  height?: number
  revealThreshold?: number
  difficulty?: ScratchDifficulty
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [percent,  setPercent]  = useState(0)
  const isDrawing  = useRef(false)
  const [copied,   setCopied]   = useState(false)

  const brushRadius = difficultyToRadius(difficulty, height)

  const revealedBg = (() => {
    const clean = accentColor.replace('#', '')
    if (clean.length < 6) return '#0d001a'
    const n = parseInt(clean, 16)
    const r = Math.max(0, ((n >> 16) & 255) - 180)
    const g = Math.max(0, ((n >> 8)  & 255) - 180)
    const b = Math.max(0, ((n)       & 255) - 180)
    return `rgb(${r},${g},${b})`
  })()

  const difficultyHint: Record<ScratchDifficulty, string> = {
    easy: '🪙 fácil de rascar',
    normal: '🪙 scratch to reveal',
    hard: '🪙 difícil de rascar…',
    very_hard: '🪙 muy difícil — ¡no te rindas!',
  }

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const w = canvas.width, h = canvas.height

    // Gradient fill for overlay
    const grad = ctx.createLinearGradient(0, 0, w, h)
    const { r: or, g: og, b: ob } = hexToRgb(overlayColor)
    grad.addColorStop(0, `rgba(${Math.min(255,or+18)},${Math.min(255,og+18)},${Math.min(255,ob+18)},1)`)
    grad.addColorStop(1, `rgba(${Math.max(0,or-12)},${Math.max(0,og-12)},${Math.max(0,ob-12)},1)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Dot texture
    ctx.fillStyle = 'rgba(255,255,255,0.045)'
    for (let i = 0; i < w; i += 14) {
      for (let j = 0; j < h; j += 14) {
        ctx.beginPath(); ctx.arc(i, j, 1.2, 0, Math.PI * 2); ctx.fill()
      }
    }

    // Diagonal shimmer lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 4
    for (let i = -h; i < w + h; i += 26) {
      ctx.beginPath()
      ctx.moveTo(i, 0); ctx.lineTo(i + h, h)
      ctx.stroke()
    }

    // Inner glow border
    const borderGrad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.3, w/2, h/2, Math.min(w,h)*0.8)
    borderGrad.addColorStop(0, 'rgba(255,255,255,0)')
    borderGrad.addColorStop(1, 'rgba(255,255,255,0.06)')
    ctx.fillStyle = borderGrad
    ctx.fillRect(0, 0, w, h)

    // Main label
    const topText = label || '✦ scratch to reveal ✦'
    const labelColor = textColor || 'rgba(255,255,255,0.6)'
    ctx.fillStyle = labelColor
    ctx.font = `bold ${Math.min(15, Math.floor(h / 10))}px Space Mono, monospace`
    ctx.textAlign = 'center'
    ctx.shadowBlur = 8
    ctx.shadowColor = 'rgba(255,255,255,0.2)'
    ctx.fillText(topText, w / 2, h / 2 - 10)
    ctx.shadowBlur = 0

    // Sub-label
    ctx.font = `${Math.min(10, Math.floor(h / 14))}px Space Mono, monospace`
    ctx.fillStyle = textColor ? `${textColor}77` : 'rgba(255,255,255,0.28)'
    ctx.fillText('tu premio está debajo', w / 2, h / 2 + 14)

    // Difficulty hint
    const hint = difficultyHint[difficulty]
    ctx.font = `${Math.min(9, Math.floor(h / 16))}px Space Mono, monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillText(hint, w / 2, h - 18)

    // Brush size indicator dots (visual hint of difficulty)
    if (difficulty === 'hard' || difficulty === 'very_hard') {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      const dotR = brushRadius / 2
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(20 + i * (dotR * 2 + 6), h / 2, dotR, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [overlayColor, label, textColor, height, difficulty, brushRadius])

  useEffect(() => { initCanvas() }, [initCanvas])

  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, brushRadius, 0, Math.PI * 2)
    ctx.fill()
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let transparent = 0
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] < 128) transparent++
    }
    const pct = (transparent / (canvas.width * canvas.height)) * 100
    setPercent(pct)
    if (pct > revealThreshold) setRevealed(true)
  }, [brushRadius, revealThreshold])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  return (
    <div style={{ position: 'relative', userSelect: 'none', width: '100%', maxWidth: width }}>
      {/* Revealed reward area */}
      <div style={{
        borderRadius: 14,
        background: `linear-gradient(135deg, ${revealedBg} 0%, #0d001a 100%)`,
        border: `1px solid ${accentColor}44`,
        padding: `${Math.floor(height * 0.15)}px 20px`,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        boxSizing: 'border-box',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${accentColor}18 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 16, opacity: 0.1 }}>✦</div>
        <div style={{ position: 'absolute', bottom: 10, left: 14, fontSize: 16, opacity: 0.1 }}>✦</div>

        <div style={{
          fontFamily: 'monospace', fontSize: Math.min(22, Math.floor(height / 7)),
          letterSpacing: '0.22em', color: '#fff', padding: '8px 0',
          textShadow: `0 0 20px ${accentColor}88, 0 0 40px ${accentColor}44`,
          wordBreak: 'break-all',
        }}>
          {code}
        </div>
        <button onClick={copy} style={{
          ...S, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
          background: copied ? `${accentColor}33` : 'rgba(255,255,255,0.06)',
          border: `1px solid ${copied ? accentColor + '66' : 'rgba(255,255,255,0.12)'}`,
          color: copied ? accentColor : 'rgba(255,255,255,0.5)',
          transition: 'all 0.2s',
        }}>
          {copied ? '✓ copiado!' : 'copiar código'}
        </button>
      </div>

      {/* Scratch overlay canvas */}
      {!revealed && (
        <canvas
          ref={canvasRef}
          width={width * 2}
          height={height * 2}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            borderRadius: 14, cursor: 'crosshair', touchAction: 'none',
          }}
          onMouseDown={e => { isDrawing.current = true; scratch(getPos(e).x, getPos(e).y) }}
          onMouseMove={e => { if (isDrawing.current) scratch(getPos(e).x, getPos(e).y) }}
          onMouseUp={() => { isDrawing.current = false }}
          onMouseLeave={() => { isDrawing.current = false }}
          onTouchStart={e => { isDrawing.current = true; scratch(getPos(e).x, getPos(e).y) }}
          onTouchMove={e => { if (isDrawing.current) scratch(getPos(e).x, getPos(e).y) }}
          onTouchEnd={() => { isDrawing.current = false }}
        />
      )}

      {/* Progress bar */}
      {!revealed && percent > 5 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${Math.min(100, (percent / revealThreshold) * 100)}%`,
              background: `linear-gradient(90deg, ${accentColor}88, ${accentColor})`,
              transition: 'width 0.1s ease',
            }} />
          </div>
          {percent < revealThreshold && (
            <div style={{ ...S, fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 5, letterSpacing: '0.1em' }}>
              {Math.round((percent / revealThreshold) * 100)}% — sigue raspando…
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StandardReward({ reward }: { reward: Reward }) {
  if (reward.scratchCard) {
    return (
      <div style={{ animation:'fadeUp 0.4s ease' }}>
        {reward.rewardTitle && <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:20, color:'var(--text)', marginBottom:16, textAlign:'center' }}>{reward.rewardTitle}</div>}
        <ScratchCard
          code={reward.rewardContent}
          overlayColor={reward.scratchCardColor ?? '#2a1a2e'}
          label={reward.scratchCardLabel ?? undefined}
          textColor={reward.scratchTextColor ?? undefined}
          accentColor={reward.scratchAccentColor ?? '#c41428'}
          width={reward.scratchCardWidth ?? 360}
          height={reward.scratchCardHeight ?? 160}
          revealThreshold={reward.scratchRevealThreshold ?? 55}
          difficulty={reward.scratchDifficulty ?? 'normal'}
        />
      </div>
    )
  }
  if (reward.rewardType === 'fansly') {
    return (
      <div style={{ animation:'fadeUp 0.4s ease' }}>
        {reward.rewardTitle && <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:20, color:'var(--text)', marginBottom:16, textAlign:'center' }}>{reward.rewardTitle}</div>}
        <ScratchCard code={reward.rewardContent} overlayColor="#2a1a2e" accentColor="#1da1f2" />
      </div>
    )
  }
  return (
    <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(196,20,40,0.2)', borderRadius:16, padding:'28px 24px', textAlign:'center', animation:'fadeUp 0.4s ease' }}>
      <div style={{ fontSize:28, marginBottom:12 }}>🎁</div>
      {reward.rewardTitle && <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:20, color:'var(--text)', marginBottom:8 }}>{reward.rewardTitle}</div>}
      {reward.rewardType === 'text' && <div style={{ ...S, fontSize:13, color:'var(--text)', lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{reward.rewardContent}</div>}
      {reward.rewardType === 'link' && (
        <a href={reward.rewardContent} target="_blank" rel="noopener noreferrer"
          style={{ ...S, display:'inline-block', marginTop:8, padding:'10px 22px', borderRadius:8, background:'rgba(196,20,40,0.18)', border:'1px solid rgba(196,20,40,0.4)', color:'var(--text)', textDecoration:'none', fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', transition:'all 0.15s' }}
          onMouseEnter={e=>(e.currentTarget.style.background='rgba(196,20,40,0.28)')}
          onMouseLeave={e=>(e.currentTarget.style.background='rgba(196,20,40,0.18)')}>
          open link →
        </a>
      )}
      {reward.rewardType === 'image' && (
        <div style={{ marginTop:12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={reward.rewardContent} alt={reward.rewardTitle ?? 'reward'} style={{ maxWidth:'100%', maxHeight:400, borderRadius:10, objectFit:'contain' }} />
        </div>
      )}
      <div style={{ ...S, fontSize:9, color:'rgba(254,240,244,0.25)', marginTop:20, letterSpacing:'0.1em' }}>code redeemed successfully</div>
    </div>
  )
}

// ─── 3D Gift Box ──────────────────────────────────────────────────────────────

interface Particle { id:number; x:number; y:number; dx:number; dy:number; color:string; size:number; isCircle:boolean; rot:number; duration:number }

function GiftBox({ reward, onOpen }: { reward: Reward; onOpen: () => void }) {
  const [phase, setPhase] = useState<'idle'|'wobble'|'opening'|'open'>('idle')
  const [particles, setParticles] = useState<Particle[]>([])
  const [flashVisible, setFlashVisible] = useState(false)

  const boxColor    = reward.giftBoxColor ?? '#c41428'
  const ribbonColor = reward.giftRibbonColor ?? '#fef0f4'
  const pattern     = reward.giftPattern ?? 'none'
  const patternColor = reward.giftPatternColor ?? '#ffffff'
  const patternImage = reward.giftPatternImage

  const boxLight = lighten(boxColor, 38)
  const boxDark  = darken(boxColor, 38)
  const ribLight = lighten(ribbonColor, 28)
  const ribDark  = darken(ribbonColor, 22)

  useEffect(() => { const t = setTimeout(() => setPhase('wobble'), 400); return () => clearTimeout(t) }, [])

  const handleClick = () => {
    if (phase === 'open' || phase === 'opening') return
    setPhase('opening')
    setFlashVisible(true)
    setTimeout(() => setFlashVisible(false), 350)
    const colors = [boxColor, ribbonColor, '#ffd700', '#ff6b9d', '#a8edea', '#fed6e3', '#c7f2a4', '#fff', '#ffb347']
    const newParticles: Particle[] = Array.from({ length: 52 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2
      const speed = 55 + Math.random() * 130
      return { id:i, x:90, y:70, dx:Math.cos(angle)*speed, dy:Math.sin(angle)*speed*0.6-70-Math.random()*45, color:colors[Math.floor(Math.random()*colors.length)], size:4+Math.random()*10, isCircle:Math.random()>0.4, rot:(Math.random()-0.5)*720, duration:0.7+Math.random()*0.6 }
    })
    setParticles(newParticles)
    setTimeout(() => { setPhase('open'); onOpen() }, 860)
  }

  // ─── Improved Pattern Definitions ────────────────────────────────────────
  const renderPatternDef = () => {
    if (pattern === 'none') return null

    if (pattern === 'dots') return (
      <pattern id="gbox-pat" width="18" height="18" patternUnits="userSpaceOnUse">
        <circle cx="9" cy="9" r="3.5" fill={patternColor} opacity="0.38">
          <animate attributeName="opacity" values="0.38;0.55;0.38" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="0" cy="0" r="2" fill={patternColor} opacity="0.18" />
        <circle cx="18" cy="0" r="2" fill={patternColor} opacity="0.18" />
        <circle cx="0" cy="18" r="2" fill={patternColor} opacity="0.18" />
        <circle cx="18" cy="18" r="2" fill={patternColor} opacity="0.18" />
      </pattern>
    )

    if (pattern === 'stripes') return (
      <pattern id="gbox-pat" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="14" fill={patternColor} opacity="0.22" />
        <rect x="0" width="2" height="14" fill={patternColor} opacity="0.12" />
      </pattern>
    )

    if (pattern === 'stars') return (
      <pattern id="gbox-pat" width="24" height="24" patternUnits="userSpaceOnUse">
        {/* Large star */}
        <path d="M12,3 L13.8,8.4 L19.6,8.4 L15,11.7 L16.9,17 L12,13.7 L7.1,17 L9,11.7 L4.4,8.4 L10.2,8.4 Z" fill={patternColor} opacity="0.45" />
        {/* Tiny corner stars */}
        <path d="M0,0 L0.7,2 L2.5,2 L1.1,3.2 L1.8,5 L0,3.8 L-1.8,5 L-1.1,3.2 L-2.5,2 L-0.7,2 Z" fill={patternColor} opacity="0.2" transform="translate(2,22)" />
        <path d="M0,0 L0.7,2 L2.5,2 L1.1,3.2 L1.8,5 L0,3.8 L-1.8,5 L-1.1,3.2 L-2.5,2 L-0.7,2 Z" fill={patternColor} opacity="0.2" transform="translate(22,2)" />
      </pattern>
    )

    if (pattern === 'hearts') return (
      <pattern id="gbox-pat" width="24" height="24" patternUnits="userSpaceOnUse">
        {/* Large heart */}
        <path d="M12,18.5 C12,18.5 4,12.5 4,7.5 C4,4.9 6.1,3 8.5,3 C10.2,3 11.7,4 12,4.3 C12.3,4 13.8,3 15.5,3 C17.9,3 20,4.9 20,7.5 C20,12.5 12,18.5 12,18.5 Z" fill={patternColor} opacity="0.38" />
        {/* Small corner hearts */}
        <path d="M2,5.5 C2,5.5 0,4 0,2.5 C0,1.5 0.8,1 1.5,1 C1.8,1 2,1.2 2,1.2 C2,1.2 2.2,1 2.5,1 C3.2,1 4,1.5 4,2.5 C4,4 2,5.5 2,5.5 Z" fill={patternColor} opacity="0.2" transform="translate(20,18)" />
      </pattern>
    )

    if (pattern === 'checks') return (
      <pattern id="gbox-pat" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill={patternColor} opacity="0.22" />
        <rect x="8" y="8" width="8" height="8" fill={patternColor} opacity="0.22" />
        <rect x="1" y="1" width="6" height="6" fill={patternColor} opacity="0.08" />
        <rect x="9" y="9" width="6" height="6" fill={patternColor} opacity="0.08" />
      </pattern>
    )

    if (pattern === 'diamonds') return (
      <pattern id="gbox-pat" width="20" height="20" patternUnits="userSpaceOnUse">
        <polygon points="10,2 18,10 10,18 2,10" fill={patternColor} opacity="0.3" />
        <polygon points="10,5 15,10 10,15 5,10" fill="none" stroke={patternColor} strokeWidth="0.8" opacity="0.2" />
      </pattern>
    )

    if (pattern === 'waves') return (
      <pattern id="gbox-pat" width="28" height="14" patternUnits="userSpaceOnUse">
        <path d="M0,7 Q7,0 14,7 Q21,14 28,7" fill="none" stroke={patternColor} strokeWidth="2" opacity="0.28" />
        <path d="M0,14 Q7,7 14,14 Q21,21 28,14" fill="none" stroke={patternColor} strokeWidth="2" opacity="0.15" />
      </pattern>
    )

    if (pattern === 'zigzag') return (
      <pattern id="gbox-pat" width="20" height="10" patternUnits="userSpaceOnUse">
        <polyline points="0,10 5,0 10,10 15,0 20,10" fill="none" stroke={patternColor} strokeWidth="2" opacity="0.28" strokeLinejoin="round" />
      </pattern>
    )

    if (pattern === 'custom' && patternImage) return (
      <pattern id="gbox-pat" width="40" height="40" patternUnits="userSpaceOnUse">
        <image href={patternImage} width="40" height="40" preserveAspectRatio="xMidYMid slice" />
      </pattern>
    )
    return null
  }

  const patternFill = pattern !== 'none' && (pattern !== 'custom' || patternImage) ? 'url(#gbox-pat)' : 'none'
  const isOpening = phase === 'opening' || phase === 'open'

  return (
    <div style={{ textAlign:'center', padding:'12px 0 24px' }}>
      <div style={{ ...S, fontSize:9, color:'rgba(254,240,244,0.3)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:20 }}>
        {phase === 'open' ? 'enjoy your reward ✦' : 'tap the gift to open it ✦'}
      </div>

      <div style={{ position:'relative', display:'inline-block' }}>
        {/* Confetti */}
        {particles.map(p => (
          <div key={p.id} style={{ position:'absolute', left:p.x, top:p.y, width:p.size, height:p.isCircle?p.size:p.size*0.55, borderRadius:p.isCircle?'50%':'2px', background:p.color, animation:`confetti-${p.id%8} ${p.duration}s ease-out forwards`, '--dx':`${p.dx}px`, '--dy':`${p.dy}px`, '--rot':`${p.rot}deg`, transformOrigin:'center', pointerEvents:'none', zIndex:10 } as React.CSSProperties} />
        ))}

        {/* Flash */}
        {flashVisible && <div style={{ position:'absolute', inset:-20, borderRadius:'50%', zIndex:9, pointerEvents:'none', background:'radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 70%)', animation:'flashOut 0.35s ease-out forwards' }} />}

        {/* SVG Gift */}
        <div onClick={handleClick} style={{ display:'inline-block', cursor:phase==='open'?'default':'pointer', position:'relative', animation:phase==='wobble'?'giftWobble 1.4s ease-in-out infinite':phase==='opening'?'giftPop 0.55s ease-out forwards':phase==='open'?'giftFadeOut 0.3s ease-out 0.1s both':'none', filter:phase==='wobble'?`drop-shadow(0 0 18px ${ribbonColor}55) drop-shadow(0 12px 20px rgba(0,0,0,0.5))`:'drop-shadow(0 12px 20px rgba(0,0,0,0.5))' }}>
          <svg width="180" height="210" viewBox="0 0 180 210" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {renderPatternDef()}
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={boxLight} /><stop offset="40%" stopColor={boxColor} /><stop offset="100%" stopColor={boxDark} />
              </linearGradient>
              <linearGradient id="lidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={boxLight} /><stop offset="100%" stopColor={boxColor} />
              </linearGradient>
              <linearGradient id="sideShadow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(0,0,0,0.14)" /><stop offset="45%" stopColor="rgba(0,0,0,0)" /><stop offset="82%" stopColor="rgba(0,0,0,0)" /><stop offset="100%" stopColor="rgba(0,0,0,0.24)" />
              </linearGradient>
              <linearGradient id="ribGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={ribDark} /><stop offset="28%" stopColor={ribLight} /><stop offset="72%" stopColor={ribLight} /><stop offset="100%" stopColor={ribDark} />
              </linearGradient>
              <linearGradient id="ribGradV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ribLight} /><stop offset="100%" stopColor={ribDark} />
              </linearGradient>
              <filter id="bowGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {/* Subtle gloss overlay */}
              <linearGradient id="glossGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>

            {/* Ground shadow */}
            <ellipse cx="90" cy="198" rx="54" ry="7" fill="rgba(0,0,0,0.32)" />

            {/* Box body */}
            <g style={{ transformOrigin:'90px 140px', opacity:isOpening?0.12:1, transition:'opacity 0.4s ease 0.45s' }}>
              <rect x="16" y="90" width="148" height="102" rx="8" fill="url(#bodyGrad)" />
              <rect x="16" y="90" width="148" height="102" rx="8" fill={patternFill} opacity="0.75" />
              <rect x="16" y="90" width="148" height="102" rx="8" fill="url(#sideShadow)" />
              {/* Gloss sheen */}
              <rect x="16" y="90" width="148" height="50" rx="8" fill="url(#glossGrad)" />
              <rect x="16" y="90" width="148" height="18" rx="8" fill="rgba(255,255,255,0.1)" />
              <rect x="16" y="170" width="148" height="22" rx="6" fill="rgba(0,0,0,0.2)" />
              {/* Vertical ribbon body */}
              <rect x="74" y="90" width="32" height="102" fill="url(#ribGradV)" opacity="0.92" />
              <rect x="74" y="90" width="32" height="102" fill={patternFill} opacity="0.32" />
              <rect x="76" y="90" width="10" height="102" fill="rgba(255,255,255,0.18)" />
              {/* Horizontal ribbon */}
              <rect x="16" y="120" width="148" height="22" fill="url(#ribGrad)" opacity="0.92" />
              <rect x="16" y="120" width="148" height="22" fill={patternFill} opacity="0.32" />
              <rect x="16" y="120" width="148" height="7" fill="rgba(255,255,255,0.18)" />
            </g>

            {/* Lid group */}
            <g style={{ transformOrigin:'90px 75px', animation:isOpening?'lidFly 0.72s cubic-bezier(0.2,0,0.8,1) forwards':'none' }}>
              <rect x="12" y="56" width="156" height="40" rx="8" fill="url(#lidGrad)" />
              <rect x="12" y="56" width="156" height="40" rx="8" fill={patternFill} opacity="0.75" />
              <rect x="12" y="56" width="156" height="40" rx="8" fill="url(#sideShadow)" />
              {/* Gloss sheen lid */}
              <rect x="12" y="56" width="156" height="20" rx="8" fill="url(#glossGrad)" />
              <rect x="12" y="56" width="156" height="14" rx="8" fill="rgba(255,255,255,0.18)" />
              <rect x="12" y="84" width="156" height="12" rx="4" fill="rgba(0,0,0,0.15)" />
              {/* Lid ribbon */}
              <rect x="74" y="56" width="32" height="40" fill="url(#ribGradV)" opacity="0.92" />
              <rect x="76" y="56" width="10" height="40" fill="rgba(255,255,255,0.2)" />
              <rect x="12" y="68" width="156" height="18" fill="url(#ribGrad)" opacity="0.92" />
              <rect x="12" y="68" width="156" height="6" fill="rgba(255,255,255,0.2)" />

              {/* Bow */}
              <g filter="url(#bowGlow)">
                {/* Back petals */}
                <ellipse cx="66" cy="50" rx="23" ry="10" fill={ribDark} opacity="0.75" transform="rotate(-38 90 56)" />
                <ellipse cx="114" cy="50" rx="23" ry="10" fill={ribDark} opacity="0.75" transform="rotate(38 90 56)" />
                {/* Front left petal */}
                <ellipse cx="66" cy="46" rx="25" ry="11.5" fill={ribbonColor} transform="rotate(-30 90 56)" />
                <ellipse cx="64" cy="43" rx="15" ry="6.5" fill={ribLight} opacity="0.65" transform="rotate(-30 90 56)" />
                {/* Front right petal */}
                <ellipse cx="114" cy="46" rx="25" ry="11.5" fill={ribbonColor} transform="rotate(30 90 56)" />
                <ellipse cx="116" cy="43" rx="15" ry="6.5" fill={ribLight} opacity="0.65" transform="rotate(30 90 56)" />
                {/* Center knot */}
                <ellipse cx="90" cy="56" rx="13.5" ry="11.5" fill={ribbonColor} />
                <ellipse cx="87" cy="52" rx="7.5" ry="5.5" fill={ribLight} opacity="0.78" />
                <ellipse cx="91" cy="62" rx="8" ry="4" fill={ribDark} opacity="0.38" />
                {/* Knot sheen */}
                <ellipse cx="88" cy="51" rx="4" ry="3" fill="rgba(255,255,255,0.25)" />
              </g>

              {/* Sparkles (wobble only) */}
              {phase === 'wobble' && (
                <>
                  <circle cx="22" cy="36" r="3.5" fill={ribbonColor} opacity="0.7" style={{ animation:'sparkle 1.8s ease-in-out infinite 0s' }} />
                  <circle cx="158" cy="26" r="2.5" fill={ribbonColor} opacity="0.6" style={{ animation:'sparkle 1.8s ease-in-out infinite 0.35s' }} />
                  <circle cx="166" cy="62" r="3" fill={boxLight} opacity="0.8" style={{ animation:'sparkle 1.8s ease-in-out infinite 0.7s' }} />
                  <circle cx="14" cy="70" r="2.5" fill={ribbonColor} opacity="0.6" style={{ animation:'sparkle 1.8s ease-in-out infinite 1.1s' }} />
                  <path d="M148,42 L150,38 L152,42 L156,44 L152,46 L150,50 L148,46 L144,44 Z" fill={ribLight} opacity="0.5" style={{ animation:'sparkle 2.1s ease-in-out infinite 0.2s' }} />
                  <path d="M26,76 L27.5,72 L29,76 L33,77.5 L29,79 L27.5,83 L26,79 L22,77.5 Z" fill={ribLight} opacity="0.45" style={{ animation:'sparkle 2.1s ease-in-out infinite 0.9s' }} />
                </>
              )}
            </g>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes giftWobble { 0%,100%{transform:rotate(0deg) scale(1)} 15%{transform:rotate(-5deg) scale(1.05)} 30%{transform:rotate(5deg) scale(1.05)} 45%{transform:rotate(-3deg) scale(1.02)} 60%{transform:rotate(3deg) scale(1.02)} 80%{transform:rotate(-1deg) scale(1.01)} }
        @keyframes giftPop { 0%{transform:scale(1) rotate(0deg)} 30%{transform:scale(1.22) rotate(3deg)} 60%{transform:scale(0.9) rotate(-1.5deg)} 100%{transform:scale(1.05) rotate(0deg)} }
        @keyframes giftFadeOut { from{opacity:1;transform:scale(1.05)} to{opacity:0;transform:scale(0.85) translateY(20px)} }
        @keyframes lidFly { 0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1} 20%{transform:translateY(-18px) rotate(-8deg) scale(1.05);opacity:1} 100%{transform:translateY(-180px) rotate(-32deg) scale(0.7);opacity:0} }
        @keyframes sparkle { 0%,100%{opacity:0.15;transform:scale(0.7)} 50%{opacity:1;transform:scale(1.55)} }
        @keyframes flashOut { 0%{opacity:1} 100%{opacity:0;transform:scale(2.5)} }
        @keyframes confetti-0 { to{transform:translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0} }
        @keyframes confetti-1 { to{transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(0.3);opacity:0} }
        @keyframes confetti-2 { 60%{opacity:1} to{transform:translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0} }
        @keyframes confetti-3 { 40%{opacity:0.8} to{transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(0.5);opacity:0} }
        @keyframes confetti-4 { to{transform:translate(calc(var(--dx) * 1.2),var(--dy)) rotate(var(--rot));opacity:0} }
        @keyframes confetti-5 { to{transform:translate(var(--dx),calc(var(--dy) * 1.3)) rotate(var(--rot));opacity:0} }
        @keyframes confetti-6 { 50%{opacity:0.9;transform:translate(calc(var(--dx)*0.6),calc(var(--dy)*0.6)) rotate(calc(var(--rot)*0.5))} to{transform:translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0} }
        @keyframes confetti-7 { to{transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(0.4);opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

// ─── Redeem Page ──────────────────────────────────────────────────────────────

export default function RedeemPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reward, setReward] = useState<Reward | null>(null)
  const [giftOpened, setGiftOpened] = useState(false)
  const [showReward, setShowReward] = useState(false)

  const handleGiftOpen = () => {
    setGiftOpened(true)
    setTimeout(() => setShowReward(true), 320)
  }

  const submit = async () => {
    if (!code.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/redeem', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ code: code.trim() }) })
      const data = await res.json()
      if (!res.ok) {
        const msgs: Record<number, string> = { 404:'Invalid code. Check for typos.', 410:'This code has already been used.' }
        setError(msgs[res.status] ?? (data.error ?? 'Something went wrong.'))
      } else {
        setReward(data); setGiftOpened(false); setShowReward(false)
      }
    } catch { setError('Connection error. Please try again.') }
    finally { setLoading(false) }
  }

  const fieldStyle: React.CSSProperties = {
    width:'100%', padding:'12px 16px', boxSizing:'border-box',
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(196,20,40,0.25)',
    borderRadius:10, color:'var(--text)', fontFamily:'Space Mono, monospace',
    fontSize:15, letterSpacing:'0.12em', textTransform:'uppercase',
    outline:'none', textAlign:'center', transition:'border-color 0.15s',
  }

  return (
    <>
      <ReokiyBackground />
      <main style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', padding:'24px 16px', position:'relative', zIndex:1 }}>
        <div style={{ width:'100%', maxWidth:420 }}>
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:32, color:'var(--text)', lineHeight:1 }}>redeem</div>
            <div style={{ ...S, fontSize:10, color:'rgba(254,240,244,0.3)', letterSpacing:'0.14em', textTransform:'uppercase', marginTop:8 }}>enter your code below</div>
          </div>

          {reward ? (
            <>
              {reward.giftAnimation && !giftOpened ? (
                <GiftBox reward={reward} onOpen={handleGiftOpen} />
              ) : reward.giftAnimation && giftOpened && !showReward ? (
                <div style={{ height:80 }} />
              ) : (
                <div style={{ animation:'fadeUp 0.5s ease both' }}>
                  <StandardReward reward={reward} />
                </div>
              )}
            </>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input value={code} onChange={e=>{ setCode(e.target.value.toUpperCase()); setError('') }} onKeyDown={e=>{ if(e.key==='Enter') submit() }} placeholder="XXXXXXXX" maxLength={32} autoFocus autoComplete="off" spellCheck={false} style={fieldStyle}
                onFocus={e=>(e.currentTarget.style.borderColor='rgba(196,20,40,0.55)')}
                onBlur={e=>(e.currentTarget.style.borderColor='rgba(196,20,40,0.25)')} />
              {error && <div style={{ ...S, fontSize:10, color:'var(--primary)', textAlign:'center', letterSpacing:'0.06em' }}>{error}</div>}
              <button type="button" onClick={submit} disabled={loading || !code.trim()}
                style={{ ...S, padding:'12px 0', background:loading||!code.trim()?'rgba(196,20,40,0.06)':'rgba(196,20,40,0.18)', border:'1px solid rgba(196,20,40,0.4)', borderRadius:10, color:loading||!code.trim()?'var(--text-muted)':'var(--text)', fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase', cursor:loading||!code.trim()?'not-allowed':'pointer', transition:'all 0.15s' }}
                onMouseEnter={e=>{ if(!loading&&code.trim()) e.currentTarget.style.background='rgba(196,20,40,0.28)' }}
                onMouseLeave={e=>{ e.currentTarget.style.background=loading||!code.trim()?'rgba(196,20,40,0.06)':'rgba(196,20,40,0.18)' }}>
                {loading ? 'checking…' : 'redeem'}
              </button>
            </div>
          )}
        </div>
        <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>
      </main>
    </>
  )
}