'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { PALETTES, ColorPalette } from '../lib/themes'

interface ThemeContextValue {
  palette: ColorPalette
  bgIndex: number
  mounted: boolean
}

export const ThemeContext = createContext<ThemeContextValue>({
  palette: PALETTES[0],
  bgIndex: 0,
  mounted: false,
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [bgIndex, setBgIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const idx = Math.floor(Math.random() * PALETTES.length)
    setBgIndex(idx)
    setMounted(true)
  }, [])

  const palette = PALETTES[bgIndex]

  useEffect(() => {
    if (!mounted) return
    // Preload bg image to avoid blank-on-reload
    const existing = document.querySelector('link[data-bg-preload]')
    if (existing) existing.remove()
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = palette.bg
    link.setAttribute('data-bg-preload', '1')
    document.head.appendChild(link)

    const r = document.documentElement
    r.style.setProperty('--primary', palette.primary)
    r.style.setProperty('--primary-dim', palette.primaryDim)
    r.style.setProperty('--primary-glow', palette.primaryGlow)
    r.style.setProperty('--pink', palette.pink)
    r.style.setProperty('--pink-dim', palette.pinkDim)
    r.style.setProperty('--burgundy', palette.burgundy)
    r.style.setProperty('--glass-border', `rgba(${palette.primaryRgb},0.22)`)
    r.style.setProperty('--glass-border-hover', `rgba(${palette.primaryRgb},0.5)`)
    r.style.setProperty('--primary-rgb', palette.primaryRgb)
    r.style.setProperty('--pink-rgb', palette.pinkRgb)
  }, [mounted, palette])

  return (
    <ThemeContext.Provider value={{ palette, bgIndex, mounted }}>
      {mounted && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: `url(${palette.bg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.18) saturate(1.5) blur(3px)',
            zIndex: 0,
            transform: 'scale(1.06)',
            transition: 'background-image 0.8s ease',
          }}
        />
      )}
      {children}
    </ThemeContext.Provider>
  )
}