'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'Overview', icon: '◈' },
  { href: '/admin/live', label: 'Live', icon: '◎' },
  { href: '/admin/geography', label: 'Geography', icon: '↗' },
  { href: '/admin/traffic', label: 'Traffic', icon: '⊡' },
  { href: '/admin/sessions', label: 'Sessions', icon: '⊞' },
]

interface LiveData { activeLastHour: number; todayTotal: number }

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [live, setLive] = useState<LiveData>({ activeLastHour: 0, todayTotal: 0 })
  const [open, setOpen] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/admin/stream')
    esRef.current = es
    es.onmessage = (e) => {
      try { const d = JSON.parse(e.data) as LiveData; setLive(d) } catch {}
    }
    es.onerror = () => { es.close() }
    return () => es.close()
  }, [])

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--text)', lineHeight: 1 }}>
          reokiy
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'rgba(196,20,40,0.7)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4 }}>
          analytics
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {NAV.map(({ href, label, icon }) => (
          <a
            key={href}
            href={href}
            onClick={e => { e.preventDefault(); setOpen(false); router.push(href) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              fontFamily: 'var(--font-body)', fontSize: 11,
              letterSpacing: '0.08em', textDecoration: 'none',
              transition: 'all 0.15s',
              background: isActive(href) ? 'rgba(196,20,40,0.14)' : 'transparent',
              color: isActive(href) ? 'var(--text)' : 'var(--text-muted)',
              border: isActive(href) ? '1px solid rgba(196,20,40,0.3)' : '1px solid transparent',
            }}
          >
            <span style={{ fontSize: 14, width: 18, textAlign: 'center', color: isActive(href) ? 'var(--primary)' : 'inherit' }}>
              {icon}
            </span>
            {label}
          </a>
        ))}
      </nav>

      {/* Live indicator */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)',
            boxShadow: '0 0 6px var(--primary)',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            {live.activeLastHour} active (1h)
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'rgba(254,240,244,0.25)', marginBottom: 12, letterSpacing: '0.08em' }}>
          {live.todayTotal} visits today
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', background: 'none', border: '1px solid rgba(196,20,40,0.22)',
            borderRadius: 6, padding: '7px 0', fontFamily: 'var(--font-body)',
            fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(254,240,244,0.35)', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(196,20,40,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(196,20,40,0.22)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(254,240,244,0.35)' }}
        >
          log out
        </button>
      </div>

      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1;box-shadow:0 0 6px var(--primary)} 50%{opacity:0.4;box-shadow:0 0 3px var(--primary)} }`}</style>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{
        width: 200, minHeight: '100vh', flexShrink: 0,
        background: 'rgba(5,0,7,0.95)',
        borderRight: '1px solid var(--glass-border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh',
      }}
        className="admin-sidebar-desktop"
      >
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="admin-mobile-bar" style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(5,0,7,0.97)', borderBottom: '1px solid var(--glass-border)',
        padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--text)' }}>reokiy</span>
        <button onClick={() => setOpen(o => !o)} style={{
          background: 'none', border: '1px solid var(--glass-border)', borderRadius: 6,
          padding: '5px 10px', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 11,
        }}>
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(5,0,7,0.98)',
          display: 'flex', flexDirection: 'column',
        }}>
          {sidebarContent}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-mobile-bar { display: flex !important; }
        }
      `}</style>
    </>
  )
}