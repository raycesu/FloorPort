'use client'

import { useDisplayCurrency } from '@/components/CurrencyContext'
import { createClient } from '@/lib/supabase/client'
import type { DisplayCurrency } from '@/types'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/holdings', label: 'Holdings' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/watchlist', label: 'Watchlist' },
]

export function Navbar({ email }: { email?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currency } = useDisplayCurrency()
  const [busy, setBusy] = useState(false)
  const [currencyBusy, setCurrencyBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
    setBusy(false)
  }

  async function setCurrency(next: DisplayCurrency) {
    if (next === currency) return
    setCurrencyBusy(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_currency: next }),
      })
      if (res.ok) router.refresh()
    } finally {
      setCurrencyBusy(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-fp-border bg-fp-nav">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-20">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center self-center transition-opacity hover:opacity-90"
        >
          <Image
            src="/floorport-logo-v2.png"
            alt="FloorPort"
            width={240}
            height={63}
            className="h-10 w-auto md:h-12 max-h-full"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-4 py-2 text-base font-medium transition ${
                pathname === href
                  ? 'bg-fp-crypto-bg text-fp-crypto-text'
                  : 'text-fp-muted hover:bg-fp-page hover:text-fp-text'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-fp-border bg-fp-surface p-1">
            <button
              type="button"
              disabled={currencyBusy}
              onClick={() => void setCurrency('USD')}
              className={`rounded-md px-4 py-2.5 text-base font-medium ${
                currency === 'USD'
                  ? 'bg-fp-page text-fp-text'
                  : 'text-fp-muted hover:text-fp-text'
              }`}
            >
              USD
            </button>
            <button
              type="button"
              disabled={currencyBusy}
              onClick={() => void setCurrency('CAD')}
              className={`rounded-md px-4 py-2.5 text-base font-medium ${
                currency === 'CAD'
                  ? 'bg-fp-page text-fp-text'
                  : 'text-fp-muted hover:text-fp-text'
              }`}
            >
              CAD
            </button>
          </div>
          <span
            className="hidden max-w-[160px] truncate text-xs text-fp-muted sm:inline"
            title={email ?? ''}
          >
            {email}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy}
            className="rounded-lg border border-fp-border px-3 py-1.5 text-sm text-fp-muted transition hover:bg-fp-page hover:text-fp-text disabled:opacity-50"
          >
            {busy ? '…' : 'Log out'}
          </button>
        </div>
      </div>
      <nav className="flex min-h-12 gap-1 overflow-x-auto border-t border-fp-border px-4 py-2 md:hidden">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === href ? 'bg-fp-crypto-bg text-fp-crypto-text' : 'text-fp-muted'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
