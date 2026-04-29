import { NextRequest, NextResponse } from 'next/server'
import { getCodeByString, markUsed } from '@/app/lib/codes'

export async function POST(req: NextRequest) {
  const { code } = await req.json().catch(() => ({}))
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  const entry = await getCodeByString(code.trim())

  if (!entry) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 404 })
  }

  // Check if exhausted: single-use (used=true) or multi-use exhausted
  const maxUses = entry.maxUses === undefined ? 1 : entry.maxUses
  const useCount = entry.useCount ?? 0
  if (maxUses !== null && entry.used) {
    return NextResponse.json({ error: 'Code already used' }, { status: 410 })
  }
  // For unlimited (null) codes, never block. For finite: check count
  if (maxUses !== null && useCount >= maxUses) {
    return NextResponse.json({ error: 'Code already used' }, { status: 410 })
  }

  const ok = await markUsed(entry.id)
  if (!ok) {
    return NextResponse.json({ error: 'Code already used' }, { status: 410 })
  }

  return NextResponse.json({
    rewardType:        entry.rewardType,
    rewardContent:     entry.rewardContent,
    rewardTitle:       entry.rewardTitle ?? null,
    // Gift box
    giftAnimation:     entry.giftAnimation    ?? false,
    giftBoxColor:      entry.giftBoxColor     ?? '#c41428',
    giftRibbonColor:   entry.giftRibbonColor  ?? '#fef0f4',
    giftPattern:       entry.giftPattern      ?? 'none',
    giftPatternColor:  entry.giftPatternColor ?? '#ffffff',
    giftPatternImage:  entry.giftPatternImage ?? null,
    // Scratch card
    scratchCard:            entry.scratchCard            ?? false,
    scratchCardColor:       entry.scratchCardColor       ?? '#2a1a2e',
    scratchCardLabel:       entry.scratchCardLabel       ?? null,
    scratchTextColor:       entry.scratchTextColor       ?? null,
    scratchAccentColor:     entry.scratchAccentColor     ?? '#c41428',
    scratchCardWidth:       entry.scratchCardWidth       ?? 360,
    scratchCardHeight:      entry.scratchCardHeight      ?? 160,
    scratchRevealThreshold: entry.scratchRevealThreshold ?? 55,
    scratchDifficulty:      entry.scratchDifficulty      ?? 'normal',
    // Multi-use info (for display)
    maxUses:   entry.maxUses,
    useCount:  (entry.useCount ?? 0) + 1,  // +1 because markUsed just ran
  })
}