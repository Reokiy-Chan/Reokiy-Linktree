# Linktree Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete 7 pending features: Songs API, Carousel in About Me, Discord fix, image loading fix, performance, admin dashboard with charts, and SEO.

**Architecture:** Next.js 15 App Router; all new routes are server-side API routes or client components following existing patterns. Admin dashboard uses Recharts for data visualization. Auth and data utilities move to `app/lib/` to match existing imports.

**Tech Stack:** Next.js 15, React 19, TypeScript, Recharts (new), CSS-in-JS (existing pattern)

---

## Task 1: Fix app/lib — Create auth.ts and data.ts

All API routes import from `@/app/lib/auth` and `@/app/lib/data` but the actual files live in `app/hooks/`. This breaks compilation.

**Files:**
- Create: `app/lib/auth.ts` (copy from `app/hooks/auth.ts`)
- Create: `app/lib/data.ts` (copy from `app/hooks/data.ts`)

- [ ] **Step 1: Create `app/lib/auth.ts`**

```typescript
import { createHash, createHmac, timingSafeEqual } from 'crypto'

export function hashPassword(password: string): string {
  return createHash('sha256').update(password + 'reokiy_salt').digest('hex')
}

export function createToken(secret: string): string {
  const payload = `admin:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', secret).update(payloadB64).digest('hex')
  return `${payloadB64}.${sig}`
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return false
    const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('hex')
    const a = Buffer.from(sig)
    const b = Buffer.from(expectedSig)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Create `app/lib/data.ts`**

```typescript
import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
const VISITS_FILE = path.join(DATA_DIR, 'visits.json')

export interface Visit {
  id: string
  page: string
  timestamp: string
  country?: string
  countryCode?: string
  city?: string
  referrer?: string
  ip?: string
}

export interface VisitsData {
  visits: Visit[]
}

export function readVisits(): VisitsData {
  try {
    if (!existsSync(VISITS_FILE)) return { visits: [] }
    const content = readFileSync(VISITS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { visits: [] }
  }
}

export function writeVisits(data: VisitsData): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(VISITS_FILE, JSON.stringify(data, null, 2))
  } catch {}
}

export function addVisit(visit: Omit<Visit, 'id'>): void {
  const data = readVisits()
  data.visits.push({ ...visit, id: crypto.randomUUID() })
  if (data.visits.length > 10000) data.visits = data.visits.slice(-10000)
  writeVisits(data)
}

export interface Stats {
  total: number
  unique: number
  topPage: string
  topCountry: string
  topCountryCode: string
  byPage: { page: string; count: number }[]
  byCountry: { country: string; code: string; count: number }[]
  byDay: { date: string; count: number }[]
  byReferrer: { referrer: string; count: number }[]
  recent: Visit[]
}

export function computeStats(visits: Visit[]): Stats {
  const pageCount = new Map<string, number>()
  const countryCount = new Map<string, { name: string; code: string; count: number }>()
  const ipSet = new Set<string>()
  const dayCount = new Map<string, number>()
  const refCount = new Map<string, number>()

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  for (const v of visits) {
    pageCount.set(v.page, (pageCount.get(v.page) ?? 0) + 1)
    if (v.ip) ipSet.add(v.ip)
    if (v.country && v.countryCode) {
      const cur = countryCount.get(v.countryCode)
      countryCount.set(v.countryCode, { name: v.country, code: v.countryCode, count: (cur?.count ?? 0) + 1 })
    }
    if (v.referrer && v.referrer !== '') {
      try {
        const ref = new URL(v.referrer).hostname
        refCount.set(ref, (refCount.get(ref) ?? 0) + 1)
      } catch {}
    }
    const d = new Date(v.timestamp)
    if (d >= sevenDaysAgo) {
      const day = d.toISOString().slice(0, 10)
      dayCount.set(day, (dayCount.get(day) ?? 0) + 1)
    }
  }

  const byDay: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const day = d.toISOString().slice(0, 10)
    byDay.push({ date: day, count: dayCount.get(day) ?? 0 })
  }

  const byPage = [...pageCount.entries()].map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count).slice(0, 10)
  const byCountry = [...countryCount.values()].sort((a, b) => b.count - a.count).slice(0, 10)
  const byReferrer = [...refCount.entries()].map(([referrer, count]) => ({ referrer, count })).sort((a, b) => b.count - a.count).slice(0, 10)

  return {
    total: visits.length,
    unique: ipSet.size,
    topPage: byPage[0]?.page ?? '/',
    topCountry: byCountry[0]?.name ?? '—',
    topCountryCode: byCountry[0]?.code ?? '',
    byPage,
    byCountry,
    byDay,
    byReferrer,
    recent: [...visits].reverse().slice(0, 20),
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/lib/auth.ts app/lib/data.ts
git commit -m "fix: add missing app/lib/auth and app/lib/data used by API routes"
```

