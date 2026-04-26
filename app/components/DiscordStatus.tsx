'use client'

import { useDiscord } from '../hooks/useDiscord'

const statusColors: Record<string, string> = {
  online: '#3ba55d',
  idle:   '#faa81a',
  dnd:    '#ed4245',
  offline:'#747f8d',
}

const statusLabels: Record<string, string> = {
  online:  'online',
  idle:    'idle',
  dnd:     'do not disturb',
  offline: 'offline',
}

export default function DiscordStatus() {
  const { data, error, loading } = useDiscord()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', background: 'rgba(255,255,255,0.04)',
        borderRadius: 999, border: '1px solid var(--glass-border)',
        fontSize: 11, color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)', letterSpacing: '0.05em',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)', display: 'inline-block',
        }} />
        loading…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', background: 'rgba(255,255,255,0.04)',
        borderRadius: 999, border: '1px solid var(--glass-border)',
        fontSize: 11, color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)', letterSpacing: '0.05em',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#747f8d', display: 'inline-block', flexShrink: 0,
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
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
      borderRadius: 12, border: '1px solid var(--glass-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {data.discord_user.avatar && (
          <img
            src={`https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=32`}
            alt="avatar"
            style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${statusColors[status]}`, flexShrink: 0 }}
          />
        )}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
            @{data.discord_user.username}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: statusColors[status], display: 'inline-block',
              boxShadow: `0 0 6px ${statusColors[status]}`,
            }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>
              {statusLabels[status]}
            </span>
          </div>
        </div>
      </div>
      {activity && (
        <div style={{
          fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
          letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {activity}
        </div>
      )}
    </div>
  )
}