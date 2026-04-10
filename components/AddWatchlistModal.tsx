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
  onClose: () => void
  onDone: () => void
}

export function AddWatchlistModal({ open, onClose, onDone }: Props) {
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState<'crypto' | 'stock' | 'cash'>('crypto')
  const [selected, setSelected] = useState<SearchRow | null>(null)
  const [results, setResults] = useState<SearchRow[]>([])
  const [searching, setSearching] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setName('')
    setSelected(null)
    setResults([])
    setListOpen(false)
    setError(null)
  }, [open])

  useEffect(() => {
    setSelected(null)
    setResults([])
    setQuery('')
    setName('')
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (!selected) {
        setError('Choose a symbol from the list')
        setLoading(false)
        return
      }
      const sym = selected.symbol.trim().toUpperCase()
      const displayName = name.trim() || selected.name || sym
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
      setQuery('')
      setName('')
      setSelected(null)
      onDone()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  function pickRow(row: SearchRow) {
    const picked =
      assetType === 'cash'
        ? {
            symbol: row.symbol,
            name: FIAT_OPTIONS.find((f) => f.symbol === row.symbol)?.name ?? row.symbol,
            type: 'stock' as const,
          }
        : row
    setSelected(picked)
    setQuery(picked.symbol)
    if (!name.trim()) setName(picked.name)
    setListOpen(false)
  }

  const showList = listOpen && results.length > 0 && (!selected || query !== selected.symbol)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-fp-border bg-fp-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fp-text">Add to watchlist</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-fp-muted hover:bg-fp-page" aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="relative">
            <label className="text-xs text-fp-muted">{assetType === 'cash' ? 'Currency' : 'Symbol'}</label>
            <input
              className="mt-0.5 w-full"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelected(null)
                setListOpen(true)
              }}
              onFocus={() => setListOpen(true)}
              placeholder={assetType === 'cash' ? 'CAD, USD…' : 'Type to search…'}
              autoComplete="off"
              required
            />
            {searching ? <p className="mt-1 text-xs text-fp-muted">Searching...</p> : null}
            {showList ? (
              <ul
                className="absolute z-10 mt-1 max-h-[11rem] w-full overflow-auto rounded-lg border border-fp-border bg-fp-surface py-1"
                role="listbox"
              >
                {results.slice(0, 8).map((row) => (
                  <li key={`${row.symbol}-${row.coingecko_id ?? ''}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-fp-text hover:bg-fp-page"
                      onClick={() => pickRow(row)}
                    >
                      <span className="font-medium text-fp-text">{row.symbol}</span>
                      <span className="ml-2 text-fp-muted">{row.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selected ? (
              <p className="mt-1 text-xs text-fp-positive">Selected: {selected.name}</p>
            ) : (
              <p className="mt-1 text-xs text-fp-muted">Pick an item from the dropdown</p>
            )}
          </div>
          <div>
            <label className="text-xs text-fp-muted">Name (optional)</label>
            <input
              className="mt-0.5 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAssetType('crypto')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                assetType === 'crypto' ? 'bg-fp-crypto-bg text-fp-crypto-text' : 'border border-fp-border bg-transparent text-fp-muted'
              }`}
            >
              Crypto
            </button>
            <button
              type="button"
              onClick={() => setAssetType('stock')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                assetType === 'stock' ? 'bg-fp-stock-bg text-fp-stock-text' : 'border border-fp-border bg-transparent text-fp-muted'
              }`}
            >
              Stock
            </button>
            <button
              type="button"
              onClick={() => setAssetType('cash')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                assetType === 'cash' ? 'bg-fp-page text-fp-text' : 'border border-fp-border bg-transparent text-fp-muted'
              }`}
            >
              Cash
            </button>
          </div>
          {error ? <p className="text-sm text-fp-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-fp-border bg-transparent px-5 py-2.5 text-sm text-fp-muted hover:bg-fp-page">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-fp-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