---

## Task 2: Fix /api/carousel URL mismatch

`Carousel.tsx` fetches `/api/carousel` but the route file is at `app/api/carrousel/route.ts` (double-r). Rename the directory.

**Files:**
- Rename: `app/api/carrousel/` → `app/api/carousel/`

- [ ] **Step 1: Create `app/api/carousel/route.ts`** with the same content as the old carrousel route:

```typescript
import { NextResponse } from 'next/server'
import { readdirSync, existsSync } from 'fs'
import path from 'path'

const CAROUSEL_DIR = path.join(process.cwd(), 'public', 'images', 'carrousel')
const SUPPORTED = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'])

export async function GET() {
  try {
    if (!existsSync(CAROUSEL_DIR)) {
      return NextResponse.json({ images: [] })
    }
    const files = readdirSync(CAROUSEL_DIR)
    const images = files.filter(f => {
      const ext = f.split('.').pop()?.toLowerCase()
      return ext && SUPPORTED.has(ext) && !f.startsWith('.')
    })
    return NextResponse.json({ images })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
```

- [ ] **Step 2: Delete old route** — remove `app/api/carrousel/route.ts`

- [ ] **Step 3: Commit**

```bash
git add app/api/carousel/route.ts
git rm app/api/carrousel/route.ts
git commit -m "fix: rename /api/carrousel to /api/carousel to match Carousel component"
```

---

## Task 3: Create GET /api/songs

`MusicPlayer.tsx` calls `GET /api/songs` expecting `{ songs: string[] }`. The route doesn't exist.

**Files:**
- Create: `app/api/songs/route.ts`

- [ ] **Step 1: Create `app/api/songs/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { readdirSync, existsSync } from 'fs'
import path from 'path'

const SONGS_DIR = path.join(process.cwd(), 'public', 'audio', 'songs')
const SUPPORTED = new Set(['mp3', 'mp4', 'm4a', 'ogg', 'wav', 'flac', 'aac'])

export async function GET() {
  try {
    if (!existsSync(SONGS_DIR)) {
      return NextResponse.json({ songs: [] })
    }
    const files = readdirSync(SONGS_DIR)
    const songs = files.filter(f => {
      const ext = f.split('.').pop()?.toLowerCase()
      return ext && SUPPORTED.has(ext) && !f.startsWith('.')
    })
    return NextResponse.json({ songs })
  } catch {
    return NextResponse.json({ songs: [] })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/songs/route.ts
git commit -m "feat: add GET /api/songs endpoint for music player"
```

---

## Task 4: Fix Discord status detection

The Discord user ID is hardcoded in `app/hooks/useDiscord.ts`. Move it to an env var so it's configurable. Also add Lanyard registration instructions.

**Files:**
- Modify: `app/hooks/useDiscord.ts` (line 27)
- Create: `.env.example`

- [ ] **Step 1: Update `app/hooks/useDiscord.ts` — change line 27**

Change:
```typescript
const DISCORD_USER_ID = '1023628644213587998'
```
To:
```typescript
const DISCORD_USER_ID = process.env.NEXT_PUBLIC_DISCORD_USER_ID ?? '1023628644213587998'
```

- [ ] **Step 2: Create `.env.example`**

```bash
# Admin panel
ADMIN_PASSWORD=change_me
ADMIN_SECRET=change_me_secret

# Discord status (user must join discord.gg/lanyard to enable)
NEXT_PUBLIC_DISCORD_USER_ID=1023628644213587998

# Site URL for SEO
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useDiscord.ts .env.example
git commit -m "fix: make Discord user ID configurable via NEXT_PUBLIC_DISCORD_USER_ID env var"
```

> **Note for setup:** The Lanyard API requires the Discord user to join the Lanyard server (discord.gg/lanyard) for status detection to work.

---

## Task 5: Add Carousel section to About Me page

The `Carousel` component exists and works. Just add it to `app/aboutme/page.tsx` before the fun facts section.

**Files:**
- Modify: `app/aboutme/page.tsx`

- [ ] **Step 1: Add import at top of `app/aboutme/page.tsx`** (after the ParticlesBg import, line 4):

```typescript
import Carousel from '../components/Carousel'
```

- [ ] **Step 2: Add Carousel section before the fun facts block** (around line 389, before `{/* ── Fun facts ── */}`):

```tsx
{/* ── Gallery ── */}
<div className="card" style={{ marginBottom: 16 }}>
  <SectionHeader>galería</SectionHeader>
  <Carousel autoPlay interval={4000} />
</div>
```

