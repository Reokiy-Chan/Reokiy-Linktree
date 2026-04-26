'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
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
  const [bgReady, setBgReady] = useState(false)
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const idx = Math.floor(Math.random() * PALETTES.length)
    setBgIndex(idx)
    setMounted(true)

    // Precargar la imagen elegida antes de mostrarla
    // Evita el flash donde el fondo aparece a medias cargado
    const img = new Image()
    img.onload = () => setBgReady(true)
    img.onerror = () => setBgReady(true) // mostrar igual si falla
    img.src = PALETTES[idx].bg
  }, [])

  const palette = PALETTES[bgIndex]

  useEffect(() => {
    if (!mounted) return
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
      {/*
        El div de fondo SIEMPRE está en el DOM (sin gate de mounted).
        Antes: {mounted && <div>} → el div no existe en el HTML inicial,
        aparece 200-400ms tarde cuando el JS hidrata y el effect corre.

        Ahora: el div existe desde el SSR con opacity:0,
        y hace fade-in solo cuando la imagen terminó de cargar.
        suppressHydrationWarning porque bgIndex cambia entre SSR (0) y cliente (random).
      */}
      <div
        ref={bgRef}
        aria-hidden
        suppressHydrationWarning
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${palette.bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.18) saturate(1.5) blur(3px)',
          zIndex: 0,
          transform: 'scale(1.06)',
          opacity: bgReady ? 1 : 0,
          transition: 'opacity 0.6s ease',
          willChange: 'opacity',
        }}
      />
      {children}
    </ThemeContext.Provider>
  )
}