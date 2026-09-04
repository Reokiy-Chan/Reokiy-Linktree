'use client'

import { useEffect, useCallback } from 'react'

interface PartnerPopupProps {
  open: boolean
  onClose: () => void
  onContinue: () => void
  message: string
}

export default function PartnerPopup({ open, onClose, onContinue, message }: PartnerPopupProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, handleKey])

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes partner-modal-in { from { opacity:0; } to { opacity:1; } }
        @keyframes partner-panel-in {
          from { opacity:0; transform:translate(-50%,-48%) scale(0.94); }
          to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
        }
      `}</style>

      <div
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: 'rgba(2,0,5,0.82)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          animation: 'partner-modal-in 0.3s ease forwards',
        }}
      />

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%', zIndex: 3001,
          width: 'min(380px, 90vw)',
          animation: 'partner-panel-in 0.35s cubic-bezier(0.34,1.1,0.64,1) forwards',
          background: 'linear-gradient(180deg, rgba(20,0,16,0.99) 0%, rgba(10,0,10,0.99) 100%)',
          border: '1px solid rgba(255,45,120,0.25)',
          borderRadius: 20,
          padding: '26px 24px 22px',
          boxShadow: '0 12px 48px rgba(255,45,120,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 34, marginBottom: 12 }}>💌</div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: 'var(--text)', lineHeight: 1.6, marginBottom: 22 }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '0.05em',
              padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(254,240,244,0.5)',
            }}
          >
            cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '0.05em',
              padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,45,120,0.2)', border: '1px solid rgba(255,45,120,0.5)',
              color: 'var(--text)', boxShadow: '0 0 16px rgba(255,45,120,0.2)',
            }}
          >
            continue →
          </button>
        </div>
      </div>
    </>
  )
}
