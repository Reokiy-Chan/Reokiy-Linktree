'use client'

import type { CSSProperties } from 'react'
import { useState, useEffect } from 'react'
import DonutChart from './components/DonutChart'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import KPICard from './components/KPICard'
import type { Stats } from '@/app/lib/data'

type RaffleStats = {
  active: number
  total: number
  totalEntries: number
  totalWinners: number
  recent: { id: string; title: string; status: string; entries: number }[]
}

type CodeStats = {
  total: number
  redeemed: number
  available: number
  byType: { type: string; count: number }[]
}

type FullStats = Stats & { raffles?: RaffleStats; codes?: CodeStats }

const TT: CSSProperties = {
  background: 'rgba(5,0,7,0.97)',
  border: '1px solid rgba(196,20,40,0.35)',
  borderRadius: 8,
  fontFamily: 'Space Mono, monospace',
  fontSize: 12,
  color: '#fee0f4',
  padding: '6px 10px',
}

const S: CSSProperties = { fontFamily: 'var(--font-body)' }

const AXIS_TICK = { fontSize: 12, fill: 'rgba(254,240,244,0.3)' } as const
const PIE_COLORS = ['#c41428', '#e8195c', '#ff5fa0', '#a0004a', '#ff8030', '#7a0020']

function Sec({ title, children, style }: { title: string; children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(196,20,40,0.15)', borderRadius: 12, padding: '18px 20px', ...style }}>
      <div style={{ ...S, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)', marginBottom: 14 }}>{title}</div>
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
    <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(value / Math.max(max, 1)) * 100}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active'
  return (
    <span style={{
      ...S, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 20,
      background: active ? 'rgba(196,20,40,0.18)' : 'rgba(255,255,255,0.06)',
      color: active ? '#e8195c' : 'rgba(254,240,244,0.35)',
      border: `1px solid ${active ? 'rgba(196,20,40,0.3)' : 'rgba(255,255,255,0.08)'}`,
    }}>{status}</span>
  )
}

export default function OverviewPage() {
  const router = useRouter()
  const [stats, setStats] = useState<FullStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => { if (r.status === 401) { router.push('/admin/login'); return null } return r.json() })
      .then(d => { if (d) { setStats(d); setLoading(false) } })
      .catch(() => setLoading(false))
  }, [router])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em' }}>
      loading…
    </div>
  )
  if (!stats) return null

  const topPageMax = stats.byPage[0]?.count ?? 1
  const topCountryMax = stats.byCountry[0]?.count ?? 1
  const topRefMax = stats.byReferrer[0]?.count ?? 1
  const topBrowserMax = stats.byBrowser[0]?.count ?? 1
  const deviceTotal = stats.byDevice.reduce((a, b) => a + b.count, 0)
  const recentSessions = stats.sessions.slice(0, 5)
  const raffles = stats.raffles
  const codes = stats.codes

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', lineHeight: 1.1 }}>
          overview
        </div>
        <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>
          all-time summary
        </div>
      </div>

      {/* KPI row — 7 cards */}
      <div className="ov-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 12 }}>
        <KPICard label="total visits" value={stats.total.toLocaleString()} delta={stats.deltaTotal} sub="vs yesterday" accent />
        <KPICard label="unique visitors" value={stats.unique.toLocaleString()} delta={stats.deltaUnique} sub="by IP" sparkData={stats.byDay.map(d => d.count)} />
        <KPICard label="active · 1h" value={stats.activeLastHour} sub="right now" />
        <KPICard label="bounce rate" value={`${stats.bounceRate}%`} sub={stats.bounceRate < 50 ? 'good' : stats.bounceRate < 70 ? 'ok' : 'high'} />
        <KPICard label="avg session" value={fmt(stats.avgDuration)} sub="duration" />
        <KPICard label="active raffles" value={raffles?.active ?? '—'} sub={`${raffles?.total ?? 0} total`} />
        <KPICard label="codes left" value={codes?.available ?? '—'} sub={`${codes?.total ?? 0} total`} />
      </div>

      {/* Chart + Devices */}
      <div className="ov-chart-row" style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 10, marginBottom: 10 }}>
        <Sec title="visits · last 7 days">
          <ResponsiveContainer width="100%" height={118}>
            <AreaChart data={stats.byDay} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c41428" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#c41428" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} labelFormatter={(l: unknown) => typeof l === 'string' ? fmtDate(l) : String(l ?? '')} formatter={(v: unknown) => [String(v ?? ''), 'visits'] as const} />
              <Area type="monotone" dataKey="count" stroke="#c41428" strokeWidth={1.5} fill="url(#grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Sec>

        <Sec title="devices">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <DonutChart
              size={100}
              thickness={12}
              slices={stats.byDevice.map((d, i) => ({ label: d.device, value: d.count, color: PIE_COLORS[i % PIE_COLORS.length] }))}
              centerLabel={{
                value: `${stats.byDevice[0] && deviceTotal > 0 ? Math.round((stats.byDevice[0].count / deviceTotal) * 100) : 0}%`,
                sub: stats.byDevice[0]?.device?.toUpperCase() ?? 'DESKTOP',
              }}
            />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {stats.byDevice.map((d, i) => (
                <div key={d.device} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.55)' }}>{d.device}</span>
                  </div>
                  <span style={{ ...S, fontSize: 11, color: 'var(--text)' }}>{deviceTotal > 0 ? Math.round((d.count / deviceTotal) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </Sec>
      </div>

      {/* 4-column analytics: pages · countries · referrers · browsers */}
      <div className="ov-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
        <Sec title="top pages">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {stats.byPage.slice(0, 5).map(p => (
              <div key={p.page} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '74%' }}>{p.page}</span>
                  <span style={{ ...S, fontSize: 11, color: 'var(--text)', flexShrink: 0 }}>{p.count}</span>
                </div>
                <Bar value={p.count} max={topPageMax} />
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="top countries">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {stats.byCountry.slice(0, 5).map(c => (
              <div key={c.code} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '74%' }}>
                    {c.code && (
                      <img src={`https://flagcdn.com/16x12/${c.code.toLowerCase()}.png`} alt={c.code}
                        style={{ width: 13, height: 9, objectFit: 'cover', marginRight: 5, borderRadius: 1, verticalAlign: 'middle', display: 'inline-block' }} />
                    )}
                    {c.country}
                  </span>
                  <span style={{ ...S, fontSize: 11, color: 'var(--text)', flexShrink: 0 }}>{c.count}</span>
                </div>
                <Bar value={c.count} max={topCountryMax} color="#e8195c" />
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="referrers">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {stats.byReferrer.length === 0 && (
              <div style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.25)' }}>no referrers yet</div>
            )}
            {stats.byReferrer.slice(0, 5).map(r => (
              <div key={r.referrer} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '74%' }}>{r.referrer}</span>
                  <span style={{ ...S, fontSize: 11, color: 'var(--text)', flexShrink: 0 }}>{r.count}</span>
                </div>
                <Bar value={r.count} max={topRefMax} color="#ff5fa0" />
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="browsers">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {stats.byBrowser.slice(0, 5).map((b, i) => (
              <div key={b.browser} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '74%' }}>{b.browser}</span>
                  <span style={{ ...S, fontSize: 11, color: 'var(--text)', flexShrink: 0 }}>{b.count}</span>
                </div>
                <Bar value={b.count} max={topBrowserMax} color={PIE_COLORS[i % PIE_COLORS.length]} />
              </div>
            ))}
          </div>
        </Sec>
      </div>

      {/* Giveaways + Codes */}
      <div className="ov-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        {/* Giveaways panel */}
        <Sec title="giveaways">
          {!raffles ? (
            <div style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.25)' }}>no data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* summary row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'total', value: raffles.total },
                  { label: 'entries', value: raffles.totalEntries },
                  { label: 'winners', value: raffles.totalWinners },
                ].map(item => (
                  <div key={item.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(196,20,40,0.1)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ ...S, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{item.value}</div>
                    <div style={{ ...S, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.3)', marginTop: 2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {/* recent list */}
              {raffles.recent.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ ...S, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.25)', marginBottom: 2 }}>recent</div>
                  {raffles.recent.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(196,20,40,0.08)', borderRadius: 7 }}>
                      <span style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{r.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.35)' }}>{r.entries} entries</span>
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Sec>

        {/* Codes panel */}
        <Sec title="codes">
          {!codes ? (
            <div style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.25)' }}>no data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* summary row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'total', value: codes.total },
                  { label: 'redeemed', value: codes.redeemed },
                  { label: 'available', value: codes.available },
                ].map(item => (
                  <div key={item.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(196,20,40,0.1)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ ...S, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{item.value}</div>
                    <div style={{ ...S, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.3)', marginTop: 2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {/* by type */}
              {codes.byType.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ ...S, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.25)', marginBottom: 2 }}>by type</div>
                  {codes.byType.map((t, i) => (
                    <div key={t.type} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.6)', textTransform: 'capitalize' }}>{t.type}</span>
                        <span style={{ ...S, fontSize: 11, color: 'var(--text)' }}>{t.count}</span>
                      </div>
                      <Bar value={t.count} max={codes.byType[0]?.count ?? 1} color={PIE_COLORS[i % PIE_COLORS.length]} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Sec>
      </div>

      {/* Recent sessions — full width */}
      <Sec title="recent sessions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {recentSessions.length === 0 && (
            <div style={{ ...S, fontSize: 12, color: 'rgba(254,240,244,0.25)' }}>no sessions yet</div>
          )}
          {recentSessions.map(sess => (
            <div key={sess.sessionId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(196,20,40,0.09)',
              borderRadius: 8, gap: 8,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <div style={{ ...S, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sess.city ? `${sess.city}, ` : ''}{sess.country ?? '—'}
                </div>
                <div style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sess.pages.join(' → ')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <div style={{ ...S, fontSize: 11, color: 'rgba(254,240,244,0.35)' }}>{fmt(sess.duration)}</div>
                <div style={{ ...S, fontSize: 11, color: 'rgba(196,20,40,0.55)' }}>
                  {sess.browser ?? ''}{sess.os ? ` · ${sess.os}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Sec>

      <style>{`
        @media (max-width: 1000px) {
          .ov-kpis { grid-template-columns: repeat(4, 1fr) !important; }
          .ov-4col { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 700px) {
          .ov-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .ov-chart-row { grid-template-columns: 1fr !important; }
          .ov-4col { grid-template-columns: 1fr !important; }
          .ov-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
