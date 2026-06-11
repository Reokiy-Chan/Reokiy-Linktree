'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { RedeemCode, RewardType, GiftPattern, ScratchDifficulty, GiftStyle, ScratchStyle } from '@/app/lib/codes'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

const BADGE: Record<RewardType | 'used', { label: string; color: string }> = {
  link:   { label: 'link',   color: '#3b8af7' },
  text:   { label: 'text',   color: '#ff8030' },
  image:  { label: 'image',  color: '#a855f7' },
  fansly: { label: 'fansly', color: '#1da1f2' },
  used:   { label: 'used',   color: 'rgba(254,240,244,0.18)' },
}

function Badge({ type, used }: { type: RewardType; used: boolean }) {
  const b = used ? BADGE.used : BADGE[type]
  return (
    <span style={{
      ...S, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 20,
      border: `1px solid ${b.color}44`,
      background: `${b.color}18`,
      color: b.color,
    }}>{used ? 'used' : b.label}</span>
  )
}

// ─── Content hint per type ───────────────────────────────────────────────────

const CONTENT_META: Record<RewardType, { label: string; placeholder: string; isCode?: boolean; isUrl?: boolean }> = {
  text:   { label: 'Text content',       placeholder: 'The message the user will see…' },
  link:   { label: 'URL',                placeholder: 'https://…',                      isUrl: true },
  image:  { label: 'Image URL',          placeholder: 'https://i.imgur.com/…',          isUrl: true },
  fansly: { label: 'Subscription code', placeholder: 'e.g. FANSLY-XXXX-XXXX',         isCode: true },
}

const GIFT_PATTERNS: { value: GiftPattern; label: string }[] = [
  { value: 'none',     label: 'No Pattern' },
  { value: 'dots',     label: 'Dots' },
  { value: 'stripes',  label: 'Stripes' },
  { value: 'stars',    label: 'Stars' },
  { value: 'hearts',   label: 'Hearts' },
  { value: 'checks',   label: 'Checks' },
  { value: 'diamonds', label: 'Diamonds' },
  { value: 'waves',    label: 'Waves' },
  { value: 'zigzag',   label: 'Zigzag' },
  { value: 'custom',   label: 'Custom Image' },
]

const SCRATCH_DIFFICULTIES: { value: string; label: string; hint: string }[] = [
  { value: 'easy',      label: 'Easy',        hint: 'Silvy Dick is easy aswell :3' },
  { value: 'normal',    label: 'Normal',      hint: 'Standard Size' },
  { value: 'hard',      label: 'Hard',        hint: 'like lucy dih :3' },
  { value: 'very_hard', label: 'Very Hard',   hint: 'OH SHI THIS IS SO HARD' },
]

// ─── Mini GiftBox preview ────────────────────────────────────────────────────

