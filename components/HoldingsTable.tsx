'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { PriceChart } from '@/components/PriceChart'
import { formatMoney, formatPercent, formatQuantity } from '@/lib/format'
import type { Holding } from '@/types'

function pnlColors(pnl: number, pnlPct: number, isCash: boolean, noPrice: boolean) {
  if (isCash || noPrice) return { pnl: '#71717a', pct: '#71717a' }
  const sign = pnl !== 0 ? Math.sign(pnl) : Math.sign(pnlPct)
  if (sign > 0) return { pnl: '#4ade80', pct: '#4ade80' }
  if (sign < 0) return { pnl: '#f87171', pct: '#f87171' }
  return { pnl: '#71717a', pct: '#71717a' }
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

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
        className="overflow-hidden py-16 text-center text-sm"
        style={{
          background: '#18181b',
          border: '1px dashed rgba(255,255,255,0.07)',
          borderRadius: 16,
          color: '#52525b',
        }}
      >
        No holdings yet. Add one to get started.
      </div>
    )
  }

  const headerCols = ['Symbol', 'Type', 'Qty', 'Avg buy', 'Current', 'Value', 'P&L', 'P&L %'] as const

  return (
    <div
      className="overflow-hidden"
      style={{
        background: '#18181b',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr
              style={{
                background: '#141416',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {headerCols.map((col, i) => (
                <th
                  key={col}
                  className={`align-middle font-medium uppercase ${i >= 2 ? 'text-right' : 'text-left'}`}
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.07em',
                    color: '#52525b',
                    padding: '12px 20px',
                  }}
                >
                  {col}
                </th>
              ))}
              {showChart ? (
                <th
                  className="align-middle text-right font-medium uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.07em',
                    color: '#52525b',
                    padding: '12px 20px',
                  }}
                >
                  7d
                </th>
              ) : null}
              {showActions ? (
                <th
                  className="align-middle text-right font-medium uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.07em',
                    color: '#52525b',
                    padding: '12px 20px',
                  }}
                >
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, rowIndex) => {
              const pnl = h.pnl ?? 0
              const pnlPct = h.pnl_percent ?? 0
              const isCash = h.asset_type === 'cash'
              const noPrice = h.current_price == null
              const { pnl: pnlColor, pct: pctColor } = pnlColors(pnl, pnlPct, isCash, noPrice)

              const isLast = rowIndex === holdings.length - 1

              const typeBadgeStyle =
                h.asset_type === 'crypto'
                  ? {
                      background: 'rgba(124,111,212,0.12)',
                      color: '#9b8ee0',
                      border: '1px solid rgba(124,111,212,0.2)',
                    }
                  : h.asset_type === 'stock'
                    ? {
                        background: 'rgba(52,211,153,0.10)',
                        color: '#34d399',
                        border: '1px solid rgba(52,211,153,0.2)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.06)',
                        color: '#71717a',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }

              return (
                <tr
                  key={h.id}
                  className="transition-colors duration-150"
                  style={{
                    minHeight: 52,
                    borderBottom: isLast ? undefined : '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background =
                      'rgba(255,255,255,0.025)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                  }}
                >
                  <td
                    className="align-middle font-semibold"
                    style={{
                      fontSize: 14,
                      color: '#e4e4e7',
                      padding: '14px 20px',
                      minHeight: 52,
                    }}
                  >
                    {h.symbol}
                  </td>
                  <td className="align-middle" style={{ padding: '14px 20px', minHeight: 52 }}>
                    <span
                      className="inline-block rounded-md font-semibold uppercase"
                      style={{
                        ...typeBadgeStyle,
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontSize: 11,
                      }}
                    >
                      {h.asset_type}
                    </span>
                  </td>
                  <td
                    className="align-middle text-right tabular-nums"
                    style={{ fontSize: 13, color: '#71717a', padding: '14px 20px', minHeight: 52 }}
                  >
                    {formatQuantity(h.quantity)}
                  </td>
                  <td
                    className="align-middle text-right tabular-nums"
                    style={{ fontSize: 13, color: '#71717a', padding: '14px 20px', minHeight: 52 }}
                  >
                    {isCash ? <span style={{ color: '#3f3f46' }}>—</span> : m(h.avg_buy_price)}
                  </td>
                  <td
                    className="align-middle text-right tabular-nums"
                    style={{ fontSize: 13, color: '#71717a', padding: '14px 20px', minHeight: 52 }}
                  >
                    {h.current_price != null ? m(h.current_price) : <span style={{ color: '#3f3f46' }}>—</span>}
                  </td>
                  <td
                    className="align-middle text-right tabular-nums font-semibold"
                    style={{
                      fontSize: 13,
                      color: h.current_value != null ? '#ffffff' : '#3f3f46',
                      padding: '14px 20px',
                      minHeight: 52,
                    }}
                  >
                    {h.current_value != null ? m(h.current_value) : '—'}
                  </td>
                  <td
                    className="align-middle text-right tabular-nums font-semibold"
                    style={{
                      fontSize: 13,
                      color: isCash || noPrice ? '#3f3f46' : pnlColor,
                      padding: '14px 20px',
                      minHeight: 52,
                    }}
                  >
                    {isCash || noPrice ? '—' : m(pnl)}
                  </td>
                  <td
                    className="align-middle text-right tabular-nums"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: isCash || noPrice ? '#3f3f46' : pctColor,
                      padding: '14px 20px',
                      minHeight: 52,
                    }}
                  >
                    {isCash || noPrice ? '—' : formatPercent(pnlPct)}
                  </td>
                  {showChart ? (
                    <td
                      className="align-middle text-right"
                      style={{ padding: '14px 20px', minHeight: 52 }}
                    >
                      {isCash ? (
                        <span className="text-[13px] tabular-nums" style={{ color: '#3f3f46' }}>
                          —
                        </span>
                      ) : (
                        <PriceChart
                          symbol={h.symbol}
                          assetType={h.asset_type as 'crypto' | 'stock'}
                        />
                      )}
                    </td>
                  ) : null}
                  {showActions ? (
                    <td
                      className="align-middle text-right"
                      style={{ padding: '14px 20px', minHeight: 52 }}
                    >
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit?.(h)}
                          aria-label={`Edit ${h.symbol}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent transition-colors duration-150"
                          style={{ color: '#71717a' }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget
                            el.style.color = '#e4e4e7'
                            el.style.background = 'rgba(255,255,255,0.06)'
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget
                            el.style.color = '#71717a'
                            el.style.background = 'transparent'
                          }}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete?.(h)}
                          aria-label={`Delete ${h.symbol}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent transition-colors duration-150"
                          style={{ color: '#71717a' }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget
                            el.style.color = '#f87171'
                            el.style.background = 'rgba(255,255,255,0.06)'
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget
                            el.style.color = '#71717a'
                            el.style.background = 'transparent'
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
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
