'use client'

import { useEffect, useState, useRef } from 'react'

export interface LanyardData {
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

const DISCORD_USER_ID = '1023628644213587998'
const CACHE_KEY = 'discord_avatar_cache'

export function useDiscord() {
  const [data, setData] = useState<LanyardData | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const connect = () => {
      if (cancelledRef.current) return
      try {
        const ws = new WebSocket('wss://api.lanyard.rest/socket')
        wsRef.current = ws

        ws.onopen = () => {
          ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }))
        }

        ws.onmessage = (event) => {
          if (cancelledRef.current) return
          try {
            const msg = JSON.parse(event.data as string)
            if (msg.op === 1) {
              const interval: number = msg.d.heartbeat_interval
              if (heartbeatRef.current) clearInterval(heartbeatRef.current)
              heartbeatRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }))
              }, interval)
            }
            if (msg.op === 0) {
              setData(msg.d as LanyardData)
              setLoading(false)
              setError(false)
            }
          } catch {}
        }

        ws.onerror = () => {
          if (!cancelledRef.current) { setError(true); setLoading(false) }
        }

        ws.onclose = () => {
          if (heartbeatRef.current) clearInterval(heartbeatRef.current)
          if (!cancelledRef.current) reconnectRef.current = setTimeout(connect, 5000)
        }
      } catch {
        if (!cancelledRef.current) { setError(true); setLoading(false) }
      }
    }

    connect()
    return () => {
      cancelledRef.current = true
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    }
  }, [])

  const avatarUrl = data?.discord_user?.avatar
    ? `https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.${
        data.discord_user.avatar.startsWith('a_') ? 'gif' : 'png'
      }?size=256`
    : null

  useEffect(() => {
    if (avatarUrl) { try { localStorage.setItem(CACHE_KEY, avatarUrl) } catch {} }
  }, [avatarUrl])

  const cachedAvatarUrl =
    avatarUrl ??
    (typeof window !== 'undefined'
      ? (() => { try { return localStorage.getItem(CACHE_KEY) } catch { return null } })()
      : null)

  return { data, error, loading, avatarUrl: cachedAvatarUrl }
}