function GiftBoxPreview({
  boxColor, ribbonColor, pattern, patternColor, patternImage,
}: {
  boxColor: string; ribbonColor: string; pattern: GiftPattern;
  patternColor?: string; patternImage?: string | null;
}) {
  const patternId = `prev-pat-${pattern}`

  const renderPattern = () => {
    if (pattern === 'none') return null
    if (pattern === 'dots') return (
      <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="6" cy="6" r="2.5" fill={patternColor ?? '#fff'} opacity="0.35" />
      </pattern>
    )
    if (pattern === 'stripes') return (
      <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="10" fill={patternColor ?? '#fff'} opacity="0.25" />
      </pattern>
    )
    if (pattern === 'stars') return (
      <pattern id={patternId} width="14" height="14" patternUnits="userSpaceOnUse">
        <text x="3" y="11" fontSize="10" fill={patternColor ?? '#fff'} opacity="0.3">★</text>
      </pattern>
    )
    if (pattern === 'hearts') return (
      <pattern id={patternId} width="14" height="14" patternUnits="userSpaceOnUse">
        <text x="2" y="11" fontSize="10" fill={patternColor ?? '#fff'} opacity="0.3">♥</text>
      </pattern>
    )
    if (pattern === 'checks') return (
      <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="5" height="5" fill={patternColor ?? '#fff'} opacity="0.2" />
        <rect x="5" y="5" width="5" height="5" fill={patternColor ?? '#fff'} opacity="0.2" />
      </pattern>
    )
    if (pattern === 'custom' && patternImage) return (
      <pattern id={patternId} width="30" height="30" patternUnits="userSpaceOnUse">
        <image href={patternImage} width="30" height="30" preserveAspectRatio="xMidYMid slice" />
      </pattern>
    )
    return null
  }

  const patternFill = pattern !== 'none' && (pattern !== 'custom' || patternImage)
    ? `url(#${patternId})`
    : 'transparent'

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
      <svg width="60" height="68" viewBox="0 0 140 160" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>
        <defs>{renderPattern()}</defs>
        {/* Lid */}
        <rect x="14" y="38" width="112" height="28" rx="4" fill={boxColor} />
        <rect x="14" y="38" width="112" height="28" rx="4" fill={patternFill} />
        <rect x="62" y="38" width="16" height="28" fill={ribbonColor} opacity="0.9" />
        <rect x="14" y="48" width="112" height="8" fill={ribbonColor} opacity="0.9" />
        <ellipse cx="70" cy="38" rx="9" ry="9" fill={ribbonColor} />
        {/* Body */}
        <rect x="10" y="66" width="120" height="86" rx="6" fill={boxColor} />
        <rect x="10" y="66" width="120" height="86" rx="6" fill={patternFill} />
        <rect x="62" y="66" width="16" height="86" fill={ribbonColor} opacity="0.85" />
        <rect x="10" y="96" width="120" height="12" fill={ribbonColor} opacity="0.85" />
      </svg>
      <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.2)', alignSelf: 'center', marginLeft: 10 }}>preview</div>
    </div>
  )
}

