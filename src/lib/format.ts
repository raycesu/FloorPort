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

/** Adaptive precision for per-unit prices so small values do not collapse to $0.00. */
export function formatUnitPrice(
  usdAmount: number,
  currency: DisplayCurrency,
  usdToCad: number
): string {
  const amount = currency === 'USD' ? usdAmount : usdAmount * usdToCad
  if (!Number.isFinite(amount)) return '—'
  const abs = Math.abs(amount)
  let maxFractionDigits = 2
  if (abs > 0 && abs < 0.01) maxFractionDigits = 8
  else if (abs < 1) maxFractionDigits = 6
  else if (abs < 100) maxFractionDigits = 4
  const locale = currency === 'USD' ? 'en-US' : 'en-CA'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFractionDigits,
  }).format(amount)
}

export function formatPercent(n: number, opts?: { withPlus?: boolean }) {
  if (!Number.isFinite(n)) return '—'
  const withPlus = opts?.withPlus ?? true
  const sign = n > 0 && withPlus ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function formatQuantity(n: number) {
  if (Number.isInteger(n)) return String(n)
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 })
}
