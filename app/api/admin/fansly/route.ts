import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import {
  readLive, syncSchedule, updateConfig, startStream, endStream, sanitizeFanslyUrl, DEFAULT_MESSAGE,
  type ScheduledStream, type StreamTemplate, type BannerStyle, type LiveConfigPatch,
} from '@/app/lib/fansly-live'
import { announceLive, sendTest, channelStatus, type Channel } from '@/app/lib/fansly-notify'
import { countSubs } from '@/app/lib/fansly-push'
import { appendAudit } from '@/app/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Session = Awaited<ReturnType<typeof getSession>>

// Same gate as the settings API: root, or admin / owner / settings permission
function canManage(session: Session): boolean {
  if (!session || session.setup) return false
  if (session.r === 'root') return true
  if (session.p === 'all') return true
  if (Array.isArray(session.p)) return session.p.some(p => p === 'admin' || p === 'owner' || p === 'settings')
  return false
}

async function snapshot() {
  const { state } = await syncSchedule()
  return { live: state, channels: channelStatus(), subscribers: await countSubs().catch(() => 0) }
}

function audit(session: NonNullable<Session>, target: string, detail?: string) {
  return appendAudit({
    action: 'fansly.update',
    actorId: session.uid ?? 'unknown', actorName: session.u ?? 'unknown', actorUsername: session.u ?? 'unknown',
    target, detail,
  }).catch(() => {})
}

function cleanIso(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const d = new Date(v)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

function str(v: unknown, max: number): string | undefined {
  return typeof v === 'string' ? v.slice(0, max) : undefined
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!canManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(await snapshot())
}

// Edit configuration (title, link, banner, notifications, schedule, templates)
export async function PATCH(req: NextRequest) {
  const session = await getSession(req)
  if (!canManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const patch: LiveConfigPatch = {}
  if (typeof body.redirectWhenLive === 'boolean') patch.redirectWhenLive = body.redirectWhenLive
  if (body.title !== undefined) patch.title = str(body.title, 80) ?? ''
  if (body.ctaText !== undefined) patch.ctaText = (str(body.ctaText, 30) ?? '').trim() || 'join the stream'
  if (body.bannerStyle !== undefined) {
    if (!['compact', 'card', 'bar'].includes(body.bannerStyle as string)) {
      return NextResponse.json({ error: 'Invalid banner style' }, { status: 400 })
    }
    patch.bannerStyle = body.bannerStyle as BannerStyle
  }
  if (body.url !== undefined) {
    const url = sanitizeFanslyUrl(body.url)
    if (!url) return NextResponse.json({ error: 'URL must be an https://fansly.com link' }, { status: 400 })
    patch.url = url
  }
  if (body.notify && typeof body.notify === 'object') {
    const n = body.notify as Record<string, unknown>
    patch.notify = {
      discord: n.discord === true,
      bluesky: n.bluesky === true,
      push: n.push === true,
      message: (str(n.message, 280) ?? '').trim() || DEFAULT_MESSAGE,
    }
  }
  if (Array.isArray(body.schedule)) {
    const schedule: ScheduledStream[] = []
    for (const raw of body.schedule.slice(0, 20) as Record<string, unknown>[]) {
      const at = cleanIso(raw?.at)
      const title = str(raw?.title, 80)?.trim()
      if (!at || !title) continue
      const endAt = cleanIso(raw.endAt)
      schedule.push({
        id: str(raw.id, 40) || crypto.randomUUID(),
        title, at,
        endAt: endAt && endAt > at ? endAt : undefined,
        autoStart: raw.autoStart === true,
        done: raw.done === true,
      })
    }
    patch.schedule = schedule
  }
  if (Array.isArray(body.templates)) {
    const templates: StreamTemplate[] = []
    for (const raw of body.templates.slice(0, 12) as Record<string, unknown>[]) {
      const name = str(raw?.name, 30)?.trim()
      const url = sanitizeFanslyUrl(raw?.url)
      if (!name || !url) continue
      templates.push({ id: str(raw.id, 40) || crypto.randomUUID(), name, title: str(raw.title, 80) ?? '', url })
    }
    patch.templates = templates
  }

  await updateConfig(patch)
  await audit(session!, Object.keys(patch).join(', '))
  return NextResponse.json(await snapshot())
}

// Actions: start / end the stream, send a test notification
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!canManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const action = body?.action

  if (action === 'start') {
    const url = body?.url !== undefined ? sanitizeFanslyUrl(body.url) : undefined
    if (body?.url !== undefined && !url) {
      return NextResponse.json({ error: 'URL must be an https://fansly.com link' }, { status: 400 })
    }
    const { state, changed } = await startStream({ title: str(body?.title, 80), url: url ?? undefined })
    await audit(session!, 'go live', state.title)
    // Announce right away so the admin can see what each channel answered
    const notifications = changed ? await announceLive(state) : {}
    return NextResponse.json({ ...(await snapshot()), notifications })
  }

  if (action === 'end') {
    await endStream()
    await audit(session!, 'end stream')
    return NextResponse.json(await snapshot())
  }

  if (action === 'test') {
    const channel = body?.channel as Channel
    if (!['discord', 'bluesky', 'push'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }
    const result = await sendTest(channel, await readLive())
    return NextResponse.json({ result })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
