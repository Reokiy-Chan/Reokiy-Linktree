'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { RedeemCode, RewardType, GiftPattern, ScratchDifficulty, GiftStyle, ScratchStyle } from '@/app/lib/codes'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

const BADGE: Record<RewardType | 'used', { label: string; color: string }> = {
  link:   { label: 'link',   color: '#3b8af7' },
  text:   { label: 'text',   color: '#ff8030' },
  image:  { label: 'image',  color: '#a855f7' },
  fansly: { label: 'fansly', color: '#1da1f2' },
  used:   { label: 'used',   color: 'rgba(254,240,244,0.18)' },
}

// ─── Module-scope style consts ───────────────────────────────────────────────

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(5,0,7,0.85)', backdropFilter: 'blur(8px)', padding: 16,
}

const codeDetailCardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 420,
  background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)',
  borderRadius: 16, padding: 24, maxHeight: '90vh', overflowY: 'auto',
}

const modalOuterOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(5,0,7,0.85)', backdropFilter: 'blur(8px)',
}

const modalInnerCardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 460,
  background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)',
  borderRadius: 16, padding: 28, margin: 16,
  maxHeight: '90vh', overflowY: 'auto',
}

// ─── Badge ───────────────────────────────────────────────────────────────────

function Badge({ type, used }: { type: RewardType; used: boolean }) {
  const b = used ? BADGE.used : BADGE[type]
  return (
    <span style={{
      ...S, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
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
  const patternEl = renderPattern()

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
      <svg width="60" height="68" viewBox="0 0 140 160" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>
        <defs>{patternEl}</defs>
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
      <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.2)', alignSelf: 'center', marginLeft: 10 }}>preview</div>
    </div>
  )
}

function CodeEditFull({ code, onSaved, onCancel }: { code: RedeemCode; onSaved: (c: RedeemCode) => void; onCancel: () => void }) {
  const [codeStr, setCodeStr]             = useState(code.code)
  const [label, setLabel]                 = useState(code.label ?? '')
  const [adminNote, setAdminNote]         = useState(code.adminNote ?? '')
  const [rewardType, setRewardType]       = useState<RewardType>(code.rewardType)
  const [rewardContent, setRewardContent] = useState(code.rewardContent)
  const [rewardTitle, setRewardTitle]     = useState(code.rewardTitle ?? '')
  // Gift
  const [giftAnimation, setGiftAnimation]   = useState(code.giftAnimation ?? false)
  const [giftStyle, setGiftStyle]           = useState<GiftStyle>(code.giftStyle ?? 'modern')
  const [giftBoxColor, setGiftBoxColor]     = useState(code.giftBoxColor ?? '#c41428')
  const [giftRibbonColor, setGiftRibbonColor] = useState(code.giftRibbonColor ?? '#fef0f4')
  const [giftPattern, setGiftPattern]       = useState<GiftPattern>(code.giftPattern ?? 'none')
  const [giftPatternColor, setGiftPatternColor] = useState(code.giftPatternColor ?? '#ffffff')
  const [giftPatternImage, setGiftPatternImage] = useState<string | null>(code.giftPatternImage ?? null)
  // Scratch
  const [scratchCard, setScratchCard]       = useState(code.scratchCard ?? false)
  const [scratchStyle, setScratchStyle]     = useState<ScratchStyle>(code.scratchStyle ?? 'lottery')
  const [scratchCardColor, setScratchCardColor] = useState(code.scratchCardColor ?? '#2a1a2e')
  const [scratchCardLabel, setScratchCardLabel] = useState(code.scratchCardLabel ?? '')
  const [scratchDifficulty, setScratchDifficulty] = useState<ScratchDifficulty>(code.scratchDifficulty ?? 'normal')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 11px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)',
    borderRadius: 7, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 12,
    outline: 'none', boxShadow: 'none',
  }
  const sectionStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(196,20,40,0.12)',
    borderRadius: 10, padding: '12px 14px',
  }
  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
    background: on ? 'rgba(196,20,40,0.7)' : 'rgba(255,255,255,0.1)',
    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
  })

  const save = async () => {
    if (!codeStr.trim()) { setErr('Code is required'); return }
    if (!rewardContent.trim()) { setErr('Reward content is required'); return }
    setSaving(true); setErr('')
    const r = await fetch(`/api/admin/codes/${code.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: codeStr.trim().toUpperCase(),
        label: label.trim() || codeStr.trim(),
        adminNote: adminNote.trim(),
        rewardType, rewardContent: rewardContent.trim(), rewardTitle: rewardTitle.trim(),
        giftAnimation, giftStyle, giftBoxColor, giftRibbonColor, giftPattern, giftPatternColor, giftPatternImage,
        scratchCard, scratchStyle, scratchCardColor, scratchCardLabel: scratchCardLabel.trim(), scratchDifficulty,
      }),
    })
    const d = await r.json()
    if (r.ok) onSaved(d.code)
    else setErr(d.error ?? 'Save failed')
    setSaving(false)
  }

  const lbl = (text: string) => (
    <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>{text}</label>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Code + label */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          {lbl('code')}
          <input value={codeStr} onChange={e => setCodeStr(e.target.value.toUpperCase())} style={{ ...fieldStyle, fontFamily: 'monospace' }} />
        </div>
        <div style={{ flex: 1 }}>
          {lbl('admin note')}
          <input value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="internal note" style={fieldStyle} />
        </div>
      </div>

      {/* Reward type */}
      <div>
        {lbl('reward type')}
        <div style={{ display: 'flex', gap: 5 }}>
          {(['text','link','image','fansly'] as RewardType[]).map(t => (
            <button key={t} type="button" onClick={() => setRewardType(t)} style={{
              flex: 1, padding: '6px 4px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
              background: rewardType === t ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)',
              border: `1px solid ${rewardType === t ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}`,
              color: rewardType === t ? 'var(--text)' : 'rgba(254,240,244,0.45)',
              fontFamily: 'var(--font-body)',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Reward title + content */}
      <div>
        {lbl('title (shown to user)')}
        <input value={rewardTitle} onChange={e => setRewardTitle(e.target.value)} placeholder="e.g. Secret link" style={fieldStyle} />
      </div>
      <div>
        {lbl(rewardType === 'text' ? 'message' : rewardType === 'fansly' ? 'fansly code' : 'url / content')}
        {rewardType === 'text'
          ? <textarea value={rewardContent} onChange={e => setRewardContent(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
          : <input value={rewardContent} onChange={e => setRewardContent(e.target.value)} style={{ ...fieldStyle, fontFamily: rewardType === 'fansly' ? 'monospace' : undefined }} />
        }
      </div>

      {/* Gift animation */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.5)', letterSpacing: '0.08em' }}>🎁 gift animation</span>
          <button type="button" onClick={() => setGiftAnimation(v => !v)} style={toggleStyle(giftAnimation)}>
            <span style={{ position: 'absolute', top: 2, left: giftAnimation ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
        </div>
        {giftAnimation && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)' }}>box color</label>
                <input type="color" value={giftBoxColor} onChange={e => setGiftBoxColor(e.target.value)} style={{ width: '100%', marginTop: 4, height: 30 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)' }}>ribbon color</label>
                <input type="color" value={giftRibbonColor} onChange={e => setGiftRibbonColor(e.target.value)} style={{ width: '100%', marginTop: 4, height: 30 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {(['modern','legacy'] as const).map(v => (
                <button key={v} type="button" onClick={() => setGiftStyle(v)} style={{ flex: 1, padding: '5px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: giftStyle === v ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)', border: `1px solid ${giftStyle === v ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}`, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{v}</button>
              ))}
            </div>
            <select value={giftPattern} onChange={e => setGiftPattern(e.target.value as GiftPattern)} style={fieldStyle}>
              {GIFT_PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            {giftPattern !== 'none' && giftPattern !== 'custom' && (
              <div>
                <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)' }}>pattern color</label>
                <input type="color" value={giftPatternColor} onChange={e => setGiftPatternColor(e.target.value)} style={{ width: '100%', marginTop: 4, height: 30 }} />
              </div>
            )}
            <GiftBoxPreview boxColor={giftBoxColor} ribbonColor={giftRibbonColor} pattern={giftPattern} patternColor={giftPatternColor} patternImage={giftPatternImage} />
          </div>
        )}
      </div>

      {/* Scratch card */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.5)', letterSpacing: '0.08em' }}>🪄 scratch card</span>
          <button type="button" onClick={() => setScratchCard(v => !v)} style={toggleStyle(scratchCard)}>
            <span style={{ position: 'absolute', top: 2, left: scratchCard ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
        </div>
        {scratchCard && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {(['lottery','classic'] as const).map(v => (
                <button key={v} type="button" onClick={() => setScratchStyle(v)} style={{ flex: 1, padding: '5px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: scratchStyle === v ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)', border: `1px solid ${scratchStyle === v ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}`, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{v}</button>
              ))}
            </div>
            <div>
              <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)' }}>background color</label>
              <input type="color" value={scratchCardColor} onChange={e => setScratchCardColor(e.target.value)} style={{ width: '100%', marginTop: 4, height: 30 }} />
            </div>
            <div>
              <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)' }}>overlay text (optional)</label>
              <input value={scratchCardLabel} onChange={e => setScratchCardLabel(e.target.value)} placeholder="✦ scratch to reveal ✦" style={fieldStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {SCRATCH_DIFFICULTIES.map(d => (
                <button key={d.value} type="button" onClick={() => setScratchDifficulty(d.value as ScratchDifficulty)} style={{ padding: '6px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: scratchDifficulty === d.value ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)', border: `1px solid ${scratchDifficulty === d.value ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}`, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{d.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {err && <div style={{ ...S, fontSize: 12, color: '#f87171' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={onCancel} style={{ ...S, flex: 1, padding: '8px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(254,240,244,0.5)', fontSize: 12, cursor: 'pointer' }}>cancel</button>
        <button type="button" onClick={save} disabled={saving} style={{ ...S, flex: 2, padding: '8px 0', background: 'rgba(196,20,40,0.2)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 7, color: 'var(--text)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{saving ? 'saving…' : 'save changes'}</button>
      </div>
    </div>
  )
}

function CodeDetailModal({
  code, onClose, onUpdated, onDeleted,
}: {
  code: RedeemCode
  onClose: () => void
  onUpdated: (c: RedeemCode) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete code ${code.code}?`)) return
    setDeleting(true)
    const r = await fetch(`/api/admin/codes/${code.id}`, { method: 'DELETE' })
    if (r.ok) { onDeleted(code.id); onClose() }
    setDeleting(false)
  }

  return (
    <div
      style={modalOverlayStyle}
      role="button"
      tabIndex={0}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) onClose() }}
    >
      <div style={codeDetailCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ ...S, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)' }}>
            {editing ? 'editing code' : 'code details'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} style={{ ...S, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.3)', borderRadius: 6, color: 'rgba(196,20,40,0.8)', fontSize: 12, cursor: 'pointer' }}>✎ edit</button>
            )}
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        </div>

        {editing ? (
          <CodeEditFull code={code} onSaved={c => { onUpdated(c); setEditing(false) }} onCancel={() => setEditing(false)} />
        ) : (
          <CodeDetailView code={code} onDelete={handleDelete} deleting={deleting} />
        )}
      </div>
    </div>
  )
}

