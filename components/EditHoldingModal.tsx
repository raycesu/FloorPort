'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import type { Holding } from '@/types'
import { formatMoney } from '@/lib/format'
import { useEffect, useState } from 'react'

type Props = {
  holding: Holding | null
  open: boolean
  onClose: () => void
  onDone: () => void
}

export function EditHoldingModal({ holding, open, onClose, onDone }: Props) {
  const { currency, usdToCad } = useDisplayCurrency()
  const [quantity, setQuantity] = useState('')
  const [avgBuy, setAvgBuy] = useState('')
  const [tradePrice, setTradePrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && holding) {
      setQuantity(String(holding.quantity))
      setAvgBuy(String(holding.avg_buy_price))
      setTradePrice('')
      setError(null)
    }
  }, [open, holding])

  if (!open || !holding) return null

  const h = holding
  const isCash = h.asset_type === 'cash'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const qty = parseFloat(quantity)
      const avg = parseFloat(avgBuy)
      const tp = tradePrice.trim() === '' ? null : parseFloat(tradePrice)
      if (!Number.isFinite(qty) || qty < 0 || (!isCash && (!Number.isFinite(avg) || avg < 0))) {
        setError('Invalid quantity or average')
        setLoading(false)
        return
      }
      const body: Record<string, unknown> = {
        id: h.id,
        quantity: qty,
        avg_buy_price: isCash ? 1 : avg,
      }
      if (!isCash && tp != null && Number.isFinite(tp) && tp >= 0) {
        body.trade_price = tp
      }
      const res = await fetch('/api/holdings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Update failed')
        return
      }
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
          <h2 className="text-lg font-semibold text-white">Edit {h.symbol}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {isCash
            ? 'Update your cash balance. Cost basis is not tracked for cash.'
            : 'If quantity changes, add a trade price for the bought/sold amount (optional — otherwise avg buy is used).'}
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-zinc-400">{isCash ? 'Balance' : 'Quantity'}</label>
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
          {isCash ? null : (
            <>
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
                <p className="mt-1 text-xs text-zinc-600">
                  ≈ {formatMoney(parseFloat(avgBuy) || 0, currency, usdToCad)} displayed
                </p>
              </div>
              <div>
                <label className="text-xs text-zinc-400">Trade price for delta (optional)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-fp-accent"
                  value={tradePrice}
                  onChange={(e) => setTradePrice(e.target.value)}
                  placeholder="Per unit when quantity changes"
                />
              </div>
            </>
          )}
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
              disabled={loading}
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
