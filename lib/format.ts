import type { DisplayCurrency } from '@/types'

const usdFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const cadFmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Amount is always stored/compared in USD internally; pass CAD + usdToCad to display in CAD. */
export function formatMoney(
  usdAmount: number,
  currency: DisplayCurrency,
  usdToCad: number
): string {
  if (currency === 'USD') return usdFmt.format(usdAmount)
  const cad = usdAmount * usdToCad
  return cadFmt.format(cad)
}

export function formatUsd(n: number) {
  return usdFmt.format(n)
}

export function formatPercent(n: number, opts?: { withPlus?: boolean }) {
  const withPlus = opts?.withPlus ?? true
  const sign = n > 0 && withPlus ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function formatQuantity(n: number) {
  if (Number.isInteger(n)) return String(n)
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 })
}

/** Fixed locale + UTC so SSR and browser output match (avoids hydration errors). */
const executedAtFmt = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

export function formatExecutedAt(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${executedAtFmt.format(d)} UTC`
}
