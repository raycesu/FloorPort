'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { formatMoney, formatPercent, formatQuantity, formatUnitPrice } from '@/lib/format'
import type { Holding } from '@/types'

function pnlColors(pnl: number, pnlPct: number, isCash: boolean, noPrice: boolean) {
  if (isCash || noPrice) return { pnl: '#8f98aa', pct: '#8f98aa' }
  const sign = pnl !== 0 ? Math.sign(pnl) : Math.sign(pnlPct)
  if (sign > 0) return { pnl: '#4ade80', pct: '#4ade80' }
  if (sign < 0) return { pnl: '#f87171', pct: '#f87171' }
  return { pnl: '#8f98aa', pct: '#8f98aa' }
}

function changeColor(value?: number, isCash?: boolean) {
  if (isCash || value == null || Number.isNaN(value)) return '#8f98aa'
  if (value > 0) return '#4ade80'
  if (value < 0) return '#f87171'
  return '#8f98aa'
}

function changeBadgeStyle(value?: number, isCash?: boolean) {
  const color = changeColor(value, isCash)
  if (color === '#4ade80') return { color, background: 'rgba(74,222,128,0.09)', border: '1px solid rgba(74,222,128,0.18)' }
  if (color === '#f87171') return { color, background: 'rgba(248,113,113,0.09)', border: '1px solid rgba(248,113,113,0.18)' }
  return { color, background: 'rgba(143,152,170,0.08)', border: '1px solid rgba(143,152,170,0.16)' }
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
  onEdit,
  onDelete,
}: {
  holdings: Holding[]
  showActions?: boolean
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
          background: '#161b24',
          border: '1px dashed rgba(159,174,197,0.18)',
          borderRadius: 22,
          color: '#8f98aa',
        }}
      >
        No holdings yet. Add one to get started.
      </div>
    )
  }

  const headerCols = [
    'Symbol',
    'Qty',
    'Avg buy',
    'Current',
    'Value',
    'P&L',
    'P&L %',
    '1D %',
    '7D %',
  ] as const

  return (
    <div
      className="overflow-hidden"
      style={{
        background: '#161b24',
        border: '1px solid rgba(159,174,197,0.16)',
        borderRadius: 22,
        boxShadow: '0 18px 40px rgba(3,8,20,0.22)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] border-collapse text-left">
          <thead>
            <tr
              style={{
                background: 'linear-gradient(180deg, rgba(27,34,45,0.95) 0%, rgba(22,27,36,0.98) 100%)',
                borderBottom: '1px solid rgba(159,174,197,0.12)',
              }}
            >
              {headerCols.map((col, i) => (
                <th
                  key={col}
                  className={`align-middle font-semibold uppercase ${i >= 1 ? 'text-right' : 'text-left'}`}
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.09em',
                    color: '#93a0b4',
                    padding: '14px 20px',
                  }}
                >
                  {col}
                </th>
              ))}
              {showActions ? (
                <th
                  className="align-middle text-right font-semibold uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.09em',
                    color: '#93a0b4',
                    padding: '14px 20px',
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

              return (
                <tr
                  key={h.id}
                  className="transition-colors duration-150"
                  style={{
                    minHeight: 60,
                    borderBottom: isLast ? undefined : '1px solid rgba(159,174,197,0.08)',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.028)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                  }}
                >
                  <td
                    className="align-middle"
                    style={{ padding: '16px 20px', minHeight: 60 }}
                  >
                    <div className="flex flex-col">
                      <span className="text-[15px] font-semibold tracking-[0.01em]" style={{ color: '#f5f7fb' }}>
                        {h.symbol}
                      </span>
                      <span className="text-[12px]" style={{ color: '#93a0b4' }}>
                        {h.name || h.symbol}
                      </span>
                    </div>
                  </td>
                  <td className="align-middle text-right tabular-nums" style={{ fontSize: 14, color: '#d3dae6', padding: '16px 20px' }}>
                    {formatQuantity(h.quantity)}
                  </td>
                  <td className="align-middle text-right tabular-nums" style={{ fontSize: 14, color: '#aeb8c9', padding: '16px 20px' }}>
                    {isCash ? <span style={{ color: '#6b7587' }}>—</span> : formatUnitPrice(h.avg_buy_price, currency, usdToCad)}
                  </td>
                  <td className="align-middle text-right tabular-nums" style={{ fontSize: 14, color: '#d3dae6', padding: '16px 20px' }}>
                    {h.current_price != null
                      ? formatUnitPrice(h.current_price, currency, usdToCad)
                      : <span style={{ color: '#6b7587' }}>—</span>}
                  </td>
                  <td className="align-middle text-right tabular-nums font-semibold" style={{ fontSize: 15, color: h.current_value != null ? '#f5f7fb' : '#6b7587', padding: '16px 20px' }}>
                    {h.current_value != null ? m(h.current_value) : '—'}
                  </td>
                  <td className="align-middle text-right tabular-nums font-semibold" style={{ fontSize: 14, color: isCash || noPrice ? '#6b7587' : pnlColor, padding: '16px 20px' }}>
                    {isCash || noPrice ? '—' : m(pnl)}
                  </td>
                  <td className="align-middle text-right tabular-nums font-medium" style={{ fontSize: 14, color: isCash || noPrice ? '#6b7587' : pctColor, padding: '16px 20px' }}>
                    {isCash || noPrice ? '—' : formatPercent(pnlPct)}
                  </td>
                  <td className="align-middle text-right" style={{ padding: '16px 20px' }}>
                    {isCash || h.change_1d == null ? (
                      <span className="text-[13px] tabular-nums" style={{ color: '#6b7587' }}>
                        —
                      </span>
                    ) : (
                      <span
                        className="inline-flex min-w-[72px] justify-center rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums"
                        style={changeBadgeStyle(h.change_1d, isCash)}
                      >
                        {formatPercent(h.change_1d)}
                      </span>
                    )}
                  </td>
                  <td className="align-middle text-right" style={{ padding: '16px 20px' }}>
                    {isCash || h.change_7d == null ? (
                      <span className="text-[13px] tabular-nums" style={{ color: '#6b7587' }}>
                        —
                      </span>
                    ) : (
                      <span
                        className="inline-flex min-w-[72px] justify-center rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums"
                        style={changeBadgeStyle(h.change_7d, isCash)}
                      >
                        {formatPercent(h.change_7d)}
                      </span>
                    )}
                  </td>
                  {showActions ? (
                    <td className="align-middle text-right" style={{ padding: '16px 20px' }}>
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit?.(h)}
                          aria-label={`Edit ${h.symbol}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-0 transition-colors duration-150"
                          style={{ color: '#bcc6d6', background: 'rgba(255,255,255,0.03)' }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget
                            el.style.color = '#f5f7fb'
                            el.style.background = 'rgba(255,255,255,0.08)'
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget
                            el.style.color = '#bcc6d6'
                            el.style.background = 'rgba(255,255,255,0.03)'
                          }}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete?.(h)}
                          aria-label={`Delete ${h.symbol}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-0 transition-colors duration-150"
                          style={{ color: '#f2a2a2', background: 'rgba(248,113,113,0.06)' }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget
                            el.style.color = '#ffe4e4'
                            el.style.background = 'rgba(248,113,113,0.16)'
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget
                            el.style.color = '#f2a2a2'
                            el.style.background = 'rgba(248,113,113,0.06)'
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
