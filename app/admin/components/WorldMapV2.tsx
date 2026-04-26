'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

const SERVER_LAT = parseFloat(process.env.NEXT_PUBLIC_SERVER_LAT ?? '39.5')
const SERVER_LON = parseFloat(process.env.NEXT_PUBLIC_SERVER_LON ?? '-98.35')
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const COLORS = ['#c41428', '#e8195c', '#ff5580', '#ff8030', '#cc1040']

interface LiveVisit {
  lat: number; lon: number
  country: string; city: string; page: string; timestamp: string
}
interface Arc {
  x1: number; y1: number; x2: number; y2: number
  cx: number; cy: number
  t: number; speed: number; alpha: number; born: number
  color: string; label: string; page: string
}

interface Props {
  height?: number
  showControls?: boolean
  maxArcs?: number
  liveVisits?: LiveVisit[]
}

let geoCache: { d3geo: typeof import('d3-geo'); topo: typeof import('topojson-client'); world: any } | null = null

// ── Small button helper ────────────────────────────────────
function MapBtn({ onClick, title, active, children }: {
  onClick: () => void; title?: string; active?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        minWidth: 24, height: 24, borderRadius: 4,
        border: `1px solid ${active ? 'rgba(196,20,40,0.7)' : 'rgba(196,20,40,0.35)'}`,
        background: active ? 'rgba(196,20,40,0.22)' : 'rgba(5,0,7,0.8)',
        color: active ? '#fee0f4' : 'rgba(254,240,244,0.6)',
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        fontSize: 11, padding: '0 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1, transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >{children}</button>
  )
}