Note: The `Carousel` component returns `null` if no images are found, so the section header will still show. To hide the header when empty, wrap in a conditional. Since the user controls which images go in `/public/images/carrousel/`, this is acceptable.

- [ ] **Step 3: Commit**

```bash
git add app/aboutme/page.tsx
git commit -m "feat: add gallery carousel section to about me page"
```

---

## Task 6: Fix image loading and performance

**Issues:**
1. `next.config.mjs` has `images: { unoptimized: true }` — disables Next.js image optimization
2. Background images are 3-9MB PNGs with no preload
3. Avatar image in `page.tsx` uses `<img>` (not optimized)

**Files:**
- Modify: `next.config.mjs`
- Modify: `app/layout.tsx` (add font preload)
- Modify: `app/components/ThemeProvider.tsx` (preload bg images)

- [ ] **Step 1: Update `next.config.mjs`** to re-enable image optimization:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
  },
}

export default nextConfig
```

- [ ] **Step 2: Read `app/components/ThemeProvider.tsx`** to understand current structure before editing.

- [ ] **Step 3: Add bg image preload in ThemeProvider** — After the theme is selected, inject a `<link rel="preload">` for the current bg image. Find the section where the theme's `bg` property is applied (likely in a `useEffect` that sets CSS vars) and add:

```typescript
// Inside the useEffect that applies the theme, after setting CSS vars:
const existingPreload = document.querySelector('link[data-bg-preload]')
if (existingPreload) existingPreload.remove()
if (theme.bg) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = theme.bg
  link.setAttribute('data-bg-preload', '1')
  document.head.appendChild(link)
}
```

- [ ] **Step 4: Add font preload to `app/layout.tsx`** — in the `<head>` section, before the existing preconnect tags (line 24):

```tsx
<link
  rel="preload"
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Space+Mono:wght@400&display=swap"
  as="style"
/>
```

- [ ] **Step 5: Commit**

```bash
git add next.config.mjs app/layout.tsx app/components/ThemeProvider.tsx
git commit -m "perf: re-enable Next.js image optimization, add bg image and font preloads"
```

---

## Task 7: Install Recharts

The admin dashboard needs Recharts. Install it before writing the component.

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Verify install** — check `package.json` has `"recharts"` in dependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts dependency for admin dashboard"
```

---

## Task 8: Create Admin Dashboard Page

The stats API exists at `GET /api/admin/stats`. The login page redirects to `/admin` on success. Create `/admin/page.tsx` as a protected dashboard with Recharts charts.

