'use client'

import { useEffect, useRef, useCallback } from 'react'

// Server location (Vercel US East / configurable)
const SERVER_LAT = parseFloat(process.env.NEXT_PUBLIC_SERVER_LAT ?? '39.5')
const SERVER_LON = parseFloat(process.env.NEXT_PUBLIC_SERVER_LON ?? '-98.35')

// Simplified country centroid dots for the world map texture
const DOTS: [number, number][] = [
  [37.09,-95.71],[55.38,-3.44],[46.23,2.21],[51.17,10.45],[40.46,-3.75],[41.87,12.57],
  [52.13,5.29],[56.26,9.5],[60.47,8.47],[61.92,25.75],[64.96,-19.02],[56.88,24.6],
  [56.88,24.6],[56.85,24.91],[55.17,23.88],[47.52,14.55],[46.82,8.23],[49.82,6.13],
  [49.82,15.47],[47.16,19.5],[45.1,15.2],[44.02,21.01],[42.73,25.49],[45.94,24.97],
  [41.15,20.17],[41.61,21.74],[42.5,1.56],[39.07,35.24],[31.05,34.85],[25.35,51.18],
  [24.47,54.37],[23.42,53.85],[26.82,30.8],[15.55,32.53],[12.36,16.9],[9.06,8.68],
  [7.37,-11.86],[12.36,16.9],[4.36,18.56],[-0.23,15.83],[-4.04,21.76],[-3.38,29.35],
  [-6.37,34.27],[-26.52,31.47],[-29.61,28.23],[-30.56,22.94],[-1.94,29.87],[-6.78,39.08],
  [-18.77,46.87],[-13.26,16.0],[17.87,79.0],[60.13,100.0],[64.56,76.67],[55.75,37.62],
  [47.0,104.99],[35.86,104.2],[36.77,127.98],[37.37,127.51],[43.96,87.6],[48.02,66.92],
  [33.85,67.71],[28.39,84.12],[20.59,78.96],[23.68,90.36],[7.87,80.77],[34.8,56.28],
  [29.38,47.58],[23.63,58.59],[15.55,48.52],[15.18,44.76],[25.05,45.68],[31.52,34.85],
  [35.13,38.8],[12.86,121.77],[1.35,103.82],[-0.79,113.92],[15.87,100.99],[16.86,96.0],
  [19.06,72.87],[-0.03,-78.18],[4.57,-74.3],[9.0,-66.2],[-14.24,-51.93],[-23.44,-58.44],
  [-35.68,-71.54],[-38.42,-63.62],[-9.19,-75.02],[18.97,-72.28],[21.52,-80.78],[23.44,-102.55],
  [-13.13,-74.22],[10.45,-84.15],[13.44,-15.31],[14.49,14.45],[-18.91,47.52],
]

function project(lat: number, lon: number, w: number, h: number): [number, number] {
  return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h]
}

interface LiveVisit { lat: number; lon: number; country: string; city: string; timestamp: string }

interface Arc {
  x1: number; y1: number; x2: number; y2: number
  cx: number; cy: number
  t: number; speed: number; alpha: number; born: number
  color: string; label: string
}

const COLORS = ['#c41428', '#e8195c', '#ff5fa0', '#ff8030', '#ff3070']

