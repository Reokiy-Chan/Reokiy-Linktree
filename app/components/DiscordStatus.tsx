'use client'

import { useEffect, useState } from 'react'

interface LanyardData {
  discord_status: 'online' | 'idle' | 'dnd' | 'offline'
  discord_user: {
    username: string
    discriminator: string
    avatar: string
    id: string
  }
  activities: Array<{
    name: string
    type: number
    details?: string
    state?: string
  }>
  listening_to_spotify: boolean
  spotify?: {
    song: string
    artist: string
    album_art_url: string
  }
}

const statusColors: Record<string, string> = {
  online: '#3ba55d',
  idle: '#faa81a',
  dnd: '#ed4245',
  offline: '#747f8d',
}

const statusLabels: Record<string, string> = {
  online: 'online',
  idle: 'idle',
  dnd: 'do not disturb',
  offline: 'offline',
}

// Replace with the creator's Discord user ID
const DISCORD_USER_ID = 'YOUR_DISCORD_ID_HERE'

export default function DiscordStatus() {
  const [data, setData] = useState<LanyardData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (DISCORD_USER_ID === 'YOUR_DISCORD_ID_HERE') {
      setError(true)
      return
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`)
        const json = await res.json()
        if (json.success) setData(json.data)
        else setError(true)
      } catch {
        setError(true)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (error || !data) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '999px',
        border: '1px solid rgba(232,25,92,0.15)',
        fontSize: '11px',
        color: 'rgba(245,232,255,0.5)',
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.05em',
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#747f8d',
          display: 'inline-block',
          flexShrink: 0,
        }} />
        discord
      </div>
    )
  }

  const status = data.discord_status
  const activity = data.listening_to_spotify
    ? `🎵 ${data.spotify?.song} — ${data.spotify?.artist}`
    : data.activities.find(a => a.type !== 4)?.name

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: '12px',
      border: '1px solid rgba(232,25,92,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {data.discord_user.avatar && (
          <img
            src={`https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=32`}
            alt="avatar"
            style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${statusColors[status]}` }}
          />
        )}
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
            @{data.discord_user.username}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: statusColors[status],
              display: 'inline-block',
              boxShadow: `0 0 6px ${statusColors[status]}`,
            }} />
            <span style={{ fontSize: '10px', color: 'rgba(245,232,255,0.5)', fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>
              {statusLabels[status]}
            </span>
          </div>
        </div>
      </div>
      {activity && (
        <div style={{
          fontSize: '10px',
          color: 'rgba(245,232,255,0.45)',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.03em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {activity}
        </div>
      )}
    </div>
  )
}