function CodeDetailView({ code, onDelete, deleting }: { code: RedeemCode; onDelete: () => void; deleting: boolean }) {
  const b = BADGE[code.used ? 'used' : code.rewardType]
  return (
    <>
      <div style={{ fontFamily: 'monospace', fontSize: 20, color: '#fee0f4', marginBottom: 16, letterSpacing: '0.1em' }}>{code.code}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', ...S, fontSize: 12, marginBottom: 16 }}>
        <span style={{ color: 'rgba(254,240,244,0.35)' }}>type</span>
        <span><Badge type={code.rewardType} used={code.used} /></span>
        {code.rewardTitle && <><span style={{ color: 'rgba(254,240,244,0.35)' }}>title</span><span style={{ color: 'var(--text)' }}>{code.rewardTitle}</span></>}
        {code.adminNote && <><span style={{ color: 'rgba(254,240,244,0.35)' }}>note</span><span style={{ color: 'rgba(254,240,244,0.5)' }}>{code.adminNote}</span></>}
        {code.used && code.usedAt && <><span style={{ color: 'rgba(254,240,244,0.35)' }}>used</span><span style={{ color: 'rgba(254,240,244,0.4)' }}>{new Date(code.usedAt).toLocaleDateString('en-GB')}</span></>}
        <span style={{ color: 'rgba(254,240,244,0.35)' }}>created</span>
        <span style={{ color: 'rgba(254,240,244,0.3)' }}>{new Date(code.createdAt).toLocaleDateString('en-GB')}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={() => navigator.clipboard.writeText(code.code)} style={{ ...S, flex: 1, padding: '7px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(254,240,244,0.5)', fontSize: 12, cursor: 'pointer' }}>⧉ copy code</button>
        <button type="button" onClick={onDelete} disabled={deleting} style={{ ...S, padding: '7px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, color: 'rgba(254,240,244,0.3)', fontSize: 12, cursor: 'pointer' }}>{deleting ? '…' : '🗑'}</button>
      </div>
    </>
  )
}

function StepBar({ current }: { current: number }) {
  const labels = ['code', 'type', 'content', 'presentation']
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[1,2,3,4].map(n => (
          <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n < current ? 'rgba(196,20,40,0.7)' : n === current ? '#c41428' : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, ...S, fontSize: 12 }}>
        {labels.map((l, i) => (
          <span key={l} style={{ color: i + 1 === current ? '#fee0f4' : i + 1 < current ? 'rgba(196,20,40,0.5)' : 'rgba(254,240,244,0.2)', flex: 1 }}>
            {i + 1 < current ? '✓ ' : ''}{l}
          </span>
        ))}
      </div>
    </div>
  )
}

function Modal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: RedeemCode) => void }) {
  type WizardStep = 1 | 2 | 3 | 4 | 'done'
  const [step, setStep] = useState<WizardStep>(1)
  const [rewardType, setRewardType] = useState<RewardType>('text')
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [rewardTitle, setRewardTitle] = useState('')
  const [rewardContent, setRewardContent] = useState('')
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Gift animation
  const [giftAnimation, setGiftAnimation] = useState(false)
  const [giftStyle, setGiftStyle] = useState<GiftStyle>('modern')
  const [giftBoxColor, setGiftBoxColor] = useState('#c41428')
  const [giftRibbonColor, setGiftRibbonColor] = useState('#fef0f4')
  const [giftPattern, setGiftPattern] = useState<GiftPattern>('none')
  const [giftPatternColor, setGiftPatternColor] = useState('#ffffff')
  const [giftPatternImage, setGiftPatternImage] = useState<string | null>(null)
  const [patternFile, setPatternFile] = useState<File | null>(null)

  // Scratch card
  const [scratchCard, setScratchCard] = useState(false)
  const [scratchStyle, setScratchStyle] = useState<ScratchStyle>('lottery')
  const [scratchCardColor, setScratchCardColor] = useState('#2a1a2e')
  const [scratchCardLabel, setScratchCardLabel] = useState('')
  const [scratchDifficulty, setScratchDifficulty] = useState<ScratchDifficulty>('normal')

  // Multi-use
  const [maxUsesMode, setMaxUsesMode] = useState<'single' | 'multi' | 'unlimited'>('single')
  const [maxUsesCount, setMaxUsesCount] = useState('5')

  const fileRef = useRef<HTMLInputElement>(null)
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

  const submit = async () => {
    setError('')
    if (!code.trim()) { setError('Code is required'); return }

    let content = rewardContent.trim()
    let patternImageUrl = giftPatternImage

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
    borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 12,
    outline: 'none', boxShadow: 'none', transition: 'border-color 0.15s',
  }
  const focusStyle = { borderColor: 'rgba(196,20,40,0.5)', boxShadow: '0 0 0 2px rgba(196,20,40,0.2)' }
  const blurStyle = { borderColor: 'rgba(196,20,40,0.2)', boxShadow: 'none' }

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

  const nextBtnStyle: React.CSSProperties = {
    ...S, padding: '9px 20px', background: 'rgba(196,20,40,0.2)', border: '1px solid rgba(196,20,40,0.4)',
    borderRadius: 8, color: 'var(--text)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
    cursor: 'pointer', opacity: 1,
  }
  const backBtnStyle: React.CSSProperties = {
    ...S, padding: '9px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: 'rgba(254,240,244,0.5)', fontSize: 12, cursor: 'pointer',
  }
  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    ...S, padding: '9px 22px', background: disabled ? 'rgba(196,20,40,0.08)' : 'rgba(196,20,40,0.25)',
    border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8, color: disabled ? 'var(--text-muted)' : 'var(--text)',
    fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: disabled ? 'not-allowed' : 'pointer',
  })

  return (
    <div
      style={modalOuterOverlayStyle}
      role="button"
      tabIndex={0}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) onClose() }}
    >
      <div style={modalInnerCardStyle}>
        {step === 'done' ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ ...S, fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>Code created</div>
            <div style={{ ...S, fontSize: 20, fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '0.15em', marginBottom: 20 }}>{code.toUpperCase()}</div>
            <button type="button" onClick={onClose} style={{ ...S, padding: '9px 24px', background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8, color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ ...S, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)' }}>new code</div>
              <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <StepBar current={step as number} />

            {step === 1 && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Code</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        placeholder="SUMMER24"
                        style={{ ...fieldStyle, flex: 1, fontFamily: 'monospace' }}
                        onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                        onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
                      />
                      <button type="button" onClick={genCode} style={{ ...S, padding: '0 12px', background: 'rgba(196,20,40,0.1)', border: '1px solid rgba(196,20,40,0.25)', borderRadius: 8, color: 'rgba(254,240,244,0.6)', fontSize: 12, cursor: 'pointer' }}>
                        random
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Admin note (optional)</label>
                    <input value={label} onChange={e => setLabel(e.target.value)} aria-label="e.g. june discord" placeholder="e.g. june discord" style={fieldStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" onClick={() => setStep(2)} disabled={!code.trim()} style={{ ...nextBtnStyle }}>continue →</button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {ALL_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setRewardType(t)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 9, cursor: 'pointer',
                      border: `1px solid ${rewardType === t ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      background: rewardType === t ? 'rgba(196,20,40,0.1)' : 'rgba(255,255,255,0.025)',
                      textAlign: 'left',
                    }}>
                      <span style={{ fontSize: 18 }}>{t === 'link' ? '🔗' : t === 'text' ? '💬' : t === 'image' ? '🖼' : 'F'}</span>
                      <div>
                        <div style={{ ...S, fontSize: 12, color: 'var(--text)' }}>{t}</div>
                        <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.35)', marginTop: 2 }}>{CONTENT_META[t].placeholder}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button type="button" onClick={() => setStep(1)} style={{ ...backBtnStyle }}>← back</button>
                  <button type="button" onClick={() => setStep(3)} style={{ ...nextBtnStyle }}>continue →</button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                {/* Reward title */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Title (shown to user)</label>
                  <input value={rewardTitle} onChange={e => setRewardTitle(e.target.value)} aria-label="e.g. Special link" placeholder="e.g. Special link" style={fieldStyle} />
                </div>

                {/* Reward content según tipo */}
                {rewardType === 'text' && (
                  <div>
                    <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Message</label>
                    <textarea value={rewardContent} onChange={e => setRewardContent(e.target.value)} rows={3} placeholder={CONTENT_META.text.placeholder} style={{ ...fieldStyle, resize: 'vertical' }} />
                  </div>
                )}
                {rewardType === 'link' && (
                  <div>
                    <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>URL</label>
                    <input value={rewardContent} onChange={e => setRewardContent(e.target.value)} type="url" placeholder={CONTENT_META.link.placeholder} style={fieldStyle} />
                  </div>
                )}
                {rewardType === 'image' && (
                  <div>
                    <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Image</label>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }} />
                    {imgPreview ? (
                      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(196,20,40,0.25)', marginBottom: 6 }}>
                        <Image src={imgPreview} alt="preview" width={0} height={0} unoptimized style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />
                        <button type="button" onClick={() => { setImgFile(null); setImgPreview(null) }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(5,0,7,0.8)', border: 'none', borderRadius: 4, color: 'var(--text)', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileRef.current?.click()}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click() }}
                        style={{ border: '2px dashed rgba(196,20,40,0.25)', borderRadius: 8, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', fontSize: 12, color: 'rgba(254,240,244,0.35)' }}
                      >
                        click to upload · jpeg, png, gif, webp · max 10 MB
                      </div>
                    )}
                    <div style={{ marginTop: 6 }}>
                      <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.25)' }}>o URL directa:</label>
                      <input value={rewardContent} onChange={e => { setRewardContent(e.target.value); if (e.target.value) { setImgFile(null); setImgPreview(null) } }} aria-label="https://i.imgur.com/…" placeholder="https://i.imgur.com/…" style={{ ...fieldStyle, marginTop: 4 }} />
                    </div>
                  </div>
                )}
                {rewardType === 'fansly' && (
                  <div>
                    <label style={{ ...S, fontSize: 12, color: '#1da1f2', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Fansly Code</label>
                    <input value={rewardContent} onChange={e => setRewardContent(e.target.value)} placeholder={CONTENT_META.fansly.placeholder} style={{ ...fieldStyle, fontFamily: 'monospace' }} />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                  <button type="button" onClick={() => setStep(2)} style={{ ...backBtnStyle }}>← back</button>
                  <button type="button" onClick={() => setStep(4)} disabled={!rewardContent.trim() && rewardType !== 'image'} style={{ ...nextBtnStyle }}>continue →</button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                {/* Gift animation */}
                <div style={sectionStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: giftAnimation ? 14 : 0 }}>
                    <div>
                      <div style={{ ...S, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.5)' }}>🎁 Gift animation</div>
                      <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.2)' }}>Show an animated box the user must open</div>
                    </div>
                    <button type="button" onClick={() => setGiftAnimation(v => !v)} style={toggleStyle(giftAnimation)}><span style={toggleKnob(giftAnimation)} /></button>
                  </div>
                  {giftAnimation && (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.35)' }}>Style</label>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          {(['modern', 'legacy'] as const).map(v => (
                            <button key={v} type="button" onClick={() => setGiftStyle(v)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: giftStyle === v ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)', border: `1px solid ${giftStyle === v ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}` }}>
                              {v === 'modern' ? 'Modern' : 'Classic'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...S, fontSize: 12 }}>Box color</label>
                          <input type="color" value={giftBoxColor} onChange={e => setGiftBoxColor(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...S, fontSize: 12 }}>Ribbon color</label>
                          <input type="color" value={giftRibbonColor} onChange={e => setGiftRibbonColor(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
                        </div>
                      </div>
                      <select value={giftPattern} onChange={e => setGiftPattern(e.target.value as GiftPattern)} style={{ ...fieldStyle, marginBottom: 10 }}>
                        {GIFT_PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      {giftPattern !== 'none' && giftPattern !== 'custom' && (
                        <div><label>Pattern color</label><input type="color" value={giftPatternColor} onChange={e => setGiftPatternColor(e.target.value)} style={{ width: '100%', marginTop: 4 }} /></div>
                      )}
                      {giftPattern === 'custom' && (
                        <div>
                          <label>Pattern image</label>
                          <input ref={patternFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pickPatternFile(f) }} />
                          <button type="button" onClick={() => patternFileRef.current?.click()} style={{ ...S, marginTop: 4, padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(196,20,40,0.3)', borderRadius: 6, cursor: 'pointer' }}>Upload image</button>
                          {giftPatternImage && (
                            <div style={{ position: 'relative', width: 40, height: 40, marginTop: 8, borderRadius: 6, overflow: 'hidden' }}>
                              <Image src={giftPatternImage} alt="pattern preview" fill unoptimized style={{ objectFit: 'cover', borderRadius: 6 }} />
                            </div>
                          )}
                        </div>
                      )}
                      <GiftBoxPreview boxColor={giftBoxColor} ribbonColor={giftRibbonColor} pattern={giftPattern} patternColor={giftPatternColor} patternImage={giftPatternImage} />
                    </>
                  )}
                </div>

                {/* Scratch card */}
                <div style={sectionStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: scratchCard ? 14 : 0 }}>
                    <div>
                      <div style={{ ...S, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.5)' }}>🪄 Scratch card</div>
                      <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.2)' }}>User must scratch to reveal the reward</div>
                    </div>
                    <button type="button" onClick={() => setScratchCard(v => !v)} style={toggleStyle(scratchCard)}><span style={toggleKnob(scratchCard)} /></button>
                  </div>
                  {scratchCard && (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ ...S, fontSize: 12 }}>Style</label>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          {(['lottery', 'classic'] as const).map(v => (
                            <button key={v} type="button" onClick={() => setScratchStyle(v)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: scratchStyle === v ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)', border: `1px solid ${scratchStyle === v ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}` }}>
                              {v === 'lottery' ? 'Lottery' : 'Classic'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ ...S, fontSize: 12 }}>Background color</label>
                        <input type="color" value={scratchCardColor} onChange={e => setScratchCardColor(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
                      </div>
                      <div>
                        <label style={{ ...S, fontSize: 12 }}>Custom text (optional)</label>
                        <input value={scratchCardLabel} onChange={e => setScratchCardLabel(e.target.value)} aria-label="✦ scratch to reveal ✦" placeholder="✦ scratch to reveal ✦" style={fieldStyle} />
                      </div>
                      <div>
                        <label style={{ ...S, fontSize: 12 }}>Difficulty</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 4 }}>
                          {SCRATCH_DIFFICULTIES.map(d => (
                            <button key={d.value} type="button" onClick={() => setScratchDifficulty(d.value as ScratchDifficulty)} style={{ padding: '6px', borderRadius: 6, background: scratchDifficulty === d.value ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)', border: `1px solid ${scratchDifficulty === d.value ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}` }}>{d.label}</button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Multi-use */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(196,20,40,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ ...S, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.5)' }}>🔢 Uso</div>
                  <div style={{ display: 'flex', gap: 5, marginBottom: maxUsesMode === 'multi' ? 10 : 0, marginTop: 8 }}>
                    {(['single', 'multi', 'unlimited'] as const).map(mode => (
                      <button key={mode} type="button" onClick={() => setMaxUsesMode(mode)} style={{ flex: 1, padding: '7px 4px', borderRadius: 7, background: maxUsesMode === mode ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.025)', border: `1px solid ${maxUsesMode === mode ? 'rgba(196,20,40,0.5)' : 'rgba(255,255,255,0.07)'}`, fontSize: 12 }}>
                        {mode === 'single' ? 'Single use' : mode === 'multi' ? 'N uses' : 'Unlimited'}
                      </button>
                    ))}
                  </div>
                  {maxUsesMode === 'multi' && (
                    <div><input type="number" min="2" max="9999" value={maxUsesCount} onChange={e => setMaxUsesCount(e.target.value)} style={fieldStyle} /></div>
                  )}
                </div>

                {error && <div style={{ ...S, fontSize: 12, color: 'var(--primary)', textAlign: 'center' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                  <button type="button" onClick={() => setStep(3)} style={{ ...backBtnStyle }}>← back</button>
                  <button type="button" onClick={submit} disabled={saving || uploading} style={{ ...primaryBtn(saving || uploading) }}>
                    {uploading ? 'uploading…' : saving ? 'creating…' : 'create code'}
                  </button>
                </div>
              </>
            )}
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
  const [detailCode, setDetailCode] = useState<RedeemCode | null>(null)

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

  const usedCount  = codes.filter(c => c.used || (c.maxUses != null && (c.useCount ?? 0) >= c.maxUses)).length
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
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>
              {activeCount} active · {usedCount} used
            </div>
          </div>
          <button type="button" onClick={() => setShowModal(true)}
            style={{
              fontFamily: 'var(--font-body)', padding: '9px 18px',
              background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.4)',
              borderRadius: 8, color: 'var(--text)', fontSize: 12,
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,20,40,0.28)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(196,20,40,0.18)')}
          >
            + new code
          </button>
        </div>

        {loading ? (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(254,240,244,0.3)', textAlign: 'center', paddingTop: 60, letterSpacing: '0.1em' }}>loading…</div>
        ) : codes.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(196,20,40,0.2)',
            borderRadius: 12, padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(254,240,244,0.25)', letterSpacing: '0.08em' }}>no codes yet</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(254,240,244,0.15)', marginTop: 6 }}>create your first redeem code above</div>
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
                  <button type="button"
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    style={{
                      padding: '5px 12px', borderRadius: 20,
                      border: `1px solid ${activeFilter === f ? 'rgba(196,20,40,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      background: activeFilter === f ? 'rgba(196,20,40,0.12)' : 'transparent',
                      color: activeFilter === f ? 'var(--text)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer', letterSpacing: '0.08em',
                    }}
                  >
                    {f === 'todos' ? `all (${count})` : f}
                  </button>
                )
              })}
            </div>

            {/* Grid de cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {filteredCodes.map(code => {
                const isExhausted = code.used || (code.maxUses != null && (code.useCount ?? 0) >= code.maxUses)
                return (
                  <div
                    key={code.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailCode(code)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setDetailCode(code) }}
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
                            fontSize: 12, color: 'rgba(196,20,40,0.6)', letterSpacing: '0.08em',
                          }}>SCRATCH</div>
                        : <span style={{ fontSize: 28, opacity: 0.6 }}>🔗</span>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {code.code}
                        </span>
                        <Badge type={code.rewardType} used={isExhausted} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                        {code.maxUses == null
                          ? <span>∞ unlimited</span>
                          : code.maxUses === 1
                          ? <span>single use</span>
                          : <span>{code.useCount ?? 0} / {code.maxUses} uses</span>
                        }
                        <span>{relativeTime(code.createdAt)}</span>
                      </div>
                      {/* Barra de progreso para multi-use finito */}
                      {code.maxUses != null && code.maxUses > 1 && (
                        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, marginTop: 7, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 1,
                            width: `${Math.min(100, ((code.useCount ?? 0) / code.maxUses!) * 100)}%`,
                            background: ((code.useCount ?? 0) >= code.maxUses!) ? 'rgba(255,255,255,0.2)' : 'var(--primary)',
                            transition: 'width 0.4s',
                          }} />
                        </div>
                      )}
                    </div>

                    {/* Botón eliminar dentro de la card (opcional) */}
                    <div style={{ padding: '6px 12px 12px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(code.id) }}
                        disabled={deleting === code.id}
                        style={{
                          background: 'none', border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 6, color: 'rgba(254,240,244,0.25)', cursor: 'pointer',
                          padding: '4px 8px', fontSize: 12, transition: 'background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s, transform 0.15s',
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
              borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'var(--text-muted)',
            }}>
              <span>Total: <b style={{ color: 'var(--text)' }}>{codes.length}</b></span>
              <span>Active: <b style={{ color: '#4ade80' }}>{activeCount}</b></span>
              <span>Exhausted: <b style={{ color: 'var(--text)' }}>{usedCount}</b></span>
              <span style={{ marginLeft: 'auto' }}>
                <button type="button" onClick={exportCodes} style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                  padding: '4px 10px', color: 'rgba(254,240,244,0.6)', fontSize: 12,
                  fontFamily: 'var(--font-body)', cursor: 'pointer', letterSpacing: '0.08em',
                }}>export CSV</button>
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
      {detailCode && (
        <CodeDetailModal
          code={detailCode}
          onClose={() => setDetailCode(null)}
          onUpdated={c => { setCodes(prev => prev.map(x => x.id === c.id ? c : x)); setDetailCode(c) }}
          onDeleted={id => { setCodes(prev => prev.filter(x => x.id !== id)); setDetailCode(null) }}
        />
      )}
    </>
  )
}
