import type { Metadata } from 'next'
import { headers } from 'next/headers'
import AdminSidebar from './components/AdminSidebar'
import { readSettings } from '@/app/lib/settings'

export const metadata: Metadata = {
  title: { default: 'admin • reokiy', template: '%s • admin' },
  robots: { index: false, follow: false },
}

// Auth protection is fully handled by middleware.tsx — no redirect here.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''
  const isLogin = pathname.startsWith('/admin/login')
  const settings = await readSettings()
  const alertMode = settings?.maintenanceMode ? 'maintenance' : settings?.attackMode ? 'attack' : null

  // Login page gets no chrome
  if (isLogin) return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1, background: '#050007' }}>
      {alertMode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 32,
          overflow: 'hidden',
          background: alertMode === 'maintenance' ? 'rgba(251,191,36,0.08)' : 'rgba(248,113,113,0.08)',
          borderBottom: `1px solid ${alertMode === 'maintenance' ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
          display: 'flex', alignItems: 'center',
        }}>
          <div className={`alert-marquee alert-${alertMode}`}>
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i}>
                {alertMode === 'maintenance'
                  ? '🔧 MAINTENANCE MODE ACTIVE'
                  : '🛡 ATTACK MODE ACTIVE — rate limiting public endpoints'}
                &nbsp;·&nbsp;
              </span>
            ))}
          </div>
        </div>
      )}
      <AdminSidebar alertBanner={!!alertMode} />
      <main className="admin-main" style={{ flex: 1, minWidth: 0, marginLeft: 200, padding: '24px', paddingTop: alertMode ? '56px' : '24px', overflowX: 'hidden' }}>
        {children}
      </main>
      <style>{`
        @media (max-width: 768px) {
          .admin-main { margin-left: 0 !important; padding: 64px 14px 40px !important; }
          .admin-sidebar-desktop { display: none !important; }
        }
      `}</style>
    </div>
  )
}
