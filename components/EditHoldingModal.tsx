'use client'

import { ModalShell } from '@/components/ModalShell'
import { useDisplayCurrency } from '@/components/CurrencyContext'
import { formatMoney } from '@/lib/format'
import type { Holding } from '@/types'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && holding) {
      setQuantity(String(holding.quantity))
      setAvgBuy(String(holding.avg_buy_price))
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
      if (!Number.isFinite(qty) || qty < 0 || (!isCash && (!Number.isFinite(avg) || avg < 0))) {
        setError('Enter a valid quantity and average buy price.')
        setLoading(false)
        return
      }

      const body: Record<string, unknown> = {
        id: h.id,
        quantity: qty,
        avg_buy_price: isCash ? 1 : avg,
      }

      const res = await fetch('/api/holdings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Update failed.')
        return
      }

      onDone()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Edit ${h.symbol}`}
      description={
        isCash
          ? 'Update the wallet balance for this cash position.'
          : 'Adjust the current quantity and cost basis for this holding.'
      }
      widthClassName="max-w-xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <section className="rounded-[24px] border border-fp-border bg-white/[0.03] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.08em] text-fp-muted">
                {isCash ? 'Balance' : 'Quantity'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                className="mt-2 w-full"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            {isCash ? (
              <div className="rounded-[20px] border border-fp-border bg-[#121722] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">Price handling</p>
                <p className="mt-2 text-sm text-fp-text-secondary">Cash balances always use a unit price of 1.00.</p>
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
                  required
                />
                <p className="mt-2 text-xs text-fp-muted">
                  Displayed as {formatMoney(parseFloat(avgBuy) || 0, currency, usdToCad)} in your selected currency.
                </p>
              </div>
            )}
          </div>
        </section>

        {error ? (
          <div className="rounded-[20px] border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#ffcbcb]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-fp-border pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-fp-border bg-transparent px-5 py-3 text-sm font-medium text-fp-text-secondary transition hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-fp-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-fp-accent-hover disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