export default function WorldMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arcsRef = useRef<Arc[]>([])
  const rafRef = useRef<number>(0)
  const pulseRef = useRef(0)

  const spawnArc = useCallback((visit: LiveVisit, w: number, h: number) => {
    const [x1, y1] = project(visit.lat, visit.lon, w, h)
    const [x2, y2] = project(SERVER_LAT, SERVER_LON, w, h)
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const dist = Math.hypot(x2 - x1, y2 - y1)
    arcsRef.current.push({
      x1, y1, x2, y2,
      cx: mx, cy: my - dist * 0.35,
      t: 0, speed: 0.006 + Math.random() * 0.004,
      alpha: 1, born: Date.now(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      label: visit.city || visit.country,
    })
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height
    pulseRef.current += 0.04

    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = 'rgba(4,0,6,0.85)'
    ctx.fillRect(0, 0, w, h)

    // Graticule
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = project(0, lon, w, h)
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const [, y] = project(lat, 0, w, h)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    // Country dots
    for (const [lat, lon] of DOTS) {
      const [x, y] = project(lat, lon, w, h)
      ctx.beginPath()
      ctx.arc(x, y, 1.2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fill()
    }

    // Server dot pulsing
    const [sx, sy] = project(SERVER_LAT, SERVER_LON, w, h)
    const pulse = Math.sin(pulseRef.current) * 0.5 + 0.5
    ctx.beginPath()
    ctx.arc(sx, sy, 4 + pulse * 6, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(196,20,40,${0.06 + pulse * 0.1})`
    ctx.fill()
    ctx.beginPath()
    ctx.arc(sx, sy, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#c41428'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(sx, sy, 2, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()

    // Arcs
    const now = Date.now()
    arcsRef.current = arcsRef.current.filter(a => a.alpha > 0.02)
    for (const arc of arcsRef.current) {
      const age = (now - arc.born) / 1000
      if (arc.t < 1) arc.t = Math.min(1, arc.t + arc.speed)
      else arc.alpha *= 0.96

      // Draw trail (arc path up to t)
      const steps = 40
      ctx.beginPath()
      for (let i = 0; i <= steps; i++) {
        const tt = (i / steps) * arc.t
        const x = (1 - tt) ** 2 * arc.x1 + 2 * (1 - tt) * tt * arc.cx + tt ** 2 * arc.x2
        const y = (1 - tt) ** 2 * arc.y1 + 2 * (1 - tt) * tt * arc.cy + tt ** 2 * arc.y2
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = arc.color + Math.round(arc.alpha * 180).toString(16).padStart(2, '0')
      ctx.lineWidth = 1.2
      ctx.shadowColor = arc.color
      ctx.shadowBlur = 6
      ctx.stroke()
      ctx.shadowBlur = 0

      // Shooting particle at tip
      if (arc.t < 1) {
        const tt = arc.t
        const px = (1 - tt) ** 2 * arc.x1 + 2 * (1 - tt) * tt * arc.cx + tt ** 2 * arc.x2
        const py = (1 - tt) ** 2 * arc.y1 + 2 * (1 - tt) * tt * arc.cy + tt ** 2 * arc.y2
        ctx.beginPath()
        ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.shadowColor = arc.color
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Origin dot
      if (age < 0.5 || arc.t < 1) {
        ctx.beginPath()
        ctx.arc(arc.x1, arc.y1, 3, 0, Math.PI * 2)
        ctx.fillStyle = arc.color
        ctx.fill()
      }

      // Label when arc arrives
      if (arc.t >= 1 && arc.alpha > 0.5 && arc.label) {
        ctx.font = '9px Space Mono, monospace'
        ctx.fillStyle = `rgba(255,255,255,${arc.alpha * 0.7})`
        ctx.fillText(arc.label, arc.x1 + 5, arc.y1 - 5)
      }
    }

    rafRef.current = requestAnimationFrame(draw)
  }, [])

  // Poll for live visits
  useEffect(() => {
    let mounted = true
    const seen = new Set<string>()

    const poll = async () => {
      if (!mounted) return
      try {
        const r = await fetch('/api/admin/live')
        if (!r.ok) return
        const { visits } = await r.json() as { visits: LiveVisit[] }
        const canvas = canvasRef.current
        if (!canvas) return
        for (const v of visits) {
          const key = `${v.lat},${v.lon},${v.timestamp}`
          if (!seen.has(key)) {
            seen.add(key)
            spawnArc(v, canvas.width, canvas.height)
          }
        }
      } catch {}
      setTimeout(poll, 8000)
    }

    poll()
    return () => { mounted = false }
  }, [spawnArc])

  // Start render loop + resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
      const ctx = canvas.getContext('2d')!
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  return (
    <div style={{
      position: 'relative',
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid rgba(196,20,40,0.22)',
      background: 'rgba(4,0,6,0.85)',
      marginBottom: 14,
    }}>
      <div style={{
        position: 'absolute', top: 12, left: 16, zIndex: 2,
        fontFamily: 'Space Mono, monospace', fontSize: 9,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'rgba(196,20,40,0.75)',
      }}>
        peticiones en vivo
      </div>
      <div style={{
        position: 'absolute', top: 12, right: 16, zIndex: 2,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#c41428',
          boxShadow: '0 0 6px #c41428',
          animation: 'pulse-dot 2s ease-in-out infinite',
        }} />
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.1em' }}>
          LIVE
        </span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 260, display: 'block' }}
      />
      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}