**Files:**
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create `app/admin/page.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface Stats {
  total: number
  unique: number
  topPage: string
  topCountry: string
  byPage: { page: string; count: number }[]
  byCountry: { country: string; code: string; count: number }[]
  byDay: { date: string; count: number }[]
  byReferrer: { referrer: string; count: number }[]
  recent: { id: string; page: string; timestamp: string; country?: string; city?: string; referrer?: string }[]
}

const CHART_COLORS = ['#c41428', '#e8195c', '#ff5fa0', '#a0004a', '#ff8fb0', '#6b0020', '#ff3070']

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(196,20,40,0.25)',
      borderRadius: 16,
      padding: '20px 24px',
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: 9,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(254,240,244,0.45)',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 28,
        color: 'var(--text)',
        lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(196,20,40,0.2)',
      borderRadius: 16,
      padding: '20px 24px',
      marginBottom: 16,
    }}>
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'rgba(196,20,40,0.8)',
        marginBottom: 16,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

const tooltipStyle = {
  background: 'rgba(5,0,7,0.95)',
  border: '1px solid rgba(196,20,40,0.35)',
  borderRadius: 8,
  fontFamily: 'var(--font-body)',
  fontSize: 11,
  color: '#fee0f4',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => {
        if (r.status === 401) { router.push('/admin/login'); return null }
        return r.json()
      })
      .then(data => {
        if (data) setStats(data as Stats)
        setLoading(false)
      })
      .catch(() => { router.push('/admin/login') })
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--text-muted)' }}>
          cargando…
        </div>
      </main>
    )
  }

  if (!stats) return null

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 20px', paddingBottom: 60 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)' }}>
              panel de control
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
              reokiy • analytics
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: '1px solid rgba(196,20,40,0.4)',
              borderRadius: 8,
              padding: '8px 16px',
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            cerrar sesión
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <StatCard label="visitas totales" value={stats.total} />
          <StatCard label="visitantes únicos" value={stats.unique} />
          <StatCard label="página top" value={stats.topPage} />
          <StatCard label="país top" value={stats.topCountry} />
        </div>

        {/* Visits per day — line chart */}
        <ChartCard title="visitas últimos 7 días">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.byDay} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(254,240,244,0.35)', fontSize: 9, fontFamily: 'var(--font-body)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.slice(5)}
              />
              <YAxis
                tick={{ fill: 'rgba(254,240,244,0.35)', fontSize: 9, fontFamily: 'var(--font-body)' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(196,20,40,0.3)' }} />
              <Line
                type="monotone"
                dataKey="count"
                name="visitas"
                stroke="#c41428"
                strokeWidth={2}
                dot={{ fill: '#c41428', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top pages + top countries side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 }}>
          <ChartCard title="páginas más visitadas">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byPage.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 10 }}>
                <XAxis type="number" tick={{ fill: 'rgba(254,240,244,0.35)', fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="page" tick={{ fill: 'rgba(254,240,244,0.5)', fontSize: 9, fontFamily: 'var(--font-body)' }} tickLine={false} axisLine={false} width={60} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(196,20,40,0.08)' }} />
                <Bar dataKey="count" name="visitas" fill="#c41428" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="países">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byCountry.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 10 }}>
                <XAxis type="number" tick={{ fill: 'rgba(254,240,244,0.35)', fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="country" tick={{ fill: 'rgba(254,240,244,0.5)', fontSize: 9, fontFamily: 'var(--font-body)' }} tickLine={false} axisLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(196,20,40,0.08)' }} />
                <Bar dataKey="count" name="visitas" radius={[0, 4, 4, 0]}>
                  {stats.byCountry.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Referrers pie chart */}
        {stats.byReferrer.length > 0 && (
          <ChartCard title="referrers">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={stats.byReferrer.slice(0, 6)}
                    dataKey="count"
                    nameKey="referrer"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {stats.byReferrer.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stats.byReferrer.slice(0, 6).map((r, i) => (
                  <div key={r.referrer} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(254,240,244,0.6)' }}>
                      {r.referrer} <span style={{ color: 'rgba(196,20,40,0.7)' }}>({r.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        )}

        {/* Recent visits table */}
        <ChartCard title="visitas recientes">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['página', 'país', 'ciudad', 'referrer', 'hora'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left',
                      fontFamily: 'var(--font-body)',
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(196,20,40,0.7)',
                      paddingBottom: 10,
                      paddingRight: 16,
                      borderBottom: '1px solid rgba(196,20,40,0.15)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recent.map(v => (
                  <tr key={v.id}>
                    {[
                      v.page,
                      v.country ?? '—',
                      v.city ?? '—',
                      v.referrer ? (() => { try { return new URL(v.referrer).hostname } catch { return v.referrer } })() : '—',
                      new Date(v.timestamp).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    ].map((cell, ci) => (
                      <td key={ci} style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 10,
                        color: 'rgba(254,240,244,0.55)',
                        padding: '8px 16px 8px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        whiteSpace: 'nowrap',
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: add admin dashboard with Recharts analytics"
```

---

## Task 9: SEO — Metadata, Sitemap, Robots

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`

- [ ] **Step 1: Update `app/layout.tsx`** — replace the existing `metadata` export (lines 6-17) with a richer version:

```typescript
export const metadata: Metadata = {
  title: {
    default: 'reokiy • links',
    template: '%s • reokiy',
  },
  description: 'reokiy — VRChat content creator, lewd elf, avatar maker. Links, socials, and more.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://reokiy.vercel.app'),
  keywords: ['reokiy', 'VRChat', 'content creator', 'femboy', 'avatar', 'fansly', 'linktree'],
  authors: [{ name: 'reokiy' }],
  creator: 'reokiy',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'reokiy • links',
    description: 'VRChat content creator • your fav lewd elf',
    siteName: 'reokiy',
    images: [{ url: '/images/logo.png', width: 400, height: 400, alt: 'reokiy' }],
  },
  twitter: {
    card: 'summary',
    title: 'reokiy • links',
    description: 'VRChat content creator • your fav lewd elf',
    creator: '@Reoki14',
    images: ['/images/logo.png'],
  },
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}
```

- [ ] **Step 2: Create `app/sitemap.ts`**

```typescript
import { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://reokiy.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/aboutme`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  ]
}
```

- [ ] **Step 3: Create `app/robots.ts`**

```typescript
import { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://reokiy.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/forreo'] },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/sitemap.ts app/robots.ts
git commit -m "feat: add SEO metadata, sitemap.xml and robots.txt"
```

---

## Task 10: Verify build

Run the Next.js build to catch any TypeScript or compilation errors.

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: no errors. If there are TypeScript errors, fix them before proceeding.

- [ ] **Step 2: If build passes, commit any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build errors"
```
