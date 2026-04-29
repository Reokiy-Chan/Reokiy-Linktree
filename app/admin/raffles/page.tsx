'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Raffle, RafflePrize, RaffleWinner } from '@/app/lib/raffles'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

// ─── Countdown timer ─────────────────────────────────────────────────────────

function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setRemaining('completed'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return (
    <span style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.08em' }}>
      ⏱ {remaining}
    </span>
  )
}

// ─── Create/Edit Modal ───────────────────────────────────────────────────────

function RaffleModal({
  initial, onClose, onSaved,
}: {
  initial?: Raffle
  onClose: () => void
  onSaved: (r: Raffle) => void
}) {
  const [title, setTitle]           = useState(initial?.title ?? '')
  const [desc, setDesc]             = useState(initial?.description ?? '')
  const [endsAt, setEndsAt]         = useState(initial?.endsAt ? initial.endsAt.slice(0, 16) : '')
  const [autoEnd, setAutoEnd]       = useState(initial?.autoEnd ?? false)
  const [prizes, setPrizes]         = useState<RafflePrize[]>(initial?.prizes ?? [])
  const [prizeInput, setPrizeInput] = useState('')
  const [prizeDesc, setPrizeDesc]   = useState('')
  const [maxWinners, setMaxWinners] = useState(String(initial?.maxWinners ?? 1))
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)',
    borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 11,
    outline: 'none',
  }

  const addPrize = () => {
    if (!prizeInput.trim()) return
    setPrizes(prev => [...prev, { id: crypto.randomUUID(), label: prizeInput.trim(), description: prizeDesc.trim() || undefined }])
    setPrizeInput(''); setPrizeDesc('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      const body = {
        title: title.trim(),
        description: desc.trim(),
        prizes,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        autoEnd,
        maxWinners: Math.max(1, parseInt(maxWinners) || 1),
      }
      const url = initial ? `/api/admin/raffles/${initial.id}` : '/api/admin/raffles'
      const method = initial ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); setSaving(false); return }
      onSaved(data.raffle)
    } catch { setError('Network Error') }
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,0,7,0.85)', backdropFilter: 'blur(8px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0a0010', border: '1px solid rgba(196,20,40,0.3)',
        borderRadius: 16, padding: 28, margin: 16, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ ...S, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.75)' }}>
            {initial ? 'Edit Giveaway' : 'New Giveaway'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Christmast Giveaway" style={fieldStyle} />
          </div>
          <div>
            <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Descripción</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="Giveaway Description…"
              style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          {/* Prizes */}
          <div>
            <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Premios</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={prizeInput} onChange={e => setPrizeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPrize() } }}
                  placeholder="Reward Name…"
                  style={{ ...fieldStyle, flex: 1 }} />
                <button type="button" onClick={addPrize}
                  style={{ ...S, padding: '0 12px', background: 'rgba(196,20,40,0.1)', border: '1px solid rgba(196,20,40,0.25)', borderRadius: 8, color: 'rgba(254,240,244,0.6)', fontSize: 10, cursor: 'pointer' }}>
                  +
                </button>
              </div>
              <input value={prizeDesc} onChange={e => setPrizeDesc(e.target.value)}
                placeholder="Reward Description (opcional)…"
                style={{ ...fieldStyle, fontSize: 10 }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {prizes.map((p, i) => (
                <span key={p.id} style={{
                  ...S, fontSize: 9, padding: '3px 10px 3px 12px', borderRadius: 20,
                  background: 'rgba(196,20,40,0.12)', border: '1px solid rgba(196,20,40,0.25)',
                  color: 'rgba(254,240,244,0.7)', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ color: 'rgba(254,240,244,0.35)', fontSize: 7, marginRight: 2 }}>#{i + 1}</span>
                  {p.label}
                  <button type="button" onClick={() => setPrizes(prev => prev.filter(x => x.id !== p.id))}
                    style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.4)', cursor: 'pointer', fontSize: 10, lineHeight: 1, padding: 0 }}>✕</button>
                </span>
              ))}
            </div>
          </div>

          {/* Max winners */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(196,20,40,0.1)', borderRadius: 10, padding: '12px 14px' }}>
            <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>🏆 Winners Number</label>
            <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.2)', marginBottom: 8 }}>¿How many winners?</div>
            <input type="number" min="1" max="99" value={maxWinners} onChange={e => setMaxWinners(e.target.value)}
              style={{ ...fieldStyle, fontFamily: 'monospace', width: 80 }} />
          </div>

          {/* End date */}
          <div>
            <label style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Fecha de fin (opcional)</label>
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
              style={{ ...fieldStyle, colorScheme: 'dark' }} />
          </div>

          {/* Auto-end toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(196,20,40,0.12)', borderRadius: 10, padding: '12px 14px' }}>
            <div>
              <div style={{ ...S, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.5)' }}>Auto-complete</div>
              <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.2)', marginTop: 2 }}>Choose automaticly the winner once the date</div>
            </div>
            <button type="button" onClick={() => setAutoEnd(v => !v)}
              style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: autoEnd ? 'rgba(196,20,40,0.7)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 12 }}>
              <span style={{ position: 'absolute', top: 3, left: autoEnd ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>

          {error && <div style={{ ...S, fontSize: 10, color: 'var(--primary)', textAlign: 'center' }}>{error}</div>}

          <button type="submit" disabled={saving}
            style={{
              ...S, padding: '10px 0', marginTop: 4,
              background: saving ? 'rgba(196,20,40,0.08)' : 'rgba(196,20,40,0.2)',
              border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8,
              color: saving ? 'var(--text-muted)' : 'var(--text)',
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
            {saving ? 'saving…' : initial ? 'gave changes' : 'create giveaway'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Participants Drawer ─────────────────────────────────────────────────────

function ParticipantsDrawer({
  raffle, onClose, onUpdated,
}: {
  raffle: Raffle
  onClose: () => void
  onUpdated: (r: Raffle) => void
}) {
  const [picking, setPicking]     = useState(false)
  const [toast, setToast]         = useState('')
  const [toastOk, setToastOk]     = useState(true)
  const [addInput, setAddInput]   = useState('')
  const [adding, setAdding]       = useState(false)
  const [removing, setRemoving]   = useState<string | null>(null)
  const [selectedPrize, setSelectedPrize] = useState<string>('')
  const [tab, setTab]             = useState<'participants' | 'winners'>('participants')
  const [search, setSearch]       = useState('')

  const showToast = (msg: string, ok = true) => {
    setToastOk(ok); setToast(msg); setTimeout(() => setToast(''), 3500)
  }

  const maxWinners = raffle.maxWinners ?? 1
  const winners = raffle.winners ?? []
  const canPickMore = raffle.status === 'active' && winners.length < maxWinners

  const pick = async () => {
    if (!confirm(`¿Choose Winner${maxWinners > 1 ? ` (${winners.length + 1}/${maxWinners})` : ''} of "${raffle.title}"?`)) return
    setPicking(true)
    const body: Record<string, string> = {}
    if (selectedPrize) body.prizeId = selectedPrize
    const res = await fetch(`/api/admin/raffles/${raffle.id}/pick`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (res.ok) {
      showToast(`🏆 Winner: ${data.winner.discordUsername}${data.winner.prizeLabel ? ` — ${data.winner.prizeLabel}` : ''}`)
      onUpdated(data.raffle)
      setSelectedPrize('')
    } else {
      showToast(`⚠ ${data.error}`, false)
    }
    setPicking(false)
  }

  const addParticipant = async () => {
    if (!addInput.trim()) return
    setAdding(true)
    const res = await fetch(`/api/admin/raffles/${raffle.id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordUsername: addInput.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      showToast(`✓ ${addInput.trim()} Added`)
      onUpdated({ ...raffle, entries: [...raffle.entries, { discordUsername: addInput.trim(), enteredAt: new Date().toISOString() }] })
      setAddInput('')
    } else {
      showToast(`⚠ ${data.error}`, false)
    }
    setAdding(false)
  }

  const removeParticipant = async (username: string) => {
    if (!confirm(`¿Remove ${username} From Giveaway?`)) return
    setRemoving(username)
    const res = await fetch(`/api/admin/raffles/${raffle.id}/participants`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordUsername: username }),
    })
    const data = await res.json()
    if (res.ok) {
      showToast(`✓ ${username} removed`)
      onUpdated({ ...raffle, entries: raffle.entries.filter(e => e.discordUsername !== username) })
    } else {
      showToast(`⚠ ${data.error}`, false)
    }
    setRemoving(null)
  }

  const exportCSV = () => {
    const header = 'Discord,Fecha de entrada\n'
    const rows = raffle.entries.map(e => `${e.discordUsername},${new Date(e.enteredAt).toLocaleString('es-ES')}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${raffle.title.replace(/\s+/g, '_')}_participantes.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const filteredEntries = raffle.entries.filter(e =>
    e.discordUsername.toLowerCase().includes(search.toLowerCase())
  )
  const winnerUsernames = new Set(winners.map(w => w.discordUsername.toLowerCase()))

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)',
    borderRadius: 7, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 10, outline: 'none',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      background: 'rgba(5,0,7,0.6)', backdropFilter: 'blur(4px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: 400, height: '100vh', overflowY: 'auto',
        background: '#0a0010', borderLeft: '1px solid rgba(196,20,40,0.25)',
        padding: 22, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--text)', lineHeight: 1.2 }}>{raffle.title}</div>
            <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {raffle.entries.length} participant{raffle.entries.length !== 1 ? 's' : ''} · {winners.length}/{maxWinners} winner{maxWinners !== 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(254,240,244,0.35)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 3 }}>
          {(['participants', 'winners'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                ...S, flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 9,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                background: tab === t ? 'rgba(196,20,40,0.25)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'rgba(254,240,244,0.35)',
                transition: 'all 0.15s',
              }}>
              {t === 'participants' ? `👥 Participants (${raffle.entries.length})` : `🏆 Winners (${winners.length})`}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ ...S, fontSize: 10, color: toastOk ? '#4ade80' : 'var(--primary)', textAlign: 'center', letterSpacing: '0.06em', background: toastOk ? 'rgba(74,222,128,0.07)' : 'rgba(196,20,40,0.08)', border: `1px solid ${toastOk ? 'rgba(74,222,128,0.2)' : 'rgba(196,20,40,0.2)'}`, borderRadius: 8, padding: '8px 12px' }}>
            {toast}
          </div>
        )}

        {tab === 'participants' && (
          <>
            {/* Pick winner controls */}
            {raffle.status === 'active' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(196,20,40,0.15)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ ...S, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(254,240,244,0.4)', marginBottom: 2 }}>🎲 Choose Winners</div>
                {raffle.prizes.length > 0 && canPickMore && (
                  <div>
                    <label style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', display: 'block', marginBottom: 4 }}>Assign Reward (Optional)</label>
                    <select value={selectedPrize} onChange={e => setSelectedPrize(e.target.value)}
                      style={{ ...fieldStyle, cursor: 'pointer' }}>
                      <option value="">— No Specific Reward —</option>
                      {raffle.prizes.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button onClick={pick} disabled={picking || raffle.entries.length === 0 || !canPickMore}
                  style={{
                    ...S, padding: '9px 0', background: canPickMore && raffle.entries.length > 0 ? 'rgba(196,20,40,0.2)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(196,20,40,0.4)', borderRadius: 8,
                    color: canPickMore && raffle.entries.length > 0 ? 'var(--text)' : 'var(--text-muted)',
                    fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: picking || raffle.entries.length === 0 || !canPickMore ? 'not-allowed' : 'pointer',
                    opacity: raffle.entries.length === 0 || !canPickMore ? 0.4 : 1,
                  }}>
                  {picking ? 'cHOOSING…' : !canPickMore ? `✓ all the winners had been chosed (${winners.length}/${maxWinners})` : `🎲 choose winner ${maxWinners > 1 ? `(${winners.length + 1}/${maxWinners})` : ''}`}
                </button>
              </div>
            )}

            {/* Add participant */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={addInput} onChange={e => setAddInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addParticipant() }}
                placeholder="Add Discord Username…"
                style={fieldStyle} />
              <button onClick={addParticipant} disabled={adding || !addInput.trim()}
                style={{ ...S, padding: '0 12px', background: 'rgba(196,20,40,0.1)', border: '1px solid rgba(196,20,40,0.25)', borderRadius: 7, color: 'rgba(254,240,244,0.6)', fontSize: 10, cursor: 'pointer', flexShrink: 0 }}>
                {adding ? '…' : '+'}
              </button>
            </div>

            {/* Search + export */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search Participant…"
                style={{ ...fieldStyle, flex: 1 }} />
              <button onClick={exportCSV}
                style={{ ...S, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: 'rgba(254,240,244,0.4)', fontSize: 9, cursor: 'pointer', flexShrink: 0 }}
                title="Export CSV">
                ↓ CSV
              </button>
            </div>

            {/* Participants list */}
            <div style={{ ...S, fontSize: 8, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {filteredEntries.length} Participant{filteredEntries.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {filteredEntries.length === 0 ? (
                <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.2)', textAlign: 'center', padding: '20px 0' }}>
                  {search ? 'No Results' : 'Still No Participants'}
                </div>
              ) : filteredEntries.map((entry, i) => {
                const isWinner = winnerUsernames.has(entry.discordUsername.toLowerCase())
                const winnerEntry = winners.find(w => w.discordUsername.toLowerCase() === entry.discordUsername.toLowerCase())
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: isWinner ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${isWinner ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 8, padding: '8px 10px', gap: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...S, fontSize: 11, color: isWinner ? '#ffd700' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isWinner ? '🏆 ' : ''}{entry.discordUsername}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        <span style={{ ...S, fontSize: 7.5, color: 'rgba(254,240,244,0.2)' }}>
                          {new Date(entry.enteredAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {winnerEntry?.prizeLabel && (
                          <span style={{ ...S, fontSize: 7.5, color: 'rgba(255,215,0,0.5)' }}>🎁 {winnerEntry.prizeLabel}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeParticipant(entry.discordUsername)} disabled={removing === entry.discordUsername}
                      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, color: 'rgba(254,240,244,0.2)', cursor: 'pointer', padding: '3px 7px', fontSize: 10, flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(196,20,40,0.4)'; e.currentTarget.style.color = 'var(--primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(254,240,244,0.2)' }}>
                      {removing === entry.discordUsername ? '…' : '✕'}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'winners' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {winners.length === 0 ? (
              <div style={{ ...S, fontSize: 10, color: 'rgba(254,240,244,0.2)', textAlign: 'center', padding: '32px 0' }}>
                Still no winners tho
              </div>
            ) : winners.map((w, i) => (
              <div key={i} style={{
                background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ ...S, fontSize: 8, color: 'rgba(255,215,0,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                      🏆 Ganador #{i + 1}
                    </div>
                    <div style={{ ...S, fontSize: 14, color: '#ffd700', marginBottom: w.prizeLabel ? 4 : 0 }}>{w.discordUsername}</div>
                    {w.prizeLabel && (
                      <div style={{ ...S, fontSize: 9, color: 'rgba(255,215,0,0.6)' }}>🎁 {w.prizeLabel}</div>
                    )}
                  </div>
                  <div style={{ ...S, fontSize: 7.5, color: 'rgba(255,215,0,0.3)', textAlign: 'right' }}>
                    {new Date(w.pickedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {canPickMore && (
              <div style={{ ...S, fontSize: 9, color: 'rgba(254,240,244,0.3)', textAlign: 'center', padding: '8px 0' }}>
                There's {maxWinners - winners.length} winners{maxWinners - winners.length !== 1 ? 's' : ''} Ramaining for choose
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RafflesPage() {
  const router = useRouter()
  const [raffles, setRaffles] = useState<Raffle[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Raffle | null>(null)
  const [viewing, setViewing] = useState<Raffle | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/admin/raffles/stream')
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onmessage = e => {
      try {
        const d = JSON.parse(e.data) as { raffles: Raffle[] }
        setRaffles(d.raffles ?? [])
        setLoading(false)
        setConnected(true)
        setViewing(prev => {
          if (!prev) return null
          return (d.raffles ?? []).find(r => r.id === prev.id) ?? prev
        })
      } catch {}
    }
    es.onerror = () => {
      setConnected(false)
      es.close()
      setTimeout(() => {
        fetch('/api/admin/raffles')
          .then(r => { if (r.status === 401) router.replace('/admin/login'); return r.json() })
          .then(d => { setRaffles(d.raffles ?? []); setLoading(false) })
          .catch(() => {})
      }, 5000)
    }

    return () => { es.close(); esRef.current = null }
  }, [router])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este sorteo?')) return
    setDeleting(id)
    await fetch(`/api/admin/raffles/${id}`, { method: 'DELETE' })
    setRaffles(prev => prev.filter(r => r.id !== id))
    setViewing(prev => prev?.id === id ? null : prev)
    setDeleting(null)
  }

  const handleDuplicate = async (id: string) => {
    setDuplicating(id)
    const res = await fetch(`/api/admin/raffles/${id}/duplicate`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) setRaffles(prev => [data.raffle, ...prev])
    setDuplicating(null)
  }

  const statusBadge = (r: Raffle) => {
    const isActive = r.status === 'active'
    return (
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: 7, letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '2px 8px', borderRadius: 20,
        background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
        color: isActive ? '#4ade80' : 'rgba(254,240,244,0.3)',
      }}>
        {isActive ? '● active' : '○ ended'}
      </span>
    )
  }

  const active = raffles.filter(r => r.status === 'active')
  const ended  = raffles.filter(r => r.status === 'ended')

  return (
    <>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', lineHeight: 1.1 }}>Giveaways</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'rgba(254,240,244,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {active.length} active · {ended.length} completed
              </div>
              {connected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'pulse-dot 2s ease-in-out infinite' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 7, color: 'rgba(254,240,244,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>live</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setShowModal(true)}
            style={{
              fontFamily: 'var(--font-body)', padding: '9px 18px',
              background: 'rgba(196,20,40,0.18)', border: '1px solid rgba(196,20,40,0.4)',
              borderRadius: 8, color: 'var(--text)', fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,20,40,0.28)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(196,20,40,0.18)')}
          >
            + nuevo sorteo
          </button>
        </div>

        {loading ? (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'rgba(254,240,244,0.3)', textAlign: 'center', paddingTop: 60, letterSpacing: '0.1em' }}>cargando…</div>
        ) : raffles.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(196,20,40,0.2)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(254,240,244,0.25)', letterSpacing: '0.08em' }}>no hay sorteos</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'rgba(254,240,244,0.15)', marginTop: 6 }}>crea tu primer sorteo arriba</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {raffles.map(r => {
              const winners = r.winners ?? []
              const maxWinners = r.maxWinners ?? 1
              const allWinnersPicked = winners.length >= maxWinners
              return (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: r.status === 'ended' ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${r.status === 'ended' ? 'rgba(255,255,255,0.05)' : 'rgba(196,20,40,0.15)'}`,
                  borderRadius: 10, padding: '12px 16px',
                  opacity: r.status === 'ended' ? 0.7 : 1,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{r.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {statusBadge(r)}
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'rgba(254,240,244,0.25)' }}>
                        👥 {r.entries.length}
                      </span>
                      {maxWinners > 1 && (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: allWinnersPicked ? 'rgba(255,215,0,0.6)' : 'rgba(254,240,244,0.25)' }}>
                          🏆 {winners.length}/{maxWinners}
                        </span>
                      )}
                      {winners.length === 1 && maxWinners === 1 && (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'rgba(255,215,0,0.6)' }}>
                          🏆 {winners[0].discordUsername}
                        </span>
                      )}
                      {r.endsAt && r.status === 'active' && (
                        <Countdown endsAt={r.endsAt} />
                      )}
                      {r.endsAt && r.status === 'ended' && (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'rgba(254,240,244,0.2)' }}>
                          · {new Date(r.endsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => setViewing(r)}
                      style={{ ...S, padding: '5px 10px', fontSize: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(254,240,244,0.5)', cursor: 'pointer' }}>
                      see
                    </button>
                    {r.status === 'active' && (
                      <button onClick={() => { setEditing(r); setShowModal(true) }}
                        style={{ ...S, padding: '5px 10px', fontSize: 9, background: 'rgba(196,20,40,0.08)', border: '1px solid rgba(196,20,40,0.2)', borderRadius: 6, color: 'rgba(254,240,244,0.5)', cursor: 'pointer' }}>
                        ✏
                      </button>
                    )}
                    <button onClick={() => handleDuplicate(r.id)} disabled={duplicating === r.id}
                      style={{ ...S, padding: '5px 10px', fontSize: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, color: 'rgba(254,240,244,0.4)', cursor: 'pointer' }}
                      title="Duplicar sorteo">
                      {duplicating === r.id ? '…' : '⎘'}
                    </button>
                    <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, color: 'rgba(254,240,244,0.25)', cursor: 'pointer', padding: '4px 8px', fontSize: 11 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(196,20,40,0.4)'; e.currentTarget.style.color = 'var(--primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(254,240,244,0.25)' }}
                    >
                      {deleting === r.id ? '…' : '✕'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <RaffleModal
          initial={editing ?? undefined}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={r => {
            setRaffles(prev => editing ? prev.map(x => x.id === r.id ? r : x) : [r, ...prev])
            setShowModal(false)
            setEditing(null)
          }}
        />
      )}

      {viewing && (
        <ParticipantsDrawer
          raffle={viewing}
          onClose={() => setViewing(null)}
          onUpdated={updated => {
            setRaffles(prev => prev.map(r => r.id === updated.id ? updated : r))
            setViewing(updated)
          }}
        />
      )}

      <style>{`
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.4; transform:scale(0.75) } }
      `}</style>
    </>
  )
}