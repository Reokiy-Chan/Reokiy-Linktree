import type { Metadata } from 'next'
import { headers } from 'next/headers'
import AdminSidebar from './components/AdminSidebar'

export const metadata: Metadata = {
  title: { default: 'admin • reokiy', template: '%s • admin' },
  robots: { index: false, follow: false },
}

// Auth protection is fully handled by middleware.tsx — no redirect here.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''
  const isLogin = pathname.startsWith('/admin/login')

  // Login page gets no chrome
  if (isLogin) return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1, background: '#050007' }}>
      <AdminSidebar />
      <main style={{ flex: 1, minWidth: 0, padding: '24px', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}
