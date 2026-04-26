'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

function parseTrack(filename: string): { song: string; artist: string } {
  const base = filename.replace(/\.[^.]+$/, '')
  const parts = base.split('▸').map(s => s.trim())
  if (parts.length >= 3) return { song: parts[1], artist: parts[2] }
  if (parts.length === 2) return { song: parts[1], artist: parts[0] }
  return { song: base, artist: '' }
}

/* ── Now-playing toast (top) ─────────────────────────────── */
function NowPlayingToast({ song, artist, visible, leaving }: {
  song: string; artist: string; visible: boolean; leaving: boolean
}) {
  if (!visible && !leaving) return null
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%',
      zIndex: 2000, pointerEvents: 'none',
      animation: leaving
        ? 'tp-out 0.4s ease forwards'
        : 'tp-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px 10px 12px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(48px) saturate(180%)',
        WebkitBackdropFilter: 'blur(48px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.16)',
        borderRadius: 16,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.45)',
        minWidth: 200, maxWidth: 280,
      }}>
        {/* spinning disc */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'radial-gradient(circle at 38% 38%, rgba(var(--primary-rgb),0.7) 0%, #0d0009 60%)',
          border: '2px solid rgba(255,255,255,0.12)',
          animation: 'vinyl-spin 3s linear infinite',
          boxShadow: 'inset 0 0 0 8px rgba(0,0,0,0.25)',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>
            ahora suena
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {song}
          </div>
          {artist && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {artist}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────── */
export default function MusicPlayer() {
  const [songs, setSongs] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [showToast, setShowToast] = useState(false)
  const [toastLeaving, setToastLeaving] = useState(false)
  const [ready, setReady] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedRef = useRef(-1)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/songs')
      .then(r => r.json())
      .then((d: { songs: string[] }) => {
        if (d.songs?.length) {
          const idx = Math.floor(Math.random() * d.songs.length)
          setSongs(d.songs)
          setCurrentIndex(idx)
          setReady(true)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!songs.length) return
    const audio = new Audio()
    audio.volume = volume
    audio.preload = 'metadata'
    audioRef.current = audio
    audio.addEventListener('ended', () => setCurrentIndex(i => (i + 1) % songs.length))
    audio.addEventListener('play', () => setIsPlaying(true))
    audio.addEventListener('pause', () => setIsPlaying(false))
    return () => { audio.pause(); audio.src = ''; audioRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs.length])

  const fireToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastLeaving(false)
    setShowToast(true)
    toastTimer.current = setTimeout(() => {
      setToastLeaving(true)
      setTimeout(() => { setShowToast(false); setToastLeaving(false) }, 400)
    }, 4000)
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !songs.length || loadedRef.current === currentIndex) return
    loadedRef.current = currentIndex
    const wasPlaying = !audio.paused
    audio.src = `/audio/songs/${encodeURIComponent(songs[currentIndex])}`
    audio.load()
    if (wasPlaying) audio.play().catch(() => {})
    fireToast()
  }, [currentIndex, songs, fireToast])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const togglePlay = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) { a.play().catch(() => {}); fireToast() }
    else a.pause()
  }, [fireToast])

  const prev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + songs.length) % songs.length)
    setTimeout(() => audioRef.current?.play().catch(() => {}), 50)
  }, [songs.length])

  const next = useCallback(() => {
    setCurrentIndex(i => (i + 1) % songs.length)
    setTimeout(() => audioRef.current?.play().catch(() => {}), 50)
  }, [songs.length])

  const handleVolClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = 1 - (e.clientY - rect.top) / rect.height
    setVolume(Math.max(0, Math.min(1, ratio)))
  }, [])

  if (!ready) return null

  const track = parseTrack(songs[currentIndex] ?? '')

  return (
    <>
      <style>{`
        @keyframes vinyl-spin { to { transform: rotate(360deg); } }
        @keyframes tp-in {
          from { opacity:0; transform:translateX(-50%) translateY(-12px) scale(0.95); }
          to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes tp-out {
          from { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
          to   { opacity:0; transform:translateX(-50%) translateY(-10px) scale(0.97); }
        }
      `}</style>

      <NowPlayingToast
        song={track.song}
        artist={track.artist}
        visible={showToast}
        leaving={toastLeaving}
      />

      {/* Corner controls — bottom right */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 14,
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.18)',
          'inset 0 -1px 0 rgba(0,0,0,0.12)',
          '0 8px 32px rgba(0,0,0,0.5)',
        ].join(','),
      }}>
        {/* Prev */}
        <Btn onClick={prev} title="Anterior">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </Btn>

        {/* Play/Pause */}
        <Btn onClick={togglePlay} title={isPlaying ? 'Pausar' : 'Play'}>
          {isPlaying
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          }
        </Btn>

        {/* Next */}
        <Btn onClick={next} title="Siguiente">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </Btn>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)', margin: '0 5px' }} />

        {/* Vertical volume bar */}
        <div
          onClick={handleVolClick}
          title={`Volumen ${Math.round(volume * 100)}%`}
          style={{
            width: 4, height: 32, borderRadius: 4,
            background: 'rgba(255,255,255,0.1)',
            cursor: 'pointer', position: 'relative', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${volume * 100}%`,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.7)',
            transition: 'height 0.1s',
          }} />
        </div>
      </div>
    </>
  )
}

function Btn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 8, border: 'none',
        background: 'transparent', cursor: 'pointer',
        color: 'rgba(255,255,255,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
    >
      {children}
    </button>
  )
}
