import { formatMessage, type FanslyLiveState } from './fansly-live'
import { listSubs, removeSub, pushConfigured } from './fansly-push'

export type Channel = 'discord' | 'bluesky' | 'push'
export type ChannelResult = { ok: boolean; detail: string }

// Secrets live in environment variables only, never in the stored state.
export function channelStatus(): Record<Channel, boolean> {
  return {
    discord: !!process.env.FANSLY_DISCORD_WEBHOOK,
    bluesky: !!(process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD),
    push: pushConfigured(),
  }
}

async function sendDiscord(text: string): Promise<ChannelResult> {
  const hook = process.env.FANSLY_DISCORD_WEBHOOK
  if (!hook) return { ok: false, detail: 'FANSLY_DISCORD_WEBHOOK is not set' }
  if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(hook)) {
    return { ok: false, detail: 'FANSLY_DISCORD_WEBHOOK is not a Discord webhook URL' }
  }
  const res = await fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // no mentions: the message text is admin-controlled but this keeps @everyone from firing by accident
    body: JSON.stringify({ content: text.slice(0, 1900), allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(8000),
  })
  return res.ok ? { ok: true, detail: 'Sent' } : { ok: false, detail: `Discord replied ${res.status}` }
}

async function sendBluesky(text: string, link: string): Promise<ChannelResult> {
  const identifier = process.env.BLUESKY_HANDLE
  const password = process.env.BLUESKY_APP_PASSWORD
  if (!identifier || !password) return { ok: false, detail: 'BLUESKY_HANDLE / BLUESKY_APP_PASSWORD are not set' }

  const sessRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
    signal: AbortSignal.timeout(8000),
  })
  if (!sessRes.ok) return { ok: false, detail: `Bluesky login failed (${sessRes.status})` }
  const sess = await sessRes.json() as { accessJwt: string; did: string }

  const record: Record<string, unknown> = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
  }
  // Make the link clickable: facet indexes are UTF-8 byte offsets
  const enc = new TextEncoder()
  const at = text.indexOf(link)
  if (at >= 0) {
    const byteStart = enc.encode(text.slice(0, at)).length
    record.facets = [{
      index: { byteStart, byteEnd: byteStart + enc.encode(link).length },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: link }],
    }]
  }

  const res = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.accessJwt}` },
    body: JSON.stringify({ repo: sess.did, collection: 'app.bsky.feed.post', record }),
    signal: AbortSignal.timeout(8000),
  })
  return res.ok ? { ok: true, detail: 'Posted' } : { ok: false, detail: `Bluesky replied ${res.status}` }
}

async function sendPush(title: string, body: string, url: string): Promise<ChannelResult> {
  if (!pushConfigured()) return { ok: false, detail: 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set' }
  const webpush = (await import('web-push')).default
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  const subs = await listSubs()
  if (subs.length === 0) return { ok: true, detail: 'No subscribers yet' }
  const payload = JSON.stringify({ title, body, url })
  let sent = 0
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 3600 })
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await removeSub(sub.endpoint)  // expired subscription
    }
  }))
  return { ok: true, detail: `Sent to ${sent} of ${subs.length}` }
}

async function run(fn: () => Promise<ChannelResult>): Promise<ChannelResult> {
  try { return await fn() } catch { return { ok: false, detail: 'Request failed' } }
}

/** Announce a stream on the channels enabled in the state. Never throws. */
export async function announceLive(state: FanslyLiveState): Promise<Partial<Record<Channel, ChannelResult>>> {
  const text = formatMessage(state.notify.message, state)
  const out: Partial<Record<Channel, ChannelResult>> = {}
  const jobs: Promise<void>[] = []
  if (state.notify.discord) jobs.push(run(() => sendDiscord(text)).then(r => { out.discord = r }))
  if (state.notify.bluesky) jobs.push(run(() => sendBluesky(text, state.url)).then(r => { out.bluesky = r }))
  if (state.notify.push) jobs.push(run(() => sendPush('Live on Fansly', state.title || text, state.url)).then(r => { out.push = r }))
  await Promise.all(jobs)
  return out
}

/** Sends a clearly-marked test message on a single channel. */
export async function sendTest(channel: Channel, state: FanslyLiveState): Promise<ChannelResult> {
  const text = '[test] ' + formatMessage(state.notify.message, state)
  if (channel === 'discord') return run(() => sendDiscord(text))
  if (channel === 'bluesky') return run(() => sendBluesky(text, state.url))
  return run(() => sendPush('Test notification', 'Notifications are working.', state.url))
}
