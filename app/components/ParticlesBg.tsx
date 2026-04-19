'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
}

export default function ParticlesBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = [
      'rgba(196,20,40,',
      'rgba(240,160,184,',
      'rgba(107,0,16,',
      'rgba(255,255,255,',
    ]

    const particles: Particle[] = []

    const spawn = () => {
      const color = colors[Math.floor(Math.random() * colors.length)]
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(Math.random() * 0.8 + 0.2),
        size: Math.random() * 2.5 + 0.5,
        opacity: 0,
        color,
        life: 0,
        maxLife: Math.random() * 300 + 150,
      })
    }

    let frame = 0
    let animId: number

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      if (frame % 4 === 0 && particles.length < 120) spawn()

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life++
        const progress = p.life / p.maxLife
        p.opacity = progress < 0.1
          ? progress * 10 * 0.7
          : progress > 0.8
          ? (1 - progress) * 5 * 0.7
          : 0.7

        if (p.life >= p.maxLife || p.y < -10) {
          particles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.opacity})`
        ctx.fill()
      }

      animId = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}