function Modal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: RedeemCode) => void }) {
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [rewardType, setRewardType] = useState<RewardType>('text')
  const [code, setCode]             = useState('')
  const [label, setLabel]           = useState('')
  const [rewardTitle, setRewardTitle] = useState('')
  const [rewardContent, setRewardContent] = useState('')
  const [imgFile, setImgFile]       = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  // Gift animation
  const [giftAnimation, setGiftAnimation]     = useState(false)
  const [giftStyle, setGiftStyle]             = useState<GiftStyle>('modern')
  const [giftBoxColor, setGiftBoxColor]       = useState('#c41428')
  const [giftRibbonColor, setGiftRibbonColor] = useState('#fef0f4')
  const [giftPattern, setGiftPattern]         = useState<GiftPattern>('none')
  const [giftPatternColor, setGiftPatternColor] = useState('#ffffff')
  const [giftPatternImage, setGiftPatternImage] = useState<string | null>(null)
  const [patternFile, setPatternFile]           = useState<File | null>(null)

  // Scratch card
  const [scratchCard, setScratchCard]           = useState(false)
  const [scratchStyle, setScratchStyle]         = useState<ScratchStyle>('lottery')
  const [scratchCardColor, setScratchCardColor] = useState('#2a1a2e')
  const [scratchCardLabel, setScratchCardLabel] = useState('')
  const [scratchDifficulty, setScratchDifficulty] = useState<ScratchDifficulty>('normal')

  // Multi-use
  const [maxUsesMode, setMaxUsesMode]   = useState<'single' | 'multi' | 'unlimited'>('single')
  const [maxUsesCount, setMaxUsesCount] = useState('5')

  const fileRef        = useRef<HTMLInputElement>(null)
  const patternFileRef = useRef<HTMLInputElement>(null)

  const genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    setCode(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
  }

  const pickFile = (f: File) => {
    setImgFile(f)
    setImgPreview(URL.createObjectURL(f))
    setRewardContent('')
  }

  const pickPatternFile = (f: File) => {
    setPatternFile(f)
    setGiftPatternImage(URL.createObjectURL(f))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!code.trim()) { setError('Code is required'); return }

    let content = rewardContent.trim()
    let patternImageUrl = giftPatternImage

    // Upload reward image if needed
    if (rewardType === 'image' && imgFile) {
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', imgFile)
        const r = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const d = await r.json()
        if (!r.ok) { setError(d.error ?? 'Upload failed'); setUploading(false); return }
        content = d.url
      } catch {
        setError('Upload failed'); setUploading(false); return
      }
      setUploading(false)
    }

    // Upload pattern image if custom
    if (giftPattern === 'custom' && patternFile) {
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', patternFile)
        const r = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const d = await r.json()
        if (!r.ok) { setError(d.error ?? 'Pattern upload failed'); setUploading(false); return }
        patternImageUrl = d.url
      } catch {
        setError('Pattern upload failed'); setUploading(false); return
      }
      setUploading(false)
    }

    if (!content) { setError('Reward content is required'); return }

    setSaving(true)
    try {
      const r = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          label: label.trim() || code.trim(),
          rewardType,
          rewardContent: content,
          rewardTitle: rewardTitle.trim(),
          giftAnimation,
          giftStyle,
          giftBoxColor,
          giftRibbonColor,
          giftPattern,
          giftPatternColor,
          giftPatternImage: patternImageUrl,
          scratchCard,
          scratchStyle,
          scratchCardColor,
          scratchCardLabel: scratchCardLabel.trim(),
          scratchDifficulty,
          maxUses: maxUsesMode === 'unlimited' ? null : maxUsesMode === 'multi' ? (parseInt(maxUsesCount) || 1) : 1,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? 'Error creating code'); setSaving(false); return }
      onCreated(d.code)
      setStep('done')
    } catch { setError('Network error') }
    setSaving(false)
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)',
    borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 11,
    outline: 'none', transition: 'border-color 0.15s',
  }
  const focusStyle = { borderColor: 'rgba(196,20,40,0.5)' }
  const blurStyle  = { borderColor: 'rgba(196,20,40,0.2)' }

  const ALL_TYPES: RewardType[] = ['text', 'link', 'image', 'fansly']

  const sectionStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(196,20,40,0.12)',
    borderRadius: 10, padding: '14px 14px',
  }
  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
    background: on ? 'rgba(196,20,40,0.7)' : 'rgba(255,255,255,0.1)',
    position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 12,
  })
  const toggleKnob = (on: boolean): React.CSSProperties => ({
    position: 'absolute', top: 3, left: on ? 21 : 3,
    width: 16, height: 16, borderRadius: '50%',
    background: '#fff', transition: 'left 0.2s',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,0,7,0.85)', backdropFilter: 'blur(8px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)',
        borderRadius: 16, padding: 28, margin: 16,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {step === 'done' ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ ...S, fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>Code created</div>
            <div style={{ ...S, fontSize: 20, fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '0.15em', marginBottom: 20 }}>{code.toUpperCase()}</div>
            <button onClick={onClose} style={{ ...S, padding: '9px 24px', background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8, color: 'var(--text)', fontSize: 11, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ ...S, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)' }}>new code</div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div  onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* ── Code ── */}
              <div>
                <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Code</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMM3R24"
                    style={{ ...fieldStyle, flex: 1, fontFamily: 'monospace', letterSpacing: '0.1em', fontSize: 13 }}
                    onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                    onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
                  />
                  <button type="button" onClick={genCode} style={{ ...S, padding: '0 12px', background: 'rgba(196,20,40,0.1)', border: '1px solid rgba(196,20,40,0.25)', borderRadius: 8, color: 'rgba(254,240,244,0.6)', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    generate
                  </button>
                </div>
              </div>

              {/* ── Admin label ── */}
              <div>
                <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Admin note (optional)</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Summer giveaway"
                  style={fieldStyle}
                  onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                  onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
                />
              </div>

              {/* ── Reward type ── */}
              <div>
                <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Reward type</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ALL_TYPES.map(t => (
                    <button key={t} type="button"
                      onClick={() => { setRewardType(t); setRewardContent(''); setImgFile(null); setImgPreview(null) }}
                      style={{
                        ...S, flex: '1 1 calc(25% - 6px)', minWidth: 64, padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontSize: 9,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        background: rewardType === t ? `${BADGE[t].color}22` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${rewardType === t ? BADGE[t].color + '66' : 'rgba(255,255,255,0.08)'}`,
                        color: rewardType === t ? BADGE[t].color : 'rgba(254,240,244,0.4)',
                        transition: 'all 0.15s',
                      }}
                    >{t}</button>
                  ))}
                </div>
                <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.22)', marginTop: 6, letterSpacing: '0.06em' }}>
                  {rewardType === 'fansly' && '✦ Users will scratch a card to reveal the code'}
                  {rewardType === 'link'   && '✦ A button to open the URL will be shown'}
                  {rewardType === 'image'  && '✦ The image will be displayed to the user'}
                  {rewardType === 'text'   && '✦ The text message will be displayed to the user'}
                </div>
              </div>

              {/* ── Reward title ── */}
              <div>
                <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Reward title (shown to user)</label>
                <input value={rewardTitle} onChange={e => setRewardTitle(e.target.value)} placeholder="e.g. Special access link"
                  style={fieldStyle}
                  onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                  onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
                />
              </div>

              {/* ── Reward content: TEXT ── */}
              {rewardType === 'text' && (
                <div>
                  <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Text content</label>
                  <textarea value={rewardContent} onChange={e => setRewardContent(e.target.value)}
                    placeholder="The message the user will see…" rows={3}
                    style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
                    onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                    onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
                  />
                </div>
              )}

              {/* ── Reward content: LINK ── */}
              {rewardType === 'link' && (
                <div>
                  <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>URL</label>
                  <input value={rewardContent} onChange={e => setRewardContent(e.target.value)}
                    placeholder="https://…" type="url"
                    style={fieldStyle}
                    onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                    onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
                  />
                </div>
              )}

              {/* ── Reward content: IMAGE ── */}
              {rewardType === 'image' && (
                <div>
                  <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Image</label>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
                  />
                  {imgPreview ? (
                    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(196,20,40,0.25)', marginBottom: 6 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgPreview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
                      <button type="button" onClick={() => { setImgFile(null); setImgPreview(null) }}
                        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(5,0,7,0.8)', border: 'none', borderRadius: 4, color: 'var(--text)', cursor: 'pointer', padding: '2px 6px', fontSize: 11 }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        ...S, border: '2px dashed rgba(196,20,40,0.25)', borderRadius: 8,
                        padding: '24px 16px', textAlign: 'center', cursor: 'pointer',
                        fontSize: 10, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(196,20,40,0.5)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(196,20,40,0.25)')}
                    >
                      click to upload · jpeg, png, gif, webp · max 10 MB<br />
                      <span style={{ fontSize: 8, opacity: 0.5 }}>stored in Vercel Blob</span>
                    </div>
                  )}
                  <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.25)', marginTop: 4 }}>or paste a URL instead:</div>
                  <input value={rewardContent} onChange={e => { setRewardContent(e.target.value); if (e.target.value) { setImgFile(null); setImgPreview(null) } }}
                    placeholder="https://i.imgur.com/…" type="url"
                    style={{ ...fieldStyle, marginTop: 6 }}
                    onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                    onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
                  />
                </div>
              )}

              {/* ── Reward content: FANSLY ── */}
              {rewardType === 'fansly' && (
                <div>
                  <label style={{ ...S, fontSize: 9, color: BADGE.fansly.color, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                    Fansly subscription code
                  </label>
                  <input
                    value={rewardContent}
                    onChange={e => setRewardContent(e.target.value)}
                    placeholder="e.g. FANSLY-XXXX-XXXX"
                    style={{ ...fieldStyle, fontFamily: 'monospace', letterSpacing: '0.08em', borderColor: `${BADGE.fansly.color}33` }}
                    onFocus={e => (e.currentTarget.style.borderColor = `${BADGE.fansly.color}77`)}
                    onBlur={e => (e.currentTarget.style.borderColor = `${BADGE.fansly.color}33`)}
                  />
                  <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.2)', marginTop: 5 }}>
                    The user will need to scratch the card to reveal this code ✦
                  </div>
                </div>
              )}

              {/* ── Gift animation section ── */}
              <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: giftAnimation ? 14 : 0 }}>
                  <div>
                    <div style={{ ...S, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.5)', marginBottom: 2 }}>
                      🎁 gift box animation
                    </div>
                    <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.2)' }}>
                      Show an animated gift that the user must open
                    </div>
                  </div>
                  <button type="button" onClick={() => setGiftAnimation(v => !v)} style={toggleStyle(giftAnimation)} aria-label="Toggle gift animation">
                    <span style={toggleKnob(giftAnimation)} />
                  </button>
                </div>

                {giftAnimation && (
                  <>
                    {/* Gift style: modern vs legacy */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Gift style</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {([
                          { v: 'modern', label: 'Modern', desc: 'new rounded look' },
                          { v: 'legacy', label: 'Legacy aspect gift', desc: 'original design' },
                        ] as const).map(o => (
                          <button key={o.v} type="button" onClick={() => setGiftStyle(o.v)}
                            style={{
                              flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                              background: giftStyle === o.v ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)',
                              border: `1px solid ${giftStyle === o.v ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}`,
                            }}>
                            <div style={{ ...S, fontSize: 9, color: giftStyle === o.v ? 'var(--text)' : 'rgba(254,240,244,0.5)', letterSpacing: '0.04em' }}>{o.label}</div>
                            <div style={{ ...S, fontSize: 7.5, color: 'rgba(254,240,244,0.3)', marginTop: 2 }}>{o.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Colors */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Box color</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="color" value={giftBoxColor} onChange={e => setGiftBoxColor(e.target.value)}
                            style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }} />
                          <input value={giftBoxColor} onChange={e => setGiftBoxColor(e.target.value)}
                            placeholder="#c41428" maxLength={7}
                            style={{ ...fieldStyle, flex: 1, fontFamily: 'monospace', fontSize: 10 }}
                            onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                            onBlur={e => Object.assign(e.currentTarget.style, blurStyle)} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Ribbon color</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="color" value={giftRibbonColor} onChange={e => setGiftRibbonColor(e.target.value)}
                            style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }} />
                          <input value={giftRibbonColor} onChange={e => setGiftRibbonColor(e.target.value)}
                            placeholder="#fef0f4" maxLength={7}
                            style={{ ...fieldStyle, flex: 1, fontFamily: 'monospace', fontSize: 10 }}
                            onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                            onBlur={e => Object.assign(e.currentTarget.style, blurStyle)} />
                        </div>
                      </div>
                    </div>

                    {/* Pattern selector */}
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Pattern</label>
                      <select
                        value={giftPattern}
                        onChange={e => { setGiftPattern(e.target.value as GiftPattern); setPatternFile(null); setGiftPatternImage(null) }}
                        style={{ ...fieldStyle, cursor: 'pointer' }}
                      >
                        {GIFT_PATTERNS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Pattern color (not for custom/none) */}
                    {giftPattern !== 'none' && giftPattern !== 'custom' && (
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Color del patrón</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="color" value={giftPatternColor} onChange={e => setGiftPatternColor(e.target.value)}
                            style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }} />
                          <input value={giftPatternColor} onChange={e => setGiftPatternColor(e.target.value)}
                            placeholder="#ffffff" maxLength={7}
                            style={{ ...fieldStyle, flex: 1, fontFamily: 'monospace', fontSize: 10 }}
                            onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                            onBlur={e => Object.assign(e.currentTarget.style, blurStyle)} />
                        </div>
                      </div>
                    )}

                    {/* Custom pattern image */}
                    {giftPattern === 'custom' && (
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Imagen del estampado</label>
                        <input ref={patternFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) pickPatternFile(f) }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button type="button" onClick={() => patternFileRef.current?.click()}
                            style={{ ...S, padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(196,20,40,0.3)', borderRadius: 7, color: 'rgba(254,240,244,0.5)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.08em' }}>
                            subir imagen
                          </button>
                          {giftPatternImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={giftPatternImage} alt="pattern preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(196,20,40,0.2)' }} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Gift box preview */}
                    <GiftBoxPreview
                      boxColor={giftBoxColor}
                      ribbonColor={giftRibbonColor}
                      pattern={giftPattern}
                      patternColor={giftPatternColor}
                      patternImage={giftPatternImage}
                    />
                  </>
                )}
              </div>

              {/* ── Scratch card section ── */}
              <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: scratchCard ? 14 : 0 }}>
                  <div>
                    <div style={{ ...S, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.5)', marginBottom: 2 }}>
                      🪄 scratch card
                    </div>
                    <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.2)' }}>
                      Make the users reveal the price :0
                    </div>
                  </div>
                  <button type="button" onClick={() => setScratchCard(v => !v)} style={toggleStyle(scratchCard)} aria-label="Toggle scratch card">
                    <span style={toggleKnob(scratchCard)} />
                  </button>
                </div>

                {scratchCard && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Scratch style */}
                    <div>
                      <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Card style</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {([
                          { v: 'lottery', label: '🎟️ Lottery ticket', desc: 'gold scratch-off' },
                          { v: 'classic', label: '🪄 Classic', desc: 'dark overlay' },
                        ] as const).map(o => (
                          <button key={o.v} type="button" onClick={() => setScratchStyle(o.v)}
                            style={{
                              flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                              background: scratchStyle === o.v ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)',
                              border: `1px solid ${scratchStyle === o.v ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}`,
                            }}>
                            <div style={{ ...S, fontSize: 9, color: scratchStyle === o.v ? 'var(--text)' : 'rgba(254,240,244,0.5)' }}>{o.label}</div>
                            <div style={{ ...S, fontSize: 7.5, color: 'rgba(254,240,244,0.3)', marginTop: 2 }}>{o.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Color de fondo</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="color" value={scratchCardColor} onChange={e => setScratchCardColor(e.target.value)}
                          style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }} />
                        <input value={scratchCardColor} onChange={e => setScratchCardColor(e.target.value)}
                          placeholder="#2a1a2e" maxLength={7}
                          style={{ ...fieldStyle, flex: 1, fontFamily: 'monospace', fontSize: 10 }}
                          onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                          onBlur={e => Object.assign(e.currentTarget.style, blurStyle)} />
                      </div>
                    </div>
                    <div>
                      <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Texto personalizado</label>
                      <input
                        value={scratchCardLabel}
                        onChange={e => setScratchCardLabel(e.target.value)}
                        placeholder="✦ scratch to reveal ✦"
                        style={fieldStyle}
                        onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                        onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
                      />
                    </div>
                    {/* Difficulty selector */}
                    <div>
                      <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>🎮 Dificultad de rascado</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                        {SCRATCH_DIFFICULTIES.map(d => (
                          <button key={d.value} type="button"
                            onClick={() => setScratchDifficulty(d.value as ScratchDifficulty)}
                            style={{
                              ...S, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                              background: scratchDifficulty === d.value ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)',
                              border: `1px solid ${scratchDifficulty === d.value ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}`,
                              transition: 'all 0.15s',
                            }}>
                            <div style={{ fontSize: 9, color: scratchDifficulty === d.value ? 'var(--text)' : 'rgba(254,240,244,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{d.label}</div>
                            <div style={{ fontSize: 7.5, color: 'rgba(254,240,244,0.25)' }}>{d.hint}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Multi-use section ── */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(196,20,40,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ ...S, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.5)', marginBottom: 4 }}>🔢 Usage</div>
                <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.2)', marginBottom: 12 }}>Define how many times this code can be used</div>
                <div style={{ display: 'flex', gap: 5, marginBottom: maxUsesMode === 'multi' ? 10 : 0 }}>
                  {(['single', 'multi', 'unlimited'] as const).map(mode => (
                    <button key={mode} type="button" onClick={() => setMaxUsesMode(mode)}
                      style={{
                        ...S, flex: 1, padding: '7px 4px', borderRadius: 7, cursor: 'pointer', fontSize: 8,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        background: maxUsesMode === mode ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${maxUsesMode === mode ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}`,
                        color: maxUsesMode === mode ? 'var(--text)' : 'rgba(254,240,244,0.4)',
                        transition: 'all 0.15s',
                      }}>
                      {mode === 'single' ? 'Once' : mode === 'multi' ? 'N Uses' : '∞ Unlimited'}
                    </button>
                  ))}
                </div>
                {maxUsesMode === 'multi' && (
                  <div>
                    <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Number of uses</label>
                    <input
                      type="number" min="2" max="9999"
                      value={maxUsesCount}
                      onChange={e => setMaxUsesCount(e.target.value)}
                      style={{ ...fieldStyle, fontFamily: 'monospace' }}
                      onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                      onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
                    />
                  </div>
                )}
                {maxUsesMode === 'unlimited' && (
                  <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.2)', marginTop: 4 }}>
                    This code is unilimited, it will never expire and will be avaliable forever ✦
                  </div>
                )}
              </div>

              {error && <div style={{ ...S, fontSize: 10, color: 'var(--primary)', textAlign: 'center' }}>{error}</div>}

              <button type="button" onClick={submit} disabled={saving || uploading}
                style={{
                  ...S, padding: '10px 0', marginTop: 4,
                  background: saving || uploading ? 'rgba(196,20,40,0.08)' : 'rgba(196,20,40,0.2)',
                  border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8,
                  color: saving || uploading ? 'var(--text-muted)' : 'var(--text)',
                  fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: saving || uploading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                }}>
                  {uploading ? 'uploading…' : saving ? 'creating…' : 'create code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function CodesPage() {
  const router = useRouter()
  const [codes, setCodes] = useState<RedeemCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'todos' | 'gift' | 'scratch' | 'link' | 'image'>('todos')

  const load = async () => {
    const r = await fetch('/api/admin/codes')
    if (r.status === 401) { router.replace('/admin/login'); return }
    const d = await r.json()
    setCodes(d.codes ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this code?')) return
    setDeleting(id)
    await fetch(`/api/admin/codes/${id}`, { method: 'DELETE' })
    setCodes(prev => prev.filter(c => c.id !== id))
    setDeleting(null)
  }

  const filteredCodes = useMemo(() => {
    if (activeFilter === 'todos') return codes
    if (activeFilter === 'gift') return codes.filter(c => c.giftAnimation)
    if (activeFilter === 'scratch') return codes.filter(c => c.scratchCard)
    if (activeFilter === 'link') return codes.filter(c => c.rewardType === 'link')
    if (activeFilter === 'image') return codes.filter(c => c.rewardType === 'image')
    return codes
  }, [codes, activeFilter])

  const usedCount  = codes.filter(c => c.used || (c.maxUses !== null && (c.useCount ?? 0) >= c.maxUses)).length
  const activeCount = codes.length - usedCount

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d`
    return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  }

  const exportCodes = () => {
    // Placeholder: implement CSV export later
    alert('CSV export not implemented yet')
  }

  return (
    <>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', lineHeight: 1.1 }}>redeem codes</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>
              {activeCount} active · {usedCount} used
            </div>
          </div>
          <button onClick={() => setShowModal(true)}
            style={{
              fontFamily: 'var(--font-body)', padding: '9px 18px',
              background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.4)',
              borderRadius: 8, color: 'var(--text)', fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,20,40,0.28)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(196,20,40,0.18)')}
          >
            + new code
          </button>
        </div>

        {loading ? (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(254,240,244,0.3)', textAlign: 'center', paddingTop: 60, letterSpacing: '0.1em' }}>loading…</div>
        ) : codes.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(196,20,40,0.2)',
            borderRadius: 12, padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(254,240,244,0.25)', letterSpacing: '0.08em' }}>no codes yet</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'rgba(254,240,244,0.15)', marginTop: 6 }}>create your first redeem code above</div>
          </div>
        ) : (
          <>
            {/* Filtros por tipo */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {(['todos', 'gift', 'scratch', 'link', 'image'] as const).map(f => {
                let count = codes.length
                if (f === 'gift') count = codes.filter(c => c.giftAnimation).length
                else if (f === 'scratch') count = codes.filter(c => c.scratchCard).length
                else if (f === 'link') count = codes.filter(c => c.rewardType === 'link').length
                else if (f === 'image') count = codes.filter(c => c.rewardType === 'image').length
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    style={{
                      padding: '5px 12px', borderRadius: 20,
                      border: `1px solid ${activeFilter === f ? 'rgba(196,20,40,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      background: activeFilter === f ? 'rgba(196,20,40,0.12)' : 'transparent',
                      color: activeFilter === f ? 'var(--text)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-body)', fontSize: 9, cursor: 'pointer', letterSpacing: '0.08em',
                    }}
                  >
                    {f === 'todos' ? `todos (${count})` : f}
                  </button>
                )
              })}
            </div>

            {/* Grid de cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {filteredCodes.map(code => {
                const isExhausted = code.used || (code.maxUses !== null && (code.useCount ?? 0) >= code.maxUses)
                return (
                  <div
                    key={code.id}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                      overflow: 'hidden', background: 'rgba(12,0,16,0.8)',
                      cursor: 'pointer', transition: 'border-color 0.2s',
                      opacity: isExhausted ? 0.55 : 1,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(196,20,40,0.35)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                  >
                    {/* Preview visual según tipo */}
                    <div style={{
                      height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: code.giftAnimation ? 'linear-gradient(135deg,#1a0012,#2a0020)'
                        : code.scratchCard ? 'linear-gradient(135deg,#0a001a,#150025)'
                        : 'linear-gradient(135deg,#001020,#001830)',
                    }}>
                      {code.giftAnimation
                        ? <span style={{ fontSize: 32 }}>🎁</span>
                        : code.scratchCard
                        ? <div style={{
                            width: 88, height: 44, background: code.scratchCardColor || '#2a1a2e',
                            borderRadius: 4, border: '1px solid rgba(196,20,40,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, color: 'rgba(196,20,40,0.6)', letterSpacing: '0.08em',
                          }}>RASCA</div>
                        : <span style={{ fontSize: 28, opacity: 0.6 }}>🔗</span>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {code.code}
                        </span>
                        <Badge type={code.rewardType} used={isExhausted} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                        {code.maxUses === null
                          ? <span>∞ ilimitado</span>
                          : code.maxUses === 1
                          ? <span>uso único</span>
                          : <span>{code.useCount ?? 0} / {code.maxUses} usos</span>
                        }
                        <span>{relativeTime(code.createdAt)}</span>
                      </div>
                      {/* Barra de progreso para multi-use finito */}
                      {code.maxUses !== null && code.maxUses > 1 && (
                        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, marginTop: 7, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 1,
                            width: `${Math.min(100, ((code.useCount ?? 0) / code.maxUses) * 100)}%`,
                            background: ((code.useCount ?? 0) >= code.maxUses) ? 'rgba(255,255,255,0.2)' : 'var(--primary)',
                            transition: 'width 0.4s',
                          }} />
                        </div>
                      )}
                    </div>

                    {/* Botón eliminar dentro de la card (opcional) */}
                    <div style={{ padding: '6px 12px 12px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(code.id) }}
                        disabled={deleting === code.id}
                        style={{
                          background: 'none', border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 6, color: 'rgba(254,240,244,0.25)', cursor: 'pointer',
                          padding: '4px 8px', fontSize: 11, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(196,20,40,0.4)'; e.currentTarget.style.color = 'var(--primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(254,240,244,0.25)' }}
                      >
                        {deleting === code.id ? '…' : '✕'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer con stats */}
            <div style={{
              display: 'flex', gap: 20, marginTop: 14, paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 9, color: 'var(--text-muted)',
            }}>
              <span>Total: <b style={{ color: 'var(--text)' }}>{codes.length}</b></span>
              <span>Activos: <b style={{ color: '#4ade80' }}>{activeCount}</b></span>
              <span>Agotados: <b style={{ color: 'var(--text)' }}>{usedCount}</b></span>
              <span style={{ marginLeft: 'auto' }}>
                <button onClick={exportCodes} style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                  padding: '4px 10px', color: 'rgba(254,240,244,0.6)', fontSize: 9,
                  fontFamily: 'var(--font-body)', cursor: 'pointer', letterSpacing: '0.08em',
                }}>exportar CSV</button>
              </span>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          onCreated={c => { setCodes(prev => [c, ...prev]) }}
        />
      )}
    </>
  )
}