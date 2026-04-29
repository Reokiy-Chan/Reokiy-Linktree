'use client'

import type { CSSProperties } from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import KPICard from './components/KPICard'
import type { Stats } from '@/app/lib/data'

const TT: CSSProperties = {
  background: 'rgba(5,0,7,0.97)',
  border: '1px solid rgba(196,20,40,0.35)',
  borderRadius: 8,
  fontFamily: 'Space Mono, monospace',
  fontSize: 10,
  color: '#fee0f4',
  padding: '6px 10px',
}

const S: CSSProperties = { fontFamily: 'var(--font-body)' }

const AXIS_TICK = {
  fontSize: 8,
  fill: 'rgba(254,240,244,0.3)',
} as const
const PIE_COLORS = ['#c41428', '#e8195c', '#ff5fa0', '#a0004a', '#ff8030', '#7a0020']

function Sec({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(196,20,40,0.15)', borderRadius: 12, padding: '18px 20px', ...style }}>
      <div style={{ ...S, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function fmt(s: number) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), sec = s % 60
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

function Bar({ value, max, color = '#c41428' }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(value / Math.max(max, 1)) * 100}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export default function OverviewPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => { if (r.status === 401) { router.push('/admin/login'); return null } return r.json() })
      .then(d => { if (d) { setStats(d); setLoading(false) } })
      .catch(() => setLoading(false))
  }, [router])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', ...S, fontSize: 10, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em' }}>
      loading…
    </div>
  )
  if (!stats) return null

  const topPageMax = stats.byPage[0]?.count ?? 1
  const topCountryMax = stats.byCountry[0]?.count ?? 1
  const topRefMax = stats.byReferrer[0]?.count ?? 1

  // Device donut
  const deviceTotal = stats.byDevice.reduce((a, b) => a + b.count, 0)
  const deviceLabels: Record<string, string> = { desktop: '🖥 desktop', mobile: '📱 mobile', tablet: '⬜ tablet' }

  // Recent: last 5 unique sessions
  const recentSessions = stats.sessions.slice(0, 5)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', lineHeight: 1.1 }}>
          overview
        </div>
        <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>
          all-time summary
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <KPICard
          label="total visits"
          value={stats.total.toLocaleString()}
          delta={stats.deltaTotal}
          sub="vs yesterday"
          accent
        />
        <KPICard
          label="unique visitors"
          value={stats.unique.toLocaleString()}
          delta={stats.deltaUnique}
          sub="by IP"
          sparkData={stats.byDay.map(d => d.count)}
        />
        <KPICard
          label="active · last hour"
          value={stats.activeLastHour}
          sub="visitors"
        />
        <KPICard
          label="bounce rate"
          value={`${stats.bounceRate}%`}
          sub={stats.bounceRate < 50 ? 'good' : stats.bounceRate < 70 ? 'ok' : 'high'}
        />
        <KPICard
          label="avg session"
          value={fmt(stats.avgDuration)}
          sub="duration"
        />
      </div>

      {/* Visits over time + device donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 10, marginBottom: 14 }}>
        <Sec title="visits · last 7 days">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={stats.byDay} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c41428" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#c41428" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} labelFormatter={(label: unknown) => typeof label === 'string' ? fmtDate(label) : String(label ?? '')} formatter={(value: unknown) => [String(value ?? ''), 'visits'] as const} />
              <Area type="monotone" dataKey="count" stroke="#c41428" strokeWidth={1.5} fill="url(#grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Sec>

        <Sec title="devices">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <PieChart width={120} height={100}>
              <Pie data={stats.byDevice} dataKey="count" nameKey="device" cx={60} cy={50} innerRadius={30} outerRadius={48} paddingAngle={3}>
                {stats.byDevice.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {stats.byDevice.map((d, i) => (
                <div key={d.device} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.55)' }}>{deviceLabels[d.device] ?? d.device}</span>
                  </div>
                  <span style={{ ...S, fontSize: 9, color: 'var(--text)' }}>{deviceTotal > 0 ? Math.round((d.count / deviceTotal) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </Sec>
      </div>

      {/* Pages + Countries + Referrers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Sec title="top pages">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.byPage.slice(0, 6).map(p => (
              <div key={p.page} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{p.page}</span>
                  <span style={{ ...S, fontSize: 9, color: 'var(--text)', flexShrink: 0 }}>{p.count}</span>
                </div>
                <Bar value={p.count} max={topPageMax} />
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="top countries">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.byCountry.slice(0, 6).map(c => (
              <div key={c.code} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                    {c.code && (
                      <img
                        src={`https://flagcdn.com/16x12/${c.code.toLowerCase()}.png`}
                        alt={c.code}
                        style={{ width: 14, height: 10, objectFit: 'cover', marginRight: 5, borderRadius: 1, verticalAlign: 'middle', display: 'inline-block' }}
                      />
                    )}
                    {c.country}
                  </span>
                  <span style={{ ...S, fontSize: 9, color: 'var(--text)', flexShrink: 0 }}>{c.count}</span>
                </div>
                <Bar value={c.count} max={topCountryMax} color="#e8195c" />
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="referrers">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.byReferrer.length === 0 && (
              <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.25)' }}>no referrers yet</div>
            )}
            {stats.byReferrer.slice(0, 6).map(r => (
              <div key={r.referrer} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{r.referrer}</span>
                  <span style={{ ...S, fontSize: 9, color: 'var(--text)', flexShrink: 0 }}>{r.count}</span>
                </div>
                <Bar value={r.count} max={topRefMax} color="#ff5fa0" />
              </div>
            ))}
          </div>
        </Sec>
      </div>

      {/* Recent sessions + Browser/OS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
        <Sec title="recent sessions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentSessions.length === 0 && (
              <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.25)' }}>no sessions yet</div>
            )}
            {recentSessions.map(sess => (
              <div key={sess.sessionId} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(196,20,40,0.1)',
                borderRadius: 8, gap: 8,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <div style={{ ...S, fontSize: 9, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sess.city ? `${sess.city}, ` : ''}{sess.country ?? '—'}
                  </div>
                  <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sess.pages.join(' → ')}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                  <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.35)' }}>{fmt(sess.duration)}</div>
                  <div style={{ ...S, fontSize: 8, color: 'rgba(196,20,40,0.55)' }}>
                    {sess.browser ?? ''}{sess.os ? ` · ${sess.os}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="browsers">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {stats.byBrowser.slice(0, 6).map((b, i) => (
              <div key={b.browser} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.6)' }}>{b.browser}</span>
                  <span style={{ ...S, fontSize: 9, color: 'var(--text)' }}>{b.count}</span>
                </div>
                <Bar value={b.count} max={stats.byBrowser[0]?.count ?? 1} color={PIE_COLORS[i % PIE_COLORS.length]} />
              </div>
            ))}
          </div>
        </Sec>
      </div>
    </div>
  )
}