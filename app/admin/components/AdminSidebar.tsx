'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'   // ← añadido

type Section = 'overview' | 'live' | 'traffic' | 'sessions' | 'codes' | 'giveaways' | 'settings'

const NAV: { href: string; label: string; icon: string; section: Section }[] = [
  { href: '/admin', label: 'Overview', icon: '◈', section: 'overview' },
  { href: '/admin/live', label: 'Live', icon: '◎', section: 'live' },
  { href: '/admin/traffic', label: 'Traffic', icon: '⊡', section: 'traffic' },
  { href: '/admin/sessions', label: 'Sessions', icon: '⊞', section: 'sessions' },
  { href: '/admin/codes', label: 'Codes', icon: '⊛', section: 'codes' },
  { href: '/admin/raffles', label: 'Giveaways', icon: '🎲', section: 'giveaways' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙', section: 'settings' },
]

interface LiveData { activeLastHour: number; todayTotal: number }
interface Me {
  user: { id: string; username: string; name: string; avatar?: string }
  isRoot: boolean
  permissions: Section[]
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [live, setLive] = useState<LiveData>({ activeLastHour: 0, todayTotal: 0 })
  const [me, setMe] = useState<Me | null>(null)
  const [open, setOpen] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const [sysSettings, setSysSettings] = useState<{ maintenanceMode: boolean; attackMode: boolean } | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/admin/stream')
    esRef.current = es
    es.onmessage = (e) => {
      try { const d = JSON.parse(e.data) as LiveData; setLive(d) } catch { }
    }
    es.onerror = () => { es.close() }
    return () => es.close()
  }, [])

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setMe(d) })
      .catch(() => { })
  }, [])

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.settings) setSysSettings(d.settings) })
      .catch(() => { })
  }, [])

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  const toggleSetting = async (key: 'maintenanceMode' | 'attackMode') => {
    if (!sysSettings || toggling) return
    const newValue = !sysSettings[key]
    setToggling(key)
    // Optimista
    setSysSettings(prev => prev ? { ...prev, [key]: newValue } : prev)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      })
    } catch {
      // Revertir si falla
      setSysSettings(prev => prev ? { ...prev, [key]: !newValue } : prev)
    }
    setToggling(null)
  }

  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  // Until /me resolves, show everything (avoids a flash of empty nav); after,
  // filter by granted permissions. Root sees all + the Users panel.
  const visibleNav = me ? NAV.filter(n => me.isRoot || me.permissions.includes(n.section)) : NAV
  const initials = (me?.user.name || me?.user.username || 'reokiy').slice(0, 2).toUpperCase()

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
      <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        {visibleNav.map(({ href, label, icon }) => (
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

        {/* Users — root only */}
        {me?.isRoot && (
          <a
            href="/admin/users"
            onClick={e => { e.preventDefault(); setOpen(false); router.push('/admin/users') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, marginBottom: 2, marginTop: 8,
              fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none',
              transition: 'all 0.15s',
              background: isActive('/admin/users') ? 'rgba(255,215,0,0.1)' : 'transparent',
              color: isActive('/admin/users') ? 'var(--text)' : 'var(--text-muted)',
              border: isActive('/admin/users') ? '1px solid rgba(255,215,0,0.25)' : '1px solid transparent',
            }}
          >
            <span style={{ fontSize: 13, width: 18, textAlign: 'center', color: isActive('/admin/users') ? '#ffd700' : 'inherit' }}>👤</span>
            Users
          </a>
        )}
      </nav>

      {/* ─── Quick toggles de sistema ─── */}
      {me?.isRoot && sysSettings && (
        <>
          <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
          <div style={{ padding: '4px 8px 2px', fontSize: 8, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
            SISTEMA
          </div>
          {[
            {
              key: 'maintenanceMode' as const,
              label: 'Mantenimiento',
              icon: '🔧',
              onColor: '#fbbf24',
              onBorder: 'rgba(251,191,36,0.3)',
              onBg: 'rgba(251,191,36,0.1)',
            },
            {
              key: 'attackMode' as const,
              label: 'Modo ataque',
              icon: '🛡',
              onColor: '#f87171',
              onBorder: 'rgba(248,113,113,0.4)',
              onBg: 'rgba(248,113,113,0.1)',
            },
          ].map(({ key, label, icon, onColor, onBorder, onBg }) => {
            const on = sysSettings[key]
            return (
              <div
                key={key}
                onClick={() => toggleSetting(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  margin: '0 8px 4px', padding: '8px 10px', borderRadius: 7,
                  cursor: toggling === key ? 'wait' : 'pointer',
                  border: `1px solid ${on ? onBorder : 'rgba(255,255,255,0.07)'}`,
                  background: on ? onBg : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 12, width: 16, textAlign: 'center' }}>{icon}</span>
                <span style={{
                  flex: 1, fontFamily: 'var(--font-body)', fontSize: 9,
                  letterSpacing: '0.07em', color: on ? 'var(--text)' : 'var(--text-muted)',
                }}>
                  {label}
                </span>
                {/* Pill toggle */}
                <div style={{
                  width: 26, height: 14, borderRadius: 7, position: 'relative',
                  background: on ? onColor : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.2s',
                  opacity: toggling === key ? 0.5 : 1,
                }}>
                  <div style={{
                    position: 'absolute', top: 2, width: 10, height: 10, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    left: on ? 14 : 2,
                  }} />
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Current user - ahora enlace a /admin/account */}
      {me && (
        <Link
          href="/admin/account"
          style={{ textDecoration: 'none', display: 'block' }}
          onClick={() => setOpen(false)}
        >
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            {me.user.avatar
              ? <img src={me.user.avatar} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(196,20,40,0.3)' }} />
              : <div style={{ width: 30, height: 30, borderRadius: '50%', background: me.isRoot ? 'linear-gradient(135deg,#c41428,#e8195c)' : 'rgba(196,20,40,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 10, color: '#fff' }}>{initials}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                {me.user.name}
                {me.isRoot && <span style={{ fontSize: 8 }}>👑</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'rgba(254,240,244,0.3)' }}>@{me.user.username}</div>
            </div>
          </div>
        </Link>
      )}

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