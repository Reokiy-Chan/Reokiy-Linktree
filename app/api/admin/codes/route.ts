import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/app/lib/auth'
import { listCodes, createCode } from '@/app/lib/codes'

async function auth() {
  const jar = await cookies()
  const token = jar.get('admin_session')?.value
  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'
  return token && verifyToken(token, secret)
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const codes = await listCodes()
  codes.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return NextResponse.json({ codes })
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const { getCodeByString } = await import('@/app/lib/codes')
  const existing = await getCodeByString(code)
  if (existing) {
    return NextResponse.json({ error: 'Code already exists' }, { status: 409 })
  }

  // Parse maxUses: null = unlimited, number = finite, undefined = single (1)
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
  return NextResponse.json({ code: entry }, { status: 201 })
}