'use client'

import { ModalShell } from '@/components/ModalShell'
import { FIAT_ALLOWLIST } from '@/lib/assetValidation'
import { useCallback, useEffect, useRef, useState } from 'react'

type SearchRow = { symbol: string; name: string; type: 'crypto' | 'stock'; coingecko_id?: string }
type AssetKind = 'crypto' | 'stock' | 'cash'

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

const ASSET_TYPE_COPY: Record<
  AssetKind,
  { label: string; hint: string; searchLabel: string; searchPlaceholder: string; quantityLabel: string }
> = {
  crypto: {
    label: 'Crypto',
    hint: 'Search by ticker or name, then enter the position details for this wallet.',
    searchLabel: 'Asset',
    searchPlaceholder: 'Search crypto, for example BTC or Solana',
    quantityLabel: 'Quantity',
  },
  stock: {
    label: 'Stock',
    hint: 'Pick the equity first, then record your share count and average entry price.',
    searchLabel: 'Asset',
    searchPlaceholder: 'Search stocks, for example AAPL or Tesla',
    quantityLabel: 'Shares',
  },
  cash: {
    label: 'Cash',
    hint: 'Choose the currency and enter the current balance held in this wallet.',
    searchLabel: 'Currency',
    searchPlaceholder: 'Search currencies, for example USD or CAD',
    quantityLabel: 'Balance',
  },
}

type Props = {
  open: boolean
  walletId: string
  walletName?: string
  onClose: () => void
  onDone: () => void
}

