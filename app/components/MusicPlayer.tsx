'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Parse filename → { song, artist } ──────────────────── */
function parseTrack(filename: string): { song: string; artist: string } {
  const base = filename.replace(/\.[^.]+$/, '')
  const parts = base.split('▸').map(s => s.trim())
  if (parts.length >= 3) return { song: parts[1], artist: parts[2] }
  if (parts.length === 2) return { song: parts[1], artist: parts[0] }
  return { song: base, artist: '' }
}

/* ── Vinyl disc ──────────────────────────────────────────── */
function VinylDisc({ spinning, size = 64 }: { spinning: boolean; size?: number }) {
  const r = size / 2
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      animation: spinning ? 'vinyl-spin 3s linear infinite' : 'none',
      willChange: 'transform',
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer disc */}
        <circle cx={r} cy={r} r={r} fill="#0d0009" />
        {/* Grooves */}
        {[0.82, 0.7, 0.58, 0.46].map((ratio, i) => (
          <circle key={i} cx={r} cy={r} r={r * ratio}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {/* Label */}
        <circle cx={r} cy={r} r={r * 0.34} fill="var(--primary)" opacity={0.85} />
        <circle cx={r} cy={r} r={r * 0.34} fill="url(#label-grad)" />
        {/* Center hole */}
        <circle cx={r} cy={r} r={r * 0.06} fill="#0d0009" />
        {/* Shimmer highlight */}
        <ellipse cx={r * 0.72} cy={r * 0.52} rx={r * 0.18} ry={r * 0.08}
          fill="rgba(255,255,255,0.12)" transform={`rotate(-35 ${r} ${r})`} />
        <defs>
          <radialGradient id="label-grad" cx="40%" cy="40%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

/* ── EQ bars ─────────────────────────────────────────────── */
function EQBars({ active }: { active: boolean }) {
  const bars = [0.4, 0.75, 1, 0.6, 0.85]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
      {bars.map((maxH, i) => (
        <div
          key={i}
          style={{
            width: 3, borderRadius: 2,
            background: 'var(--primary)',
            height: active ? `${maxH * 18}px` : '3px',
            opacity: active ? 0.85 : 0.3,
            transition: active ? 'none' : 'height 0.3s ease, opacity 0.3s ease',
            animation: active ? `eq-bar-${i} ${0.5 + i * 0.13}s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  )
}

/* ── Now-playing toast ───────────────────────────────────── */
function NowPlayingToast({ song, artist, visible, leaving }: {
  song: string; artist: string; visible: boolean; leaving: boolean
}) {
  if (!visible && !leaving) return null
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      animation: leaving ? 'toast-out 0.5s ease forwards' : 'toast-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 18px 12px 14px',
        background: 'rgba(5,0,7,0.72)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(var(--primary-rgb),0.3)',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(var(--primary-rgb),0.08)',
        minWidth: 240, maxWidth: 320,
      }}>
        <VinylDisc spinning size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 8,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'rgba(var(--primary-rgb),0.8)', marginBottom: 4,
          }}>
            ahora suena
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 14, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {song}
          </div>
          {artist && (
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 9,
              color: 'var(--text-muted)', letterSpacing: '0.06em',
              marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {artist}
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <EQBars active />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────── */
export default function MusicPlayer() {
  const [songs, setSongs] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [showToast, setShowToast] = useState(false)
  const [toastLeaving, setToastLeaving] = useState(false)
  const [ready, setReady] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedIndexRef = useRef(-1)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Fetch song list */
  useEffect(() => {
    fetch('/api/songs')
      .then(r => r.json())
      .then((data: { songs: string[] }) => {
        if (data.songs?.length) {
          const idx = Math.floor(Math.random() * data.songs.length)
          setSongs(data.songs)
          setCurrentIndex(idx)
          setReady(true)
        }
      })
      .catch(() => {})
  }, [])

  /* Create audio element */
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

  /* Load song on index change */
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !songs.length || loadedIndexRef.current === currentIndex) return
    loadedIndexRef.current = currentIndex
    const wasPlaying = !audio.paused
    audio.src = `/audio/songs/${encodeURIComponent(songs[currentIndex])}`
    audio.load()
    if (wasPlaying) audio.play().catch(() => {})
    triggerToast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, songs])

  /* Sync volume */
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  /* Show toast for 4s then slide out */
  const triggerToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastLeaving(false)
    setShowToast(true)
    toastTimerRef.current = setTimeout(() => {
      setToastLeaving(true)
      setTimeout(() => { setShowToast(false); setToastLeaving(false) }, 500)
    }, 4000)
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(() => {})
      triggerToast()
    } else {
      audio.pause()
    }
  }, [triggerToast])

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

  return (
    <>
      <style>{`
        @keyframes vinyl-spin { to { transform: rotate(360deg); } }
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
        @keyframes eq-bar-0 { from { height: 4px; } to { height: 14px; } }
        @keyframes eq-bar-1 { from { height: 7px; } to { height: 18px; } }
        @keyframes eq-bar-2 { from { height: 10px; } to { height: 18px; } }
        @keyframes eq-bar-3 { from { height: 5px; } to { height: 13px; } }
        @keyframes eq-bar-4 { from { height: 8px; } to { height: 16px; } }
        .vol-slider { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
        .vol-slider::-webkit-slider-runnable-track {
          height: 3px; border-radius: 2px;
          background: rgba(var(--primary-rgb),0.25);
        }
        .vol-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 10px; height: 10px;
          border-radius: 50%; background: var(--primary);
          margin-top: -3.5px; cursor: pointer;
        }
        .ctrl-btn { background: none; border: none; cursor: pointer; padding: 0;
          color: rgba(254,240,244,0.45); display:flex; align-items:center; justify-content:center;
          transition: color 0.2s, transform 0.15s; }
        .ctrl-btn:hover { color: rgba(254,240,244,0.95); transform: scale(1.15); }
      `}</style>

      {/* Now-playing toast */}
      <NowPlayingToast
        song={track.song}
        artist={track.artist}
        visible={showToast}
        leaving={toastLeaving}
      />

      {/* Corner controls — bottom-right */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
        background: 'rgba(5,0,7,0.68)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(var(--primary-rgb),0.28)',
        borderRadius: 18,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(var(--primary-rgb),0.06)',
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
        minWidth: 148,
      }}>

        {/* Mini disc + track info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <VinylDisc spinning={isPlaying} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 11, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {track.song}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 8,
              color: 'var(--text-muted)', letterSpacing: '0.06em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginTop: 1,
            }}>
              {track.artist || 'lofi'}
            </div>
          </div>
        </div>

        {/* EQ + controls row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <EQBars active={isPlaying} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="ctrl-btn" onClick={prev} title="Anterior">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
              </svg>
            </button>
            <button
              className="ctrl-btn"
              onClick={togglePlay}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                border: `1px solid rgba(var(--primary-rgb),${isPlaying ? '0.6' : '0.35'})`,
                background: `rgba(var(--primary-rgb),${isPlaying ? '0.18' : '0.08'})`,
                color: 'var(--primary)',
                boxShadow: isPlaying ? '0 0 14px rgba(var(--primary-rgb),0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isPlaying
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>
            <button className="ctrl-btn" onClick={next} title="Siguiente">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Volume row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"
            style={{ color: volume === 0 ? 'rgba(var(--primary-rgb),0.3)' : 'rgba(var(--primary-rgb),0.65)', flexShrink: 0 }}>
            {volume === 0
              ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            }
          </svg>
          <input
            className="vol-slider"
            type="range" min="0" max="1" step="0.02"
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>
      </div>
    </>
  )
}