export default function WorldMapV2({ height = 280, showControls = false, maxArcs = 60, liveVisits }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const heatRef     = useRef<HTMLCanvasElement>(null)
  const arcsRef     = useRef<Arc[]>([])
  const heatPtsRef  = useRef<[number, number][]>([])
  const rafRef      = useRef(0)
  const pulseRef    = useRef(0)

  const [geoReady, setGeoReady] = useState(false)
  const [layers, setLayers]     = useState({ arcs: true, heat: true, markers: true })
  const [showLabels, setShowLabels] = useState(false)   // country/city name overlay
  const [tooltip, setTooltip]   = useState<{ x: number; y: number; label: string; page: string; time: string } | null>(null)

  // Zoom / pan – plain refs so no re-renders per frame
  const zoomRef      = useRef(1)
  const panRef       = useRef({ x: 0, y: 0 })
  const draggingRef  = useRef(false)
  const dragStartRef = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  // Visits buffered before geo is ready
  const pendingRef = useRef<LiveVisit[]>([])

  // ── Load geo libs ─────────────────────────────────────────
  useEffect(() => {
    if (geoCache) { setGeoReady(true); return }
    Promise.all([
      import('d3-geo'),
      import('topojson-client'),
      fetch(GEO_URL).then(r => r.json()),
    ]).then(([d3geo, topo, world]) => {
      geoCache = { d3geo, topo, world }
      setGeoReady(true)
    }).catch(console.error)
  }, [])

  // ── Projection (base, no zoom) ────────────────────────────
  const getProjection = useCallback((w: number, h: number) => {
    if (!geoCache) return null
    return geoCache.d3geo
      .geoNaturalEarth1()
      .scale(w / (2.05 * Math.PI))
      .translate([w / 2, h / 2 + h * 0.05])
  }, [])

  const project = useCallback((lat: number, lon: number, w: number, h: number): [number, number] | null => {
    const proj = getProjection(w, h)
    if (!proj) return null
    const r = proj([lon, lat])
    return r ? [r[0], r[1]] : null
  }, [getProjection])

  // ── Spawn arc ─────────────────────────────────────────────
  const spawnArc = useCallback((v: LiveVisit, w: number, h: number) => {
    const p1 = project(v.lat, v.lon, w, h)
    const p2 = project(SERVER_LAT, SERVER_LON, w, h)
    if (!p1 || !p2) return
    const [x1, y1] = p1, [x2, y2] = p2
    const dist = Math.hypot(x2 - x1, y2 - y1)
    arcsRef.current.push({
      x1, y1, x2, y2,
      cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 - dist * 0.38,
      t: 0, speed: 0.004 + Math.random() * 0.007,
      alpha: 1, born: Date.now(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      label: v.city || v.country,
      page: v.page,
    })
    if (arcsRef.current.length > maxArcs) arcsRef.current.shift()
    heatPtsRef.current.push([x1, y1])
    if (heatPtsRef.current.length > 300) heatPtsRef.current.shift()
  }, [project, maxArcs])

  // ── Flush buffered visits once geo is ready ───────────────
  useEffect(() => {
    if (!geoReady || !pendingRef.current.length) return
    const cv = canvasRef.current
    if (!cv) return
    const dpr = devicePixelRatio || 1
    const seen = new Set<string>()
    for (const v of pendingRef.current) {
      const key = `${v.lat},${v.lon},${v.timestamp}`
      if (!seen.has(key)) { seen.add(key); spawnArc(v, cv.width / dpr, cv.height / dpr) }
    }
    pendingRef.current = []
  }, [geoReady, spawnArc])

  // ── Heatmap canvas ────────────────────────────────────────
  const drawHeatmap = useCallback((w: number, h: number) => {
    const heat = heatRef.current
    if (!heat) return
    const ctx = heat.getContext('2d')!
    ctx.clearRect(0, 0, w, h)
    if (!heatPtsRef.current.length) return
    ctx.save()
    const zoom = zoomRef.current, pan = panRef.current
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)
    ctx.globalCompositeOperation = 'lighter'
    for (const [x, y] of heatPtsRef.current) {
      const r = 52 / zoom
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(196,20,40,0.28)')
      g.addColorStop(0.4, 'rgba(196,20,40,0.08)')
      g.addColorStop(1, 'rgba(196,20,40,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()
  }, [])

  // ── Render loop ───────────────────────────────────────────
  // showLabels is captured via ref to avoid re-creating draw every toggle
  const showLabelsRef = useRef(false)
  showLabelsRef.current = showLabels
  const layersRef = useRef(layers)
  layersRef.current = layers

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) { rafRef.current = requestAnimationFrame(draw); return }

    const dpr  = devicePixelRatio || 1
    const w    = canvas.width  / dpr
    const h    = canvas.height / dpr
    const ctx  = canvas.getContext('2d')!
    const zoom = zoomRef.current
    const pan  = panRef.current
    pulseRef.current += 0.04

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    // Fill background (cover viewport regardless of pan/zoom)
    ctx.fillStyle = '#050007'
    ctx.fillRect(0, 0, w, h)

    // Apply pan + zoom
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    if (geoReady && geoCache) {
      const { d3geo, topo, world } = geoCache
      const proj    = getProjection(w, h)!
      const pathGen = d3geo.geoPath(proj, ctx)

      // Graticule — thinner at high zoom
      const graticule = d3geo.geoGraticule()
      ctx.beginPath(); pathGen(graticule())
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 0.4 / zoom
      ctx.stroke()

      try {
        const land = topo.feature(world, world.objects.land)

        // Land
        ctx.beginPath(); pathGen(land as any)
        ctx.fillStyle = '#1a0820'; ctx.fill()

        // Coastlines
        ctx.beginPath(); pathGen(land as any)
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.5 / zoom; ctx.stroke()

        // Country borders
        const borders = topo.mesh(world, world.objects.countries as any, (a: any, b: any) => a !== b)
        ctx.beginPath(); pathGen(borders as any)
        ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 0.35 / zoom; ctx.stroke()

        // Country name labels — appear when zoom is high enough and toggle is on
        if (showLabelsRef.current && zoom >= 2 && geoCache) {
          const countries = (topo.feature(world, world.objects.countries) as any).features ?? []
          ctx.font = `${11 / zoom}px 'Space Mono', monospace`
          ctx.fillStyle = `rgba(254,240,244,${Math.min(1, (zoom - 1.5) * 0.6)})`
          ctx.textAlign = 'center'
          for (const feature of countries) {
            try {
              const centroid = d3geo.geoCentroid(feature)
              const pt = proj(centroid)
              if (pt) {
                const name = feature.properties?.name ?? ''
                if (name) ctx.fillText(name, pt[0], pt[1])
              }
            } catch {}
          }
          ctx.textAlign = 'left'
        }
      } catch {}
    }

    // Server dot (always same screen size → divide by zoom)
    const sp = project(SERVER_LAT, SERVER_LON, w, h)
    if (sp) {
      const [sx, sy] = sp
      const pulse = Math.sin(pulseRef.current) * 0.5 + 0.5
      ctx.beginPath(); ctx.arc(sx, sy, (5 + pulse * 10) / zoom, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(196,20,40,${0.04 + pulse * 0.09})`; ctx.fill()
      ctx.beginPath(); ctx.arc(sx, sy, 4.5 / zoom, 0, Math.PI * 2)
      ctx.fillStyle = '#c41428'; ctx.shadowColor = '#c41428'; ctx.shadowBlur = 14 / zoom
      ctx.fill(); ctx.shadowBlur = 0
      ctx.beginPath(); ctx.arc(sx, sy, 2 / zoom, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'; ctx.fill()
    }

    // ── Arcs ──────────────────────────────────────────────────
    const curLayers = layersRef.current
    if (curLayers.arcs) {
      arcsRef.current = arcsRef.current.filter(a => a.alpha > 0.02)
      const now = Date.now()

      for (const arc of arcsRef.current) {
        const age = (now - arc.born) / 1000
        if (arc.t < 1) arc.t = Math.min(1, arc.t + arc.speed)
        else arc.alpha *= 0.975

        // Arc line
        const steps = 60
        ctx.beginPath()
        for (let i = 0; i <= steps; i++) {
          const tt = (i / steps) * arc.t
          const x = (1-tt)**2 * arc.x1 + 2*(1-tt)*tt * arc.cx + tt**2 * arc.x2
          const y = (1-tt)**2 * arc.y1 + 2*(1-tt)*tt * arc.cy + tt**2 * arc.y2
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.strokeStyle = arc.color + Math.round(arc.alpha * 200).toString(16).padStart(2, '0')
        // Line gets thinner as you zoom in → more precise look
        ctx.lineWidth = 1.4 / zoom
        ctx.shadowColor = arc.color; ctx.shadowBlur = 7 / zoom
        ctx.stroke(); ctx.shadowBlur = 0

        // Travelling particle (always crisp on screen → /zoom)
        if (arc.t < 1) {
          const tt = arc.t
          const px = (1-tt)**2 * arc.x1 + 2*(1-tt)*tt * arc.cx + tt**2 * arc.x2
          const py = (1-tt)**2 * arc.y1 + 2*(1-tt)*tt * arc.cy + tt**2 * arc.y2
          ctx.beginPath(); ctx.arc(px, py, 2.5 / zoom, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'; ctx.shadowColor = arc.color; ctx.shadowBlur = 10 / zoom
          ctx.fill(); ctx.shadowBlur = 0
        }

        // Origin marker — SHRINKS with zoom (gets smaller as you zoom in)
        // Base radius / sqrt(zoom) gives a natural feel: visible but not dominant
        if (curLayers.markers && (age < 2 || arc.t < 1)) {
          const r = Math.max(0.8, 3.5 / zoom)   // shrinks with zoom, min 0.8 px
          ctx.beginPath(); ctx.arc(arc.x1, arc.y1, r, 0, Math.PI * 2)
          ctx.fillStyle = arc.color
          ctx.shadowColor = arc.color; ctx.shadowBlur = 6 / zoom
          ctx.fill(); ctx.shadowBlur = 0
        }

        // City label — always on when arc has landed + enough alpha
        // Also respect the showLabels toggle for extra persistence
        if (arc.t >= 1 && arc.alpha > 0.55 && arc.label) {
          const fontSize = Math.max(7, 10 / zoom)
          ctx.font = `${fontSize}px 'Space Mono', monospace`
          ctx.fillStyle = `rgba(255,255,255,${arc.alpha * 0.8})`
          ctx.fillText(arc.label, arc.x1 + 5 / zoom, arc.y1 - 5 / zoom)
        } else if (showLabelsRef.current && zoom >= 2 && arc.label) {
          // At high zoom with labels on — keep showing even after alpha fades
          const fontSize = Math.max(7, 10 / zoom)
          ctx.font = `${fontSize}px 'Space Mono', monospace`
          ctx.fillStyle = `rgba(255,255,255,${arc.alpha * 0.5})`
          ctx.fillText(arc.label, arc.x1 + 5 / zoom, arc.y1 - 5 / zoom)
        }
      }
    }

    ctx.restore()
    rafRef.current = requestAnimationFrame(draw)
  }, [geoReady, project, getProjection])

  // ── Polling ───────────────────────────────────────────────
  useEffect(() => {
    if (liveVisits) return
    let alive = true
    const seen = new Set<string>()
    const poll = async () => {
      if (!alive) return
      try {
        const r = await fetch('/api/admin/live')
        if (r.ok) {
          const { visits } = await r.json() as { visits: LiveVisit[] }
          const cv = canvasRef.current
          for (const v of visits) {
            const key = `${v.lat},${v.lon},${v.timestamp}`
            if (seen.has(key)) continue
            seen.add(key)
            if (!geoCache) { pendingRef.current.push(v) }
            else if (cv) { spawnArc(v, cv.width / (devicePixelRatio || 1), cv.height / (devicePixelRatio || 1)) }
          }
        }
      } catch {}
      setTimeout(poll, 8000)
    }
    poll()
    return () => { alive = false }
  }, [spawnArc, liveVisits])

  // ── External liveVisits prop ──────────────────────────────
  useEffect(() => {
    if (!liveVisits?.length) return
    const cv = canvasRef.current
    const seen = new Set<string>()
    for (const v of liveVisits) {
      const key = `${v.lat},${v.lon},${v.timestamp}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!geoCache) { pendingRef.current.push(v) }
      else if (cv) { spawnArc(v, cv.width / (devicePixelRatio || 1), cv.height / (devicePixelRatio || 1)) }
    }
  }, [liveVisits, spawnArc])

  // ── Heatmap refresh ───────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const cv = canvasRef.current
      if (!cv) return
      const dpr = devicePixelRatio || 1
      drawHeatmap(cv.width / dpr, cv.height / dpr)
    }, 8_000)
    return () => clearInterval(id)
  }, [drawHeatmap])

  // ── Canvas init + RAF ─────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current, heat = heatRef.current
    if (!canvas || !heat) return
    const dpr = devicePixelRatio || 1
    const resize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      heat.width = w; heat.height = h
      drawHeatmap(w, h)
    }
    resize()
    window.addEventListener('resize', resize)
    rafRef.current = requestAnimationFrame(draw)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current) }
  }, [draw, drawHeatmap])

  // ── Mouse / wheel handlers ────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    draggingRef.current = true
    dragStartRef.current = {
      mx: e.clientX - rect.left, my: e.clientY - rect.top,
      px: panRef.current.x, py: panRef.current.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rawX = e.clientX - rect.left, rawY = e.clientY - rect.top

    if (draggingRef.current) {
      panRef.current = {
        x: dragStartRef.current.px + (rawX - dragStartRef.current.mx),
        y: dragStartRef.current.py + (rawY - dragStartRef.current.my),
      }
      return
    }

    // Tooltip: convert screen coords → logical canvas coords
    const lx = (rawX - panRef.current.x) / zoomRef.current
    const ly = (rawY - panRef.current.y) / zoomRef.current
    let best: Arc | null = null, minD = 18
    for (const arc of arcsRef.current) {
      const d = Math.hypot(arc.x1 - lx, arc.y1 - ly)
      if (d < minD) { minD = d; best = arc }
    }
    if (best) {
      const time = new Date(best.born).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setTooltip({ x: rawX + 12, y: rawY - 42, label: best.label, page: best.page, time })
    } else setTooltip(null)
  }

  const handleMouseUp = () => { draggingRef.current = false }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const rawX = e.clientX - rect.left, rawY = e.clientY - rect.top

    // Pivot zoom on cursor position
    const baseX = (rawX - panRef.current.x) / zoomRef.current
    const baseY = (rawY - panRef.current.y) / zoomRef.current
    const factor = e.deltaY < 0 ? 1.18 : 0.85
    const newZoom = Math.min(12, Math.max(1, zoomRef.current * factor))
    panRef.current = { x: rawX - baseX * newZoom, y: rawY - baseY * newZoom }
    zoomRef.current = newZoom
  }

  const zoomIn    = () => {
    zoomRef.current = Math.min(12, zoomRef.current * 1.3)
  }
  const zoomOut   = () => {
    const newZ = Math.max(1, zoomRef.current * 0.77)
    zoomRef.current = newZ
    if (newZ === 1) panRef.current = { x: 0, y: 0 }
  }
  const resetView = () => { zoomRef.current = 1; panRef.current = { x: 0, y: 0 } }

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(196,20,40,0.22)', background: '#050007', marginBottom: 14 }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 3, fontFamily: 'var(--font-body)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)' }}>
        live requests
      </div>

      {/* Status row */}
      <div style={{ position: 'absolute', top: 10, right: 16, zIndex: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
        {!geoReady && <span style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'rgba(254,240,244,0.25)', letterSpacing: '0.1em' }}>loading map…</span>}
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c41428', boxShadow: '0 0 6px #c41428', animation: 'pulse-dot 2s ease-in-out infinite' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'rgba(254,240,244,0.35)', letterSpacing: '0.1em' }}>LIVE</span>
      </div>

      {/* Controls row — bottom */}
      <div style={{ position: 'absolute', bottom: 12, right: 14, zIndex: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <MapBtn onClick={zoomIn} title="Zoom in">+</MapBtn>
        <MapBtn onClick={zoomOut} title="Zoom out">−</MapBtn>
        <MapBtn onClick={resetView} title="Reset view">↺</MapBtn>
      </div>

      {/* Bottom-left: layer toggles + labels toggle */}
      <div style={{ position: 'absolute', bottom: 12, left: 14, zIndex: 3, display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 220 }}>
        {showControls && (['arcs', 'heat', 'markers'] as const).map(l => (
          <MapBtn key={l} active={layers[l]} onClick={() => setLayers(p => ({ ...p, [l]: !p[l] }))}>
            {l}
          </MapBtn>
        ))}
        <MapBtn active={showLabels} onClick={() => setShowLabels(v => !v)} title="Toggle country/city labels">
          labels
        </MapBtn>
      </div>

      {/* Canvas stack */}
      <div
        style={{ position: 'relative', width: '100%', height, userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { draggingRef.current = false; setTooltip(null) }}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', cursor: draggingRef.current ? 'grabbing' : 'grab' }}
        />
        {layers.heat && (
          <canvas
            ref={heatRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.65, mixBlendMode: 'screen', pointerEvents: 'none' }}
          />
        )}

        {tooltip && (
          <div style={{
            position: 'absolute', left: tooltip.x, top: tooltip.y,
            background: 'rgba(5,0,7,0.96)', border: '1px solid rgba(196,20,40,0.4)',
            borderRadius: 8, padding: '7px 12px', pointerEvents: 'none', zIndex: 10,
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text)', marginBottom: 2 }}>{tooltip.label}</div>
            <div style={{ fontSize: 9, color: 'var(--primary)' }}>{tooltip.page}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{tooltip.time}</div>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1;box-shadow:0 0 6px #c41428} 50%{opacity:0.3;box-shadow:0 0 3px #c41428} }`}</style>
    </div>
  )
}