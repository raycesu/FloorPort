'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { PriceChart } from '@/components/PriceChart'
import { formatMoney, formatPercent, formatQuantity } from '@/lib/format'
import type { Holding } from '@/types'

export function HoldingsTable({
  holdings,
  showActions = false,
  showChart = true,
  onEdit,
  onDelete,
}: {
  holdings: Holding[]
  showActions?: boolean
  showChart?: boolean
  onEdit?: (h: Holding) => void
  onDelete?: (h: Holding) => void
}) {
  const { currency, usdToCad } = useDisplayCurrency()
  const m = (n: number) => formatMoney(n, currency, usdToCad)

  if (holdings.length === 0) {
    return (
      <div
        className="rounded-2xl py-16 text-center text-sm"
        style={{
          background: '#18181b',
          border: '1px dashed rgba(255,255,255,0.07)',
          color: '#52525b',
        }}
      >
        No holdings yet. Add one to get started.
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead>
            <tr style={{ background: '#141416' }}>
              {['Symbol', 'Type', 'Qty', 'Avg buy', 'Current', 'Value', 'P&L', 'P&L %'].map(
                (col, i) => (
                  <th
                    key={col}
                    className={`px-5 py-3.5 font-medium uppercase tracking-[0.08em] ${
                      i >= 2 ? 'text-right' : ''
                    }`}
                    style={{ fontSize: '11px', color: '#52525b' }}
                  >
                    {col}
                  </th>
                )
              )}
              {showChart ? (
                <th
                  className="px-5 py-3.5 font-medium uppercase tracking-[0.08em]"
                  style={{ fontSize: '11px', color: '#52525b' }}
                >
                  7d
                </th>
              ) : null}
              {showActions ? (
                <th
                  className="px-5 py-3.5 text-right font-medium uppercase tracking-[0.08em]"
                  style={{ fontSize: '11px', color: '#52525b' }}
                >
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const pnl = h.pnl ?? 0
              const pnlPct = h.pnl_percent ?? 0
              const pnlColor = pnl >= 0 ? '#4ade80' : '#f87171'
              const isCash = h.asset_type === 'cash'

              const typeBadgeStyle =
                h.asset_type === 'crypto'
                  ? { background: 'rgba(124,111,212,0.12)', color: '#9b8ee0' }
                  : h.asset_type === 'stock'
                    ? { background: 'rgba(52,211,153,0.10)', color: '#34d399' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#71717a' }

              return (
                <tr
                  key={h.id}
                  className="transition-colors duration-100"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background =
                      'rgba(255,255,255,0.02)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                  }}
                >
                  <td
                    className="px-5 py-3.5 font-semibold"
                    style={{ fontSize: '13px', color: '#e4e4e7' }}
                  >
                    {h.symbol}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-medium capitalize"
                      style={typeBadgeStyle}
                    >
                      {h.asset_type}
                    </span>
                  </td>
                  <td
                    className="px-5 py-3.5 text-right tabular-nums"
                    style={{ fontSize: '13px', color: '#71717a' }}
                  >
                    {formatQuantity(h.quantity)}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right tabular-nums"
                    style={{ fontSize: '13px', color: '#71717a' }}
                  >
                    {isCash ? '—' : m(h.avg_buy_price)}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right tabular-nums"
                    style={{ fontSize: '13px', color: '#71717a' }}
                  >
                    {h.current_price != null ? m(h.current_price) : '—'}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right tabular-nums font-medium"
                    style={{ fontSize: '13px', color: '#e4e4e7' }}
                  >
                    {h.current_value != null ? m(h.current_value) : '—'}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right tabular-nums font-medium"
                    style={{ fontSize: '13px', color: isCash || h.current_price == null ? '#52525b' : pnlColor }}
                  >
                    {isCash ? '—' : h.current_price != null ? m(pnl) : '—'}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right tabular-nums"
                    style={{ fontSize: '13px', color: isCash || h.current_price == null ? '#52525b' : pnlColor }}
                  >
                    {isCash ? '—' : h.current_price != null ? formatPercent(pnlPct) : '—'}
                  </td>
                  {showChart ? (
                    <td className="px-5 py-3.5">
                      {isCash ? (
                        <span style={{ fontSize: '13px', color: '#52525b' }}>—</span>
                      ) : (
                        <PriceChart
                          symbol={h.symbol}
                          assetType={h.asset_type as 'crypto' | 'stock'}
                        />
                      )}
                    </td>
                  ) : null}
                  {showActions ? (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onEdit?.(h)}
                        className="mr-3 text-xs font-medium transition-colors duration-150 hover:underline"
                        style={{ color: '#7c6fd4' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete?.(h)}
                        className="text-xs font-medium transition-colors duration-150 hover:underline"
                        style={{ color: '#f87171' }}
                      >
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
