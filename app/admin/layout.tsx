import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/app/lib/auth'
import AdminSidebar from './components/AdminSidebar'

export const metadata: Metadata = {
  title: {
    default: 'admin • reokiy',
    template: '%s • admin',
  },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Leer el pathname inyectado por middleware.ts
  // Sin esto, el layout no puede saber si está renderizando /admin/login
  // y redirige de vuelta ahí en bucle infinito
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  const isLogin =
    pathname.includes('/admin/login') ||
    !pathname // fallback crítico para producción

  if (isLogin) {
    return <>{children}</>
  }

  // Para todas las demás rutas /admin/*, verificar autenticación
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_session')?.value
  const secret = process.env.ADMIN_SECRET ?? 'reokiy_secret_change_me'

  if (!token || !verifyToken(token, secret)) {
    redirect('/admin/login')
  }

  return (
    // position+zIndex crea un stacking context sobre el ThemeProvider bg (z-index:0 fixed)
    // background opaco cubre la imagen de fondo del site principal
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      position: 'relative',
      zIndex: 1,
      background: '#050007',
    }}>
      <AdminSidebar />
      <main style={{
        flex: 1,
        minWidth: 0,
        padding: '24px',
        overflowX: 'hidden',
      }}>
        {children}
      </main>
    </div>
  )
}