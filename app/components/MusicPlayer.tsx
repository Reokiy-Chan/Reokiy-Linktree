'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const EQ_BARS = [1, 2, 3]

export default function MusicPlayer() {
  const [songs, setSongs] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [visible, setVisible] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const [hint, setHint] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedIndexRef = useRef<number>(-1)

  // Fetch and pick random starting song
  useEffect(() => {
    fetch('/api/songs')
      .then(r => r.json())
      .then((data: { songs: string[] }) => {
        if (data.songs?.length) {
          const idx = Math.floor(Math.random() * data.songs.length)
          setSongs(data.songs)
          setCurrentIndex(idx)
          setVisible(true)
          // Set CSS var so pages pad their bottom
          document.documentElement.style.setProperty('--player-height', '64px')
        }
      })
      .catch(() => {})

    return () => {
      document.documentElement.style.removeProperty('--player-height')
    }
  }, [])

  // Create audio element once
  useEffect(() => {
    if (!songs.length) return
    const audio = new Audio()
    audio.volume = volume
    audio.preload = 'metadata'
    audioRef.current = audio

    audio.addEventListener('ended', () => {
      setCurrentIndex(i => (i + 1) % songs.length)
    })
    audio.addEventListener('play', () => setIsPlaying(true))
    audio.addEventListener('pause', () => setIsPlaying(false))

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs.length])

  // Load song when index changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !songs.length || loadedIndexRef.current === currentIndex) return
    loadedIndexRef.current = currentIndex
    const wasPlaying = !audio.paused
    audio.src = `/audio/songs/${encodeURIComponent(songs[currentIndex])}`
    audio.load()
    if (wasPlaying) audio.play().catch(() => {})
  }, [currentIndex, songs])

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setInteracted(true)
    setHint(false)
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }, [])

  const prev = useCallback(() => {
    setInteracted(true)
    setHint(false)
    setCurrentIndex(i => (i - 1 + songs.length) % songs.length)
    setTimeout(() => audioRef.current?.play().catch(() => {}), 50)
  }, [songs.length])

  const next = useCallback(() => {
    setInteracted(true)
    setHint(false)
    setCurrentIndex(i => (i + 1) % songs.length)
    setTimeout(() => audioRef.current?.play().catch(() => {}), 50)
  }, [songs.length])

  if (!visible) return null

  const songName = songs[currentIndex]?.replace(/\.[^.]+$/, '') ?? '…'

  return (
    <>
      <style>{`
        @keyframes eq-bounce {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .eq-bar { transform-origin: bottom; display: inline-block; width: 3px; border-radius: 2px; background: var(--primary); }
        .eq-bar.playing { animation: eq-bounce var(--dur) ease-in-out infinite; }
        .player-vol::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--primary); cursor: pointer; }
        .player-vol::-webkit-slider-runnable-track { height: 3px; border-radius: 2px; background: rgba(196,20,40,0.25); }
        .player-vol { -webkit-appearance: none; appearance: none; background: transparent; width: 80px; cursor: pointer; }
      `}</style>

      {/* Tap to play hint */}
      {hint && (
        <button
          onClick={togglePlay}
          style={{
            position: 'fixed', bottom: 72, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1001,
            background: 'rgba(196,20,40,0.92)',
            border: 'none', borderRadius: 20,
            padding: '7px 18px',
            fontFamily: 'var(--font-body)', fontSize: 10,
            color: '#fff', cursor: 'pointer',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            boxShadow: '0 4px 20px rgba(196,20,40,0.45)',
            animation: 'fadeInUp 0.5s ease',
            whiteSpace: 'nowrap',
          }}
        >
          ♪ tap to play music
        </button>
      )}

      {/* Player bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        height: 64,
        background: 'rgba(5,0,7,0.94)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(196,20,40,0.28)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 14,
      }}>

        {/* EQ animation + song info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18, flexShrink: 0 }}>
            {EQ_BARS.map((_, i) => (
              <span
                key={i}
                className={`eq-bar${isPlaying ? ' playing' : ''}`}
                style={{
                  height: 18,
                  opacity: isPlaying ? 0.9 : 0.3,
                  '--dur': `${0.5 + i * 0.15}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 9,
              color: 'var(--text-muted)', letterSpacing: '0.12em',
              textTransform: 'uppercase', marginBottom: 2,
            }}>
              {isPlaying ? 'now playing' : 'paused'}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 13, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {songName}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <PlayerBtn onClick={prev} title="Previous">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
            </svg>
          </PlayerBtn>

          <button
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1px solid rgba(196,20,40,${isPlaying ? '0.7' : '0.4'})`,
              background: `rgba(196,20,40,${isPlaying ? '0.22' : '0.1'})`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary)', transition: 'all 0.2s ease', flexShrink: 0,
              boxShadow: isPlaying ? '0 0 18px rgba(196,20,40,0.35)' : 'none',
            }}
          >
            {isPlaying
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>

          <PlayerBtn onClick={next} title="Next">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </PlayerBtn>
        </div>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
            style={{ color: volume === 0 ? 'rgba(196,20,40,0.4)' : 'rgba(196,20,40,0.7)', flexShrink: 0 }}>
            {volume === 0
              ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            }
          </svg>
          <input
            className="player-vol"
            type="range" min="0" max="1" step="0.02"
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
          />
        </div>
      </div>
    </>
  )
}

function PlayerBtn({ onClick, title, children }: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(254,240,244,0.4)', padding: 4,
        display: 'flex', alignItems: 'center', transition: 'color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(254,240,244,0.9)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,240,244,0.4)')}
    >
      {children}
    </button>
  )
}