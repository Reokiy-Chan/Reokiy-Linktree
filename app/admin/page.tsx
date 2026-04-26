'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Visit {
  id: string
  page: string
  timestamp: string
  country?: string
  city?: string
  referrer?: string
}

interface Stats {
  total: number
  unique: number
  topPage: string
  topCountry: string
  byPage: { page: string; count: number }[]
  byCountry: { country: string; code: string; count: number }[]
  byDay: { date: string; count: number }[]
  byReferrer: { referrer: string; count: number }[]
  recent: Visit[]
}

const COLORS = ['#c41428', '#e8195c', '#ff5fa0', '#a0004a', '#ff8fb0', '#6b0020', '#ff3070']

const TTStyle = {
  background: 'rgba(5,0,7,0.97)',
  border: '1px solid rgba(196,20,40,0.35)',
  borderRadius: 8,
  fontFamily: 'Space Mono, monospace',
  fontSize: 11,
  color: '#fee0f4',
  padding: '6px 10px',
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(196,20,40,0.25)',
      borderRadius: 14,
      padding: '18px 22px',
      flex: 1,
      minWidth: 130,
    }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.38)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 26, color: '#fee0f4', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(196,20,40,0.18)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)', marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => {
        if (r.status === 401) { router.replace('/admin/login'); return null }
        return r.json() as Promise<Stats>
      })
      .then(data => { if (data) { setStats(data); setLoading(false) } })
      .catch(() => router.replace('/admin/login'))
  }, [router])

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 18, color: 'rgba(254,240,244,0.4)' }}>cargando…</span>
      </main>
    )
  }

  if (!stats) return null

  const noReferrer = stats.byReferrer.length === 0

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px 80px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 28, color: '#fee0f4', margin: 0 }}>
              panel de control
            </h1>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
              reokiy • analytics
            </div>
          </div>
          <button
            onClick={logout}
            style={{ background: 'none', border: '1px solid rgba(196,20,40,0.35)', borderRadius: 8, padding: '7px 14px', fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.4)', cursor: 'pointer' }}
          >
            cerrar sesión
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <StatCard label="visitas totales" value={stats.total} />
          <StatCard label="visitantes únicos" value={stats.unique} />
          <StatCard label="página top" value={stats.topPage} />
          <StatCard label="país top" value={stats.topCountry} />
        </div>

        {/* Visits per day */}
        <Section title="visitas — últimos 7 días">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats.byDay} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <XAxis dataKey="date" tick={{ fill: 'rgba(254,240,244,0.3)', fontSize: 9, fontFamily: 'Space Mono, monospace' }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: 'rgba(254,240,244,0.3)', fontSize: 9, fontFamily: 'Space Mono, monospace' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TTStyle} cursor={{ stroke: 'rgba(196,20,40,0.25)' }} />
              <Line type="monotone" dataKey="count" name="visitas" stroke="#c41428" strokeWidth={2} dot={{ fill: '#c41428', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Section>

        {/* Pages + Countries */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 0 }}>
          <Section title="páginas más visitadas">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.byPage.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 10 }}>
                <XAxis type="number" tick={{ fill: 'rgba(254,240,244,0.3)', fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="page" tick={{ fill: 'rgba(254,240,244,0.45)', fontSize: 9, fontFamily: 'Space Mono, monospace' }} tickLine={false} axisLine={false} width={55} />
                <Tooltip contentStyle={TTStyle} cursor={{ fill: 'rgba(196,20,40,0.07)' }} />
                <Bar dataKey="count" name="visitas" fill="#c41428" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <Section title="países">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.byCountry.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 10 }}>
                <XAxis type="number" tick={{ fill: 'rgba(254,240,244,0.3)', fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="country" tick={{ fill: 'rgba(254,240,244,0.45)', fontSize: 9, fontFamily: 'Space Mono, monospace' }} tickLine={false} axisLine={false} width={65} />
                <Tooltip contentStyle={TTStyle} cursor={{ fill: 'rgba(196,20,40,0.07)' }} />
                <Bar dataKey="count" name="visitas" radius={[0, 4, 4, 0]}>
                  {stats.byCountry.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Referrers donut */}
        {!noReferrer && (
          <Section title="referrers">
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
              <ResponsiveContainer width={160} height={160} style={{ flexShrink: 0 }}>
                <PieChart>
                  <Pie data={stats.byReferrer.slice(0, 6)} dataKey="count" nameKey="referrer" cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={3}>
                    {stats.byReferrer.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TTStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stats.byReferrer.slice(0, 6).map((r, i) => (
                  <div key={r.referrer} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(254,240,244,0.55)' }}>
                      {r.referrer} <span style={{ color: 'rgba(196,20,40,0.65)' }}>({r.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* Recent visits table */}
        <Section title="visitas recientes">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['página', 'país', 'ciudad', 'referrer', 'hora'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontFamily: 'Space Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)', paddingBottom: 10, paddingRight: 16, borderBottom: '1px solid rgba(196,20,40,0.12)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recent.map(v => {
                  let ref = '—'
                  if (v.referrer) { try { ref = new URL(v.referrer).hostname } catch { ref = v.referrer } }
                  const time = new Date(v.timestamp).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  return (
                    <tr key={v.id}>
                      {[v.page, v.country ?? '—', v.city ?? '—', ref, time].map((cell, ci) => (
                        <td key={ci} style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'rgba(254,240,244,0.5)', padding: '7px 16px 7px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>

      </div>
    </main>
  )
}
