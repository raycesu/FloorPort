'use client'

import { FIAT_ALLOWLIST } from '@/lib/assetValidation'
import { useCallback, useEffect, useRef, useState } from 'react'

type SearchRow = { symbol: string; name: string; type: 'crypto' | 'stock'; coingecko_id?: string }

const FIAT_OPTIONS = [...FIAT_ALLOWLIST].map((symbol) => ({
  symbol,
  name:
    symbol === 'USD'
      ? 'US Dollar'
      : symbol === 'CAD'
        ? 'Canadian Dollar'
        : symbol === 'EUR'
          ? 'Euro'
          : 'British Pound',
}))

type Props = {
  open: boolean
  walletId: string
  onClose: () => void
  onDone: () => void
}

export function AddHoldingModal({ open, walletId, onClose, onDone }: Props) {
  const [query, setQuery] = useState('')
  const [assetType, setAssetType] = useState<'crypto' | 'stock' | 'cash'>('crypto')
  const [selected, setSelected] = useState<SearchRow | null>(null)
  const [results, setResults] = useState<SearchRow[]>([])
  const [searching, setSearching] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [avgBuy, setAvgBuy] = useState('')
  const [executedAt, setExecutedAt] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(null)
    setResults([])
    setQuantity('')
    setAvgBuy('')
    setError(null)
    setListOpen(false)
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setExecutedAt(d.toISOString().slice(0, 16))
  }, [open])

  useEffect(() => {
    setSelected(null)
    setResults([])
    setQuery('')
  }, [assetType])

  const runSearch = useCallback(
    async (q: string) => {
      if (assetType === 'cash') {
        const qq = q.trim().toUpperCase()
        const filtered = FIAT_OPTIONS.filter(
          (f) => f.symbol.includes(qq) || f.name.toLowerCase().includes(q.trim().toLowerCase())
        )
        setResults(filtered.map((f) => ({ symbol: f.symbol, name: f.name, type: 'stock' as const })))
        return
      }

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setSearching(true)
      try {
        const type = assetType === 'crypto' ? 'crypto' : 'stock'
        const res = await fetch(
          `/api/symbols/search?q=${encodeURIComponent(q)}&type=${type}`,
          { signal: ac.signal }
        )
        const json = (await res.json()) as { results?: SearchRow[] }
        if (!ac.signal.aborted) setResults(json.results ?? [])
      } catch {
        if (!ac.signal.aborted) setResults([])
      } finally {
        if (!ac.signal.aborted) setSearching(false)
      }
    },
    [assetType]
  )

  useEffect(() => {
    if (!open || assetType === 'cash') return
    const q = query.trim()
    if (q.length < 1) {
      setResults([])
      return
    }
    const t = setTimeout(() => void runSearch(q), 300)
    return () => clearTimeout(t)
  }, [query, open, assetType, runSearch])

  useEffect(() => {
    if (!open || assetType !== 'cash') return
    void runSearch(query)
  }, [query, open, assetType, runSearch])

  if (!open) return null

  const qtyNum = parseFloat(quantity)
  const avgNum = parseFloat(avgBuy)
  const canSubmit =
    Boolean(walletId && selected) &&
    Number.isFinite(qtyNum) &&
    qtyNum > 0 &&
    (assetType === 'cash' || (Number.isFinite(avgNum) && avgNum >= 0))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!walletId) {
      setError('No wallet selected')
      return
    }
    if (!selected) {
      setError('Choose a symbol from the list')
      return
    }
    const qty = parseFloat(quantity)
    const price = assetType === 'cash' ? 1 : parseFloat(avgBuy)
    if (assetType !== 'cash') {
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) {
        setError('Check quantity and price')
        return
      }
    } else {
      if (!Number.isFinite(qty) || qty <= 0) {
        setError('Enter a positive balance')
        return
      }
    }

    setLoading(true)
    try {
      const executed_iso = new Date(executedAt).toISOString()
      const body: Record<string, unknown> = {
        wallet_id: walletId,
        symbol: selected.symbol,
        name: selected.name,
        asset_type: assetType === 'cash' ? 'cash' : assetType,
        quantity: qty,
        avg_buy_price: price,
        executed_at: executed_iso,
      }
      if (assetType === 'crypto' && selected.coingecko_id) {
        body.coingecko_id = selected.coingecko_id
      }
      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Failed to add')
        return
      }
      setQuery('')
      setSelected(null)
      setQuantity('')
      setAvgBuy('')
      onDone()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  function pickRow(row: SearchRow) {
    const normalized: SearchRow =
      assetType === 'cash'
        ? {
            symbol: row.symbol,
            name: FIAT_OPTIONS.find((f) => f.symbol === row.symbol)?.name ?? row.symbol,
            type: 'stock',
          }
        : row
    setSelected(normalized)
    setQuery(normalized.symbol)
    setListOpen(false)
  }

  const showList = listOpen && results.length > 0 && (!selected || query !== selected.symbol)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#16161f] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add holding</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="relative">
            <label className="text-xs text-zinc-400">
              {assetType === 'cash' ? 'Currency' : 'Symbol'}
            </label>
            <input
              className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-fp-accent"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelected(null)
                setListOpen(true)
              }}
              onFocus={() => setListOpen(true)}
              placeholder={assetType === 'cash' ? 'CAD, USD…' : 'Type to search…'}
              autoComplete="off"
            />
            {searching ? (
              <p className="mt-1 text-xs text-zinc-500">Searching…</p>
            ) : null}
            {showList ? (
              <ul
                className="absolute z-10 mt-1 max-h-[11rem] w-full overflow-auto rounded-lg border border-white/10 bg-[#1a1a24] py-1 shadow-xl"
                role="listbox"
              >
                {results.slice(0, 5).map((row) => (
                  <li key={`${row.symbol}-${row.coingecko_id ?? ''}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/10"
                      onClick={() => pickRow(row)}
                    >
                      <span className="font-medium text-white">{row.symbol}</span>
                      <span className="ml-2 text-zinc-500">{row.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selected ? (
              <p className="mt-1 text-xs text-fp-positive">Selected: {selected.name}</p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">Pick an item from the dropdown</p>
            )}
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
            <button
              type="button"
              onClick={() => setAssetType('cash')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                assetType === 'cash' ? 'bg-zinc-600/30 text-zinc-200' : 'bg-white/5 text-zinc-400'
              }`}
            >
              Cash
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400">
                {assetType === 'cash' ? 'Balance' : 'Quantity'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-fp-accent"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            {assetType === 'cash' ? null : (
              <div>
                <label className="text-xs text-zinc-400">Avg buy price (USD)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-fp-accent"
                  value={avgBuy}
                  onChange={(e) => setAvgBuy(e.target.value)}
                  required
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-400">Purchase date</label>
            <input
              type="datetime-local"
              className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-fp-accent"
              value={executedAt}
              onChange={(e) => setExecutedAt(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-fp-negative">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="rounded-lg bg-fp-accent px-4 py-2 text-sm font-semibold text-[#0d0d14] disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