export function AddHoldingModal({ open, walletId, walletName, onClose, onDone }: Props) {
  const [query, setQuery] = useState('')
  const [assetType, setAssetType] = useState<AssetKind>('crypto')
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
    setError(null)
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
        const res = await fetch(`/api/symbols/search?q=${encodeURIComponent(q)}&type=${type}`, {
          signal: ac.signal,
        })
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

  const copy = ASSET_TYPE_COPY[assetType]
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
      setError('Select a wallet before adding a holding.')
      return
    }
    if (!selected) {
      setError(assetType === 'cash' ? 'Choose a currency from the list.' : 'Choose an asset from the search results.')
      return
    }
    const qty = parseFloat(quantity)
    const price = assetType === 'cash' ? 1 : parseFloat(avgBuy)
    if (assetType !== 'cash') {
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) {
        setError('Enter a valid quantity and average buy price.')
        return
      }
    } else if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a positive cash balance.')
      return
    }

    setLoading(true)
    try {
      const executedIso = new Date(executedAt).toISOString()
      const body: Record<string, unknown> = {
        wallet_id: walletId,
        symbol: selected.symbol,
        name: selected.name,
        asset_type: assetType === 'cash' ? 'cash' : assetType,
        quantity: qty,
        avg_buy_price: price,
        executed_at: executedIso,
      }
      if (assetType === 'crypto' && selected.coingecko_id) body.coingecko_id = selected.coingecko_id

      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Failed to add holding.')
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

  const showList = listOpen && query.trim().length > 0 && (!selected || query !== selected.symbol)
  const showNoResults = showList && !searching && results.length === 0

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Add holding"
      description={
        walletName ? `Add a position to ${walletName}. Everything you enter here stays inside that wallet.` : 'Add a new position to the selected wallet.'
      }
      widthClassName="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-6">
        <div className="rounded-[24px] border border-fp-border bg-white/[0.03] p-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {(['crypto', 'stock', 'cash'] as const).map((kind) => {
              const active = assetType === kind
              const typeCopy = ASSET_TYPE_COPY[kind]
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setAssetType(kind)}
                  className={`rounded-[20px] px-4 py-3 text-left transition ${
                    active
                      ? 'bg-[rgba(139,126,216,0.18)] text-fp-text ring-1 ring-[rgba(139,126,216,0.3)]'
                      : 'text-fp-muted hover:bg-white/[0.04] hover:text-fp-text'
                  }`}
                >
                  <span className="block text-sm font-semibold">{typeCopy.label}</span>
                  <span className="mt-1 block text-xs leading-5 opacity-80">{typeCopy.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <section className="rounded-[24px] border border-fp-border bg-white/[0.03] p-5">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">Asset selection</p>
                <p className="mt-2 text-sm text-fp-muted">{copy.hint}</p>
              </div>

              <div className="relative">
                <label className="text-xs font-medium uppercase tracking-[0.08em] text-fp-muted">
                  {copy.searchLabel}
                </label>
                <input
                  className="mt-2 w-full"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSelected(null)
                    setListOpen(true)
                  }}
                  onFocus={() => setListOpen(true)}
                  placeholder={copy.searchPlaceholder}
                  autoComplete="off"
                />

                {showList ? (
                  <div className="absolute inset-x-0 z-10 mt-2 overflow-hidden rounded-[20px] border border-fp-border bg-[#141a24] shadow-[0_22px_50px_rgba(4,8,18,0.48)]">
                    {searching ? (
                      <div className="px-4 py-3 text-sm text-fp-muted">Searching…</div>
                    ) : showNoResults ? (
                      <div className="px-4 py-3 text-sm text-fp-muted">No matches yet. Try a ticker or a fuller name.</div>
                    ) : (
                      <ul className="max-h-64 overflow-auto py-2" role="listbox">
                        {results.slice(0, 6).map((row) => (
                          <li key={`${row.symbol}-${row.coingecko_id ?? ''}`}>
                            <button
                              type="button"
                              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.05]"
                              onClick={() => pickRow(row)}
                            >
                              <div>
                                <span className="block text-sm font-semibold text-fp-text">{row.symbol}</span>
                                <span className="mt-1 block text-sm text-fp-muted">{row.name}</span>
                              </div>
                              <span className="rounded-full border border-fp-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-fp-muted">
                                {assetType}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-[20px] border border-fp-border bg-[#121722] px-4 py-3">
                {selected ? (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">Selected</p>
                      <p className="mt-2 text-base font-semibold text-fp-text">{selected.symbol}</p>
                      <p className="mt-1 text-sm text-fp-muted">{selected.name}</p>
                    </div>
                    <span className="rounded-full bg-[rgba(74,222,128,0.1)] px-3 py-1 text-xs font-semibold text-fp-positive">
                      Ready
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">Selection status</p>
                    <p className="mt-2 text-sm text-fp-muted">
                      {assetType === 'cash'
                        ? 'Pick a currency so we know which balance to add.'
                        : 'Pick an item from the search results to continue.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-[24px] border border-fp-border bg-white/[0.03] p-5">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">Position details</p>
                <p className="mt-2 text-sm text-fp-muted">
                  {assetType === 'cash'
                    ? 'Cash uses a fixed unit price of 1.00, so only the balance and date are required.'
                    : 'Record the size and average entry for this position.'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.08em] text-fp-muted">
                    {copy.quantityLabel}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="mt-2 w-full"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={assetType === 'cash' ? '0.00' : '0'}
                    required
                  />
                </div>
                {assetType === 'cash' ? (
                  <div className="rounded-[20px] border border-fp-border bg-[#121722] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">Price handling</p>
                    <p className="mt-2 text-sm text-fp-text-secondary">Cash balances are stored at a unit price of 1.00.</p>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-[0.08em] text-fp-muted">Avg buy price (USD)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="mt-2 w-full"
                      value={avgBuy}
                      onChange={(e) => setAvgBuy(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium uppercase tracking-[0.08em] text-fp-muted">Purchase date</label>
                <input
                  type="datetime-local"
                  className="mt-2 w-full"
                  value={executedAt}
                  onChange={(e) => setExecutedAt(e.target.value)}
                />
              </div>
            </section>

            {error ? (
              <div className="rounded-[20px] border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#ffcbcb]">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-fp-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fp-muted">
            {walletName ? `This holding will be added to ${walletName}.` : 'This holding will be added to the selected wallet.'}
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-fp-border bg-transparent px-5 py-3 text-sm font-medium text-fp-text-secondary transition hover:bg-white/[0.04]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="rounded-2xl bg-fp-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-fp-accent-hover disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save holding'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
