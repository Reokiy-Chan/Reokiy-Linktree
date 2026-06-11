'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'   // ← añadido

type Permission = 'admin' | 'owner'

const NAV = [
  { href: '/admin', label: 'Overview', icon: '◈' },
  { href: '/admin/live', label: 'Live', icon: '◎' },
  { href: '/admin/traffic', label: 'Traffic', icon: '⊡' },
  { href: '/admin/sessions', label: 'Sessions', icon: '⊞' },
  { href: '/admin/codes', label: 'Codes', icon: '⊛' },
  { href: '/admin/raffles', label: 'Giveaways', icon: '🎲' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙' },
  { href: '/admin/users', label: 'Users', icon: '👤' },
  { href: '/admin/audit', label: 'Audit', icon: '📋' },
]

interface PendingMessage { text: string; from: string; at: string }
interface LiveData { activeLastHour: number; todayTotal: number }
interface Me {
  user: {
    id: string; username: string; name: string; avatar?: string
    pronouns?: string; bio?: string; bannerUrl?: string
    authMethod?: string; createdAt?: string
    pendingMessage?: PendingMessage
  }
  isRoot: boolean
  permissions: Permission[]
}

export default function AdminSidebar({ alertBanner = false }: { alertBanner?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [live, setLive] = useState<LiveData>({ activeLastHour: 0, todayTotal: 0 })
  const [me, setMe] = useState<Me | null>(null)
  const [open, setOpen] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const [sysSettings, setSysSettings] = useState<{ maintenanceMode: boolean; attackMode: boolean } | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [msgDismissed, setMsgDismissed] = useState(false)

  const dismissMessage = async () => {
    setMsgDismissed(true)
    await fetch('/api/admin/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dismissMessage: true }) })
  }

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

  // All users see all nav items; page-level auth handles access control.
  const visibleNav = NAV
  const initials = (me?.user.name || me?.user.username || 'reokiy').slice(0, 2).toUpperCase()

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--text)', lineHeight: 1 }}>
          reokiy
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(196,20,40,0.7)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4 }}>
          analytics
        </div>
      </div>

      {/* Pending message */}
      {me?.user.pendingMessage && !msgDismissed && (
        <div style={{ margin: '6px 8px', padding: '10px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.7)', marginBottom: 4 }}>
              message from @{me.user.pendingMessage.from}
            </div>
            <button type="button" onClick={dismissMessage} style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(254,240,244,0.8)', lineHeight: 1.5 }}>{me.user.pendingMessage.text}</div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        {visibleNav.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              fontFamily: 'var(--font-body)', fontSize: 12,
              letterSpacing: '0.08em', textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s, transform 0.15s',
              background: isActive(href) ? 'rgba(196,20,40,0.14)' : 'transparent',
              color: isActive(href) ? 'var(--text)' : 'var(--text-muted)',
              border: isActive(href) ? '1px solid rgba(196,20,40,0.3)' : '1px solid transparent',
            }}
          >
            <span style={{ fontSize: 14, width: 18, textAlign: 'center', color: isActive(href) ? 'var(--primary)' : 'inherit' }}>
              {icon}
            </span>
            {label}
          </Link>
        ))}

      </nav>

      {/* ─── Quick toggles de sistema ─── */}
      {me?.isRoot && sysSettings && (
        <>
          <div style={{ height: 1, background: 'var(--glass-border)', margin: '4px 0' }} />
          <div style={{ padding: '4px 8px 2px', fontSize: 12, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
            SYSTEM
          </div>
          {[
            {
              key: 'maintenanceMode' as const,
              label: 'Maintenance',
              icon: '🔧',
              onColor: '#fbbf24',
              onBorder: 'rgba(251,191,36,0.3)',
              onBg: 'rgba(251,191,36,0.1)',
            },
            {
              key: 'attackMode' as const,
              label: 'Attack mode',
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
                  transition: 'background 0.2s, color 0.2s, border-color 0.2s, opacity 0.2s, transform 0.2s',
                }}
              >
                <span style={{ fontSize: 12, width: 16, textAlign: 'center' }}>{icon}</span>
                <span style={{
                  flex: 1, fontFamily: 'var(--font-body)', fontSize: 12,
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
                    background: '#fff', transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
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
        <div style={{ position: 'relative' }}>
          {profileOpen && (
            <>
              {/* Overlay para cerrar */}
              <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setProfileOpen(false)} />

              {/* Popup */}
              <div style={{
                position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 8, zIndex: 51,
                background: '#0d0014', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, overflow: 'hidden', boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
                animation: 'fadeInUp 0.2s ease',
              }}>
                {/* Banner */}
                <div style={{
                  height: 64,
                  background: me.user.bannerUrl
                    ? `url(${me.user.bannerUrl}) center/cover`
                    : 'linear-gradient(135deg,#c41428,#5a0010)',
                }} />

                <div style={{ padding: '0 14px 14px', position: 'relative' }}>
                  {/* Avatar con dot online */}
                  <div style={{ position: 'relative', display: 'inline-block', marginTop: -22, marginBottom: 8 }}>
                    {me.user.avatar
                      ? <img src={me.user.avatar} style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #0d0014', objectFit: 'cover' }} />
                      : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#c41428,#e8195c)', border: '3px solid #0d0014', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 14, color: '#fff' }}>
                        {(me.user.name || me.user.username).slice(0, 2).toUpperCase()}
                      </div>}
                    <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: '2px solid #0d0014' }} />
                  </div>

                  {/* Nombre + pronombres */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)' }}>
                      {me.user.name}{me.isRoot && ' 👑'}
                    </span>
                    {me.user.pronouns && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(254,224,244,0.35)' }}>
                        {me.user.pronouns}
                      </span>
                    )}
                  </div>

                  {me.user.bio && (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(254,224,244,0.55)', lineHeight: 1.5, marginBottom: 10 }}>
                      {me.user.bio}
                    </div>
                  )}

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />

                  {/* Metadata */}
                  {[['username', `@${me.user.username}`], ['auth', me.user.authMethod ?? '—']].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: 'rgba(254,224,244,0.3)' }}>{label}</span>
                      <span style={{ color: 'rgba(254,224,244,0.65)' }}>{val}</span>
                    </div>
                  ))}

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link href="/admin/account" onClick={() => { setProfileOpen(false); setOpen(false) }}
                      style={{ flex: 1, textAlign: 'center', padding: '7px 0', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(254,224,244,0.55)', textDecoration: 'none' }}>
                      ⚙ edit profile
                    </Link>
                    <button type="button" onClick={logout}
                      style={{ padding: '7px 14px', background: 'rgba(196,20,40,0.12)', border: '0.5px solid rgba(196,20,40,0.3)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 11, color: '#f87171', cursor: 'pointer' }}>
                      log out
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Trigger — pie de sidebar */}
          <div onClick={() => setProfileOpen(o => !o)}
            style={{ padding: '10px 14px', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {me.user.avatar
                ? <img src={me.user.avatar} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(196,20,40,0.3)' }} />
                : <div style={{ width: 30, height: 30, borderRadius: '50%', background: me.isRoot ? 'linear-gradient(135deg,#c41428,#e8195c)' : 'rgba(196,20,40,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 12, color: '#fff' }}>
                  {(me.user.name || me.user.username).slice(0, 2).toUpperCase()}
                </div>}
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #050007' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {me.user.name}{me.isRoot && ' 👑'}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(254,224,244,0.3)' }}>@{me.user.username}</div>
            </div>
          </div>
        </div>
      )}

      {/* Live indicator */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)',
            boxShadow: '0 0 6px var(--primary)',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            {live.activeLastHour} active (1h)
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(254,240,244,0.25)', marginBottom: 12, letterSpacing: '0.08em' }}>
          {live.todayTotal} visits today
        </div>
      </div>

      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1;box-shadow:0 0 6px var(--primary)} 50%{opacity:0.4;box-shadow:0 0 3px var(--primary)} }`}</style>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{
          width: 200,
          background: 'rgba(5,0,7,0.95)',
          borderRight: '1px solid var(--glass-border)',
          display: 'flex', flexDirection: 'column',
          position: 'fixed',
          top: alertBanner ? 32 : 0,
          left: 0,
          bottom: 0,
          overflowY: 'auto',
          zIndex: 10,
        }} className="admin-sidebar-desktop">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="admin-mobile-bar" style={{
        display: 'none', position: 'fixed', top: alertBanner ? 32 : 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(5,0,7,0.97)', borderBottom: '1px solid var(--glass-border)',
        padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--text)' }}>reokiy</span>
        <button type="button" onClick={() => setOpen(o => !o)} style={{
          background: 'none', border: '1px solid var(--glass-border)', borderRadius: 6,
          padding: '5px 10px', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12,
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