import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from './components/ThemeProvider'
import TypewriterTitle from './components/TypewriterTitle'

export const metadata: Metadata = {
  title: 'reokiy • links',
  description: 'VRChat content creator • your fav lewd elf',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
  openGraph: {
    title: 'reokiy • links',
    description: 'VRChat content creator • your fav lewd elf',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Space+Mono:wght@400&display=swap"
          as="style"
        />
        <link rel="icon" href="/images/logo.png" type="image/png" />
      </head>
      <body>
        <ThemeProvider>
          <TypewriterTitle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}