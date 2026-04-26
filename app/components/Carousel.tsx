'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CarouselProps {
  autoPlay?: boolean
  interval?: number
}

export default function Carousel({ autoPlay = true, interval = 4000 }: CarouselProps) {
  const [images, setImages] = useState<string[]>([])
  const [current, setCurrent] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/carousel')
      .then(r => r.json())
      .then((data: { images: string[] }) => {
        if (data.images?.length) {
          setImages(data.images)
          setLoaded(true)
        }
      })
      .catch(() => {})
  }, [])

  const goTo = useCallback((idx: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrent(idx)
    setTimeout(() => setIsTransitioning(false), 400)
  }, [isTransitioning])

  const prev = useCallback(() => {
    goTo((current - 1 + images.length) % images.length)
  }, [current, images.length, goTo])

  const next = useCallback(() => {
    goTo((current + 1) % images.length)
  }, [current, images.length, goTo])

  // Auto-play
  useEffect(() => {
    if (!autoPlay || !loaded || images.length <= 1) return
    autoPlayRef.current = setInterval(next, interval)
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current) }
  }, [autoPlay, loaded, images.length, next, interval])

  // Touch support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev()
    touchStartX.current = null
  }

  if (!loaded || !images.length) return null

  return (
    <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
      <style>{`
        @keyframes carousel-fade { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: scale(1); } }
        .carousel-img { animation: carousel-fade 0.4s ease forwards; }
        .carousel-dot { transition: all 0.25s ease; cursor: pointer; border: none; padding: 0; background: none; }
        .carousel-arrow { transition: all 0.2s ease; }
        .carousel-arrow:hover { background: rgba(196,20,40,0.3) !important; border-color: rgba(196,20,40,0.6) !important; }
      `}</style>

      {/* Image area */}
      <div
        style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', cursor: 'grab', borderRadius: '20px 20px 0 0' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          key={current}
          className="carousel-img"
          src={`/images/carrousel/${encodeURIComponent(images[current])}`}
          alt={`Gallery image ${current + 1}`}
          loading="lazy"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            display: 'block',
          }}
        />

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(5,0,7,0.6) 0%, transparent 40%)',
          pointerEvents: 'none',
        }} />

        {/* Arrow buttons */}
        {images.length > 1 && (
          <>
            <button
              className="carousel-arrow"
              onClick={prev}
              aria-label="Previous"
              style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(5,0,7,0.55)', border: '1px solid rgba(196,20,40,0.3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(254,240,244,0.85)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <button
              className="carousel-arrow"
              onClick={next}
              aria-label="Next"
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(5,0,7,0.55)', border: '1px solid rgba(196,20,40,0.3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(254,240,244,0.85)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
          </>
        )}

        {/* Counter badge */}
        <div style={{
          position: 'absolute', bottom: 12, right: 14,
          fontFamily: 'var(--font-body)', fontSize: 9,
          color: 'rgba(254,240,244,0.6)',
          letterSpacing: '0.1em',
        }}>
          {current + 1} / {images.length}
        </div>
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 6, padding: '12px 20px',
        }}>
          {images.map((_, i) => (
            <button
              key={i}
              className="carousel-dot"
              onClick={() => goTo(i)}
              aria-label={`Go to image ${i + 1}`}
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === current ? 'var(--primary)' : 'rgba(196,20,40,0.25)',
                boxShadow: i === current ? '0 0 8px rgba(196,20,40,0.4)' : 'none',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}