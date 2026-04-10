'use client'

import { TransactionsTable } from '@/components/TransactionsTable'
import type { Transaction } from '@/types'
import { useMemo, useState } from 'react'

export function TransactionsPageClient({ initialList }: { initialList: Transaction[] }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [symbol, setSymbol] = useState('')
  const [type, setType] = useState<'all' | 'buy' | 'sell'>('all')

  const filtered = useMemo(() => {
    const q = symbol.trim().toUpperCase()
    return initialList.filter((t) => {
      const d = new Date(t.executed_at)
      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00Z`)
        if (d < from) return false
      }
      if (toDate) {
        const to = new Date(`${toDate}T23:59:59Z`)
        if (d > to) return false
      }
      if (q && !t.symbol.toUpperCase().includes(q)) return false
      if (type !== 'all' && t.type !== type) return false
      return true
    })
  }, [initialList, fromDate, toDate, symbol, type])

  return (
    <div className="space-y-4">
      <h1 className="text-[20px] font-semibold text-fp-text">Transactions</h1>

      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          aria-label="From date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="h-9 min-w-[150px] rounded-lg border border-fp-input-border bg-fp-surface px-3 text-sm"
        />
        <input
          type="date"
          aria-label="To date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="h-9 min-w-[150px] rounded-lg border border-fp-input-border bg-fp-surface px-3 text-sm"
        />
        <input
          type="text"
          placeholder="Search symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="h-9 min-w-[180px] flex-1 rounded-lg border border-fp-input-border bg-fp-surface px-3 text-sm"
        />
        <select
          aria-label="Transaction type filter"
          value={type}
          onChange={(e) => setType(e.target.value as 'all' | 'buy' | 'sell')}
          className="h-9 min-w-[120px] rounded-lg border border-fp-input-border bg-fp-surface px-3 text-sm"
        >
          <option value="all">All</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-fp-border bg-fp-surface py-16 text-center text-sm text-fp-muted">
          No transactions match your filters.
        </div>
      ) : (
        <TransactionsTable list={filtered} />
      )}
    </div>
  )
}
