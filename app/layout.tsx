import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from './components/ThemeProvider'
import TypewriterTitle from './components/TypewriterTitle'
import MusicPlayer from './components/MusicPlayer'
import TrackingBeacon from './components/TrackingBeacon'

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
          <TrackingBeacon />
          {children}
          <MusicPlayer />
        </ThemeProvider>
      </body>
    </html>
  )
}