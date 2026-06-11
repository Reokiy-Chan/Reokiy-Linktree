'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string
        callback: (token: string) => void
        'error-callback'?: () => void
        'expired-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
        size?: 'normal' | 'compact'
      }) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

const SESSION_KEY = 'cf_ok'
const SITEKEY = process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY ?? ''

export default function CaptchaGate() {
  const pathname = usePathname()
  const [attackMode, setAttackMode] = useState(false)
  const [verified, setVerified] = useState(true) // optimistic: assume ok until we know attack mode is on
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const mounted = useRef(false)

  // Don't show on admin pages
  const isAdmin = pathname.startsWith('/admin')

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !SITEKEY) return
    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current) } catch {}
    }
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITEKEY,
      theme: 'dark',
      callback: async (token: string) => {
        setLoading(true)
        setError('')
        try {
          const res = await fetch('/api/verify-captcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          })
          if (res.ok) {
            sessionStorage.setItem(SESSION_KEY, '1')
            setVerified(true)
          } else {
            const d = await res.json().catch(() => ({})) as { error?: string }
            setError(d.error ?? 'Verification failed. Please try again.')
            if (widgetIdRef.current && window.turnstile) {
              window.turnstile.reset(widgetIdRef.current)
            }
          }
        } catch {
          setError('Network error. Please try again.')
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current)
          }
        }
        setLoading(false)
      },
      'error-callback': () => setError('CAPTCHA error. Please refresh.'),
    })
  }, [])

  const loadTurnstile = useCallback(() => {
    if (document.querySelector('script[data-cf-turnstile]')) {
      if (window.turnstile) renderWidget()
      return
    }
    window.onTurnstileLoad = renderWidget
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
    script.async = true
    script.defer = true
    script.setAttribute('data-cf-turnstile', '1')
    document.head.appendChild(script)
  }, [renderWidget])

  useEffect(() => {
    mounted.current = true
    if (isAdmin) return

    // Check if already verified this session
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      setVerified(true)
      return
    }

    // Check attack mode status
    fetch('/api/settings/status', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: { attackMode?: boolean }) => {
        if (!mounted.current) return
        if (d.attackMode) {
          setAttackMode(true)
          setVerified(false)
        }
      })
      .catch(() => {})

    return () => { mounted.current = false }
  }, [isAdmin])

  // Load Turnstile widget when we know we need to show it
  useEffect(() => {
    if (attackMode && !verified && SITEKEY) {
      loadTurnstile()
    }
  }, [attackMode, verified, loadTurnstile])

  if (isAdmin || !attackMode || verified) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(5,0,7,0.96)', backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', padding: 20,
    }}>
      {/* Logo / header */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🛡</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: 22, color: 'var(--text)', marginBottom: 6,
        }}>
          security check
        </div>
        <div style={{ fontSize: 12, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.08em', maxWidth: 280, lineHeight: 1.6 }}>
          this site is under attack mode — please verify you&apos;re human to continue
        </div>
      </div>

      {/* Turnstile widget container */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: 20, marginBottom: 16,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        minWidth: 300,
      }}>
        {!SITEKEY ? (
          <div style={{ fontSize: 12, color: 'rgba(254,240,244,0.4)', textAlign: 'center', padding: '8px 0' }}>
            CAPTCHA not configured
          </div>
        ) : (
          <div ref={containerRef} />
        )}

        {loading && (
          <div style={{ fontSize: 12, color: 'rgba(254,240,244,0.5)', letterSpacing: '0.06em' }}>
            verifying…
          </div>
        )}
        {error && (
          <div style={{ fontSize: 12, color: '#f87171', textAlign: 'center', maxWidth: 240, lineHeight: 1.5 }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'rgba(254,240,244,0.2)', letterSpacing: '0.06em' }}>
        powered by cloudflare turnstile
      </div>

      <style>{`@keyframes cf-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}