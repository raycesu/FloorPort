'use client'

import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onDone: () => void
}

export function AddWatchlistModal({ open, onClose, onDone }: Props) {
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState<'crypto' | 'stock'>('crypto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const sym = symbol.trim().toUpperCase()
      const displayName = name.trim() || sym
      if (!sym) {
        setError('Symbol required')
        setLoading(false)
        return
      }
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: sym,
          name: displayName,
          asset_type: assetType,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Failed to add')
        return
      }
      setSymbol('')
      setName('')
      onDone()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#16161f] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add to watchlist</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-white/10" aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-zinc-400">Symbol</label>
            <input
              className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-fp-accent"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="BTC, MSFT…"
              required
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Name (optional)</label>
            <input
              className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-fp-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAssetType('crypto')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                assetType === 'crypto' ? 'bg-fp-crypto/20 text-fp-crypto' : 'bg-white/5 text-zinc-400'
              }`}
            >
              Crypto
            </button>
            <button
              type="button"
              onClick={() => setAssetType('stock')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                assetType === 'stock' ? 'bg-fp-stock/20 text-fp-stock' : 'bg-white/5 text-zinc-400'
              }`}
            >
              Stock
            </button>
          </div>
          {error ? <p className="text-sm text-fp-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-300 hover:bg-white/10">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-fp-accent px-4 py-2 text-sm font-semibold text-[#0d0d14] disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
