import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'sweetie • links',
  description: 'VRChat content creator • your fav alter',
  openGraph: {
    title: 'sweetie • links',
    description: 'VRChat content creator • your fav alter',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </body>
    </html>
  )
}
