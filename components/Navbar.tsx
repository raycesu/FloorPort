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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-fp-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-[4.5rem]">
        <Link
          href="/dashboard"
          className="flex h-full shrink-0 items-center transition-opacity hover:opacity-90"
        >
          <Image
            src="/floorport-logo.png"
            alt="FloorPort"
            width={220}
            height={220}
            className="h-9 w-auto md:h-11"
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
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/15 p-1">
            <button
              type="button"
              disabled={currencyBusy}
              onClick={() => void setCurrency('USD')}
              className={`rounded-md px-4 py-2.5 text-base font-semibold ${
                currency === 'USD'
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              USD
            </button>
            <button
              type="button"
              disabled={currencyBusy}
              onClick={() => void setCurrency('CAD')}
              className={`rounded-md px-4 py-2.5 text-base font-semibold ${
                currency === 'CAD'
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              CAD
            </button>
          </div>
          <span
            className="hidden max-w-[160px] truncate text-xs text-zinc-500 sm:inline"
            title={email ?? ''}
          >
            {email}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            {busy ? '…' : 'Log out'}
          </button>
        </div>
      </div>
      <nav className="flex min-h-12 gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 md:hidden">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === href ? 'bg-white/10 text-zinc-400' : 'text-zinc-400'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
