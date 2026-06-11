import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { listCodes, createCode, getCodeByString } from '@/app/lib/codes'
import { appendAudit } from '@/app/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const codes = await listCodes()
  codes.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return NextResponse.json({ codes })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    code, label, rewardType, rewardContent, rewardTitle,
    giftAnimation, giftBoxColor, giftRibbonColor,
    giftPattern, giftPatternColor, giftPatternImage,
    scratchCard, scratchCardColor, scratchCardLabel,
    scratchTextColor, scratchAccentColor,
    scratchCardWidth, scratchCardHeight, scratchRevealThreshold,
    scratchDifficulty,
    maxUses,
  } = body

  if (!code || !rewardType || !rewardContent) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await getCodeByString(code)
  if (existing) {
    return NextResponse.json({ error: 'Code already exists' }, { status: 409 })
  }

  let parsedMaxUses: number | null | undefined = undefined
  if (maxUses === null || maxUses === 'unlimited') {
    parsedMaxUses = null
  } else if (maxUses !== undefined && maxUses !== '') {
    const n = Number(maxUses)
    if (!isNaN(n) && n > 0) parsedMaxUses = n
  }

  const entry = await createCode({
    code,
    label: label || code,
    rewardType,
    rewardContent,
    rewardTitle,
    giftAnimation:      !!giftAnimation,
    giftBoxColor:       giftBoxColor      || '#c41428',
    giftRibbonColor:    giftRibbonColor   || '#fef0f4',
    giftPattern:        giftPattern       || 'none',
    giftPatternColor:   giftPatternColor  || '#ffffff',
    giftPatternImage:   giftPatternImage  || undefined,
    scratchCard:               !!scratchCard,
    scratchCardColor:          scratchCardColor          || '#2a1a2e',
    scratchCardLabel:          scratchCardLabel          || undefined,
    scratchTextColor:          scratchTextColor          || undefined,
    scratchAccentColor:        scratchAccentColor        || '#c41428',
    scratchCardWidth:          scratchCardWidth          ? Number(scratchCardWidth)          : undefined,
    scratchCardHeight:         scratchCardHeight         ? Number(scratchCardHeight)         : undefined,
    scratchRevealThreshold:    scratchRevealThreshold    ? Number(scratchRevealThreshold)    : undefined,
    scratchDifficulty:         scratchDifficulty         || 'normal',
    maxUses: parsedMaxUses,
  })
  await appendAudit({
    action: 'code.create',
    actorId: session.uid, actorName: session.u, actorUsername: session.u,
    target: code, detail: label || code,
  }).catch(() => {})
  return NextResponse.json({ code: entry }, { status: 201 })
}