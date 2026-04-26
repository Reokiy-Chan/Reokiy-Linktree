'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function TrackingBeacon() {
  const pathname = usePathname()
  const lastTracked = useRef('')

  useEffect(() => {
    if (pathname === lastTracked.current) return
    if (pathname.startsWith('/admin')) return
    lastTracked.current = pathname

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname, referrer: document.referrer }),
    }).catch(() => {})
  }, [pathname])

  return null
}