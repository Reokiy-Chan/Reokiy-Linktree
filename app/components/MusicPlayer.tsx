'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

function parseTrack(filename: string): { song: string; artist: string } {
  const base = filename.replace(/\.[^.]+$/, '')
  const parts = base.split('▸').map(s => s.trim())
  if (parts.length >= 3) return { song: parts[1], artist: parts[2] }
  if (parts.length === 2) return { song: parts[1], artist: parts[0] }
  return { song: base, artist: '' }
}

function VinylDisc({ spinning, size = 52 }: { spinning: boolean; size?: number }) {
  const r = size / 2
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      animation: spinning ? 'vinyl-spin 3s linear infinite' : 'none',
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={r} cy={r} r={r} fill="#0d0009" />
        {[0.82, 0.68, 0.54, 0.42].map((ratio, i) => (
          <circle key={i} cx={r} cy={r} r={r * ratio}
            fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth={1} />
        ))}
        <circle cx={r} cy={r} r={r * 0.33} fill="var(--primary)" opacity={0.9} />
        <circle cx={r} cy={r} r={r * 0.33} fill="url(#vg)" />
        <circle cx={r} cy={r} r={r * 0.065} fill="#0d0009" />
        <ellipse cx={r * 0.7} cy={r * 0.5} rx={r * 0.17} ry={r * 0.07}
          fill="rgba(255,255,255,0.13)" transform={`rotate(-35 ${r} ${r})`} />
        <defs>
          <radialGradient id="vg" cx="38%" cy="38%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

function NowPlayingToast({ song, artist, playing, visible, leaving }: {
  song: string; artist: string; playing: boolean; visible: boolean; leaving: boolean
}) {
  if (!visible && !leaving) return null
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 2000, pointerEvents: 'none',
      animation: leaving
        ? 'toast-out 0.45s ease forwards'
        : 'toast-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '11px 18px 11px 12px',
        background: 'rgba(255,255,255,0.09)',
        backdropFilter: 'blur(48px) saturate(180%)',
        WebkitBackdropFilter: 'blur(48px) saturate(180%)',
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.08), 0 12px 40px rgba(0,0,0,0.38)',
        minWidth: 230, maxWidth: 300,
      }}>
        <VinylDisc spinning={playing} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 8,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'rgba(var(--primary-rgb),0.75)', marginBottom: 3,
          }}>
            ahora suena
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 13, color: 'rgba(255,255,255,0.9)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {song}
          </div>
          {artist && (
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 9,
              color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {artist}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Vertical volume bar */
function VolBar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const height = 72
  const filled = value * height

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = 1 - (e.clientY - rect.top) / rect.height
    onChange(Math.max(0, Math.min(1, ratio)))
  }

  return (
    <div
      onClick={handleClick}
      title={`Volumen ${Math.round(value * 100)}%`}
      style={{
        width: 4, height, borderRadius: 4,
        background: 'rgba(255,255,255,0.12)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: filled, borderRadius: 4,
        background: 'rgba(255,255,255,0.65)',
        transition: 'height 0.1s ease',
      }} />
    </div>
  )
}

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
      setTimeout(() => { setShowToast(false); setToastLeaving(false) }, 450)
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

  if (!ready) return null

  const track = parseTrack(songs[currentIndex] ?? '')

  const btnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
    color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center',
    borderRadius: 50, transition: 'background 0.15s, color 0.15s',
  }

  return (
    <>
      <style>{`
        @keyframes vinyl-spin { to { transform: rotate(360deg); } }
        @keyframes toast-in {
          from { opacity:0; transform:translateX(-50%) translateY(-14px) scale(0.96); }
          to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes toast-out {
          from { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
          to   { opacity:0; transform:translateX(-50%) translateY(-14px) scale(0.96); }
        }
        .mpc-btn:hover { background: rgba(255,255,255,0.12) !important; color: #fff !important; }
      `}</style>

      <NowPlayingToast
        song={track.song}
        artist={track.artist}
        playing={isPlaying}
        visible={showToast}
        leaving={toastLeaving}
      />

      {/* Controls — bottom center */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(48px) saturate(200%) brightness(1.08)',
        WebkitBackdropFilter: 'blur(48px) saturate(200%) brightness(1.08)',
        borderRadius: 50,
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: [
          'inset 0 1.5px 0 rgba(255,255,255,0.24)',
          'inset 0 -1px 0 rgba(0,0,0,0.1)',
          '0 16px 48px rgba(0,0,0,0.4)',
          '0 2px 8px rgba(0,0,0,0.2)',
        ].join(', '),
      }}>
        {/* Prev */}
        <button className="mpc-btn" onClick={prev} title="Anterior" style={btnStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          className="mpc-btn"
          onClick={togglePlay}
          title={isPlaying ? 'Pausar' : 'Reproducir'}
          style={{
            ...btnStyle,
            width: 40, height: 40, padding: 0,
            background: 'rgba(255,255,255,0.14)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
            color: '#fff',
          }}
        >
          {isPlaying
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          }
        </button>

        {/* Next */}
        <button className="mpc-btn" onClick={next} title="Siguiente" style={btnStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.14)', margin: '0 6px', flexShrink: 0 }} />

        {/* Vertical volume bar */}
        <VolBar value={volume} onChange={setVolume} />
      </div>
    </>
  )
}
