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
]

const currencies: DisplayCurrency[] = ['USD', 'CAD']

export function Navbar({ email }: { email?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currency } = useDisplayCurrency()
  const [busy, setBusy] = useState(false)
  const [currencyBusy, setCurrencyBusy] = useState(false)

  const handleSignOut = async () => {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
    setBusy(false)
  }

  const handleSetCurrency = async (next: DisplayCurrency) => {
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
    <header className="sticky top-0 z-50 border-b border-fp-border-nav bg-fp-nav/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center gap-4 px-5 py-3 sm:px-8">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4 md:flex-none">
          <Link
            href="/dashboard"
            aria-label="Go to Dashboard"
            className="group relative flex shrink-0 items-center rounded-2xl transition duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/70"
          >
            <span className="absolute left-2 top-1/2 size-20 -translate-y-1/2 rounded-full bg-fp-accent/14 blur-2xl transition-opacity duration-200 group-hover:opacity-90" aria-hidden />
            <Image
              src="/floorport-logo-v2.png"
              alt="FloorPort"
              width={190}
              height={95}
              className="relative object-contain drop-shadow-[0_8px_22px_rgba(139,126,216,0.20)]"
              priority
            />
          </Link>

          <div className="flex items-center gap-2 md:hidden">
            <CurrencyToggle
              currency={currency}
              currencyBusy={currencyBusy}
              onCurrencyChange={handleSetCurrency}
            />
          </div>
        </div>

        <nav
          aria-label="Primary navigation"
          className="hidden flex-1 items-center justify-center gap-1 rounded-full border border-white/18 bg-black/20 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:flex md:max-w-[440px] xl:max-w-[560px]"
        >
          {links.map(({ href, label }) => {
            const isActive = pathname === href

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`rounded-full px-5 py-2 text-sm font-semibold tracking-[-0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/70 lg:px-7 ${
                  isActive
                    ? 'bg-fp-accent text-white shadow-[0_8px_22px_rgba(139,126,216,0.30)]'
                    : 'text-fp-muted hover:bg-white/[0.04] hover:text-fp-text'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:gap-3 md:flex-nowrap md:justify-end">
          <div className="hidden md:block">
            <CurrencyToggle
              currency={currency}
              currencyBusy={currencyBusy}
              onCurrencyChange={handleSetCurrency}
            />
          </div>

          {email ? (
            <span
              className="hidden max-w-[210px] truncate rounded-full border border-white/12 bg-black/18 px-4 py-2 text-sm font-medium text-fp-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] xl:inline"
              title={email}
            >
              {email}
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={busy}
            className="rounded-full border border-white/14 bg-black/22 px-5 py-2 text-sm font-semibold text-fp-text-secondary transition duration-200 hover:border-fp-accent/45 hover:bg-fp-accent/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Signing out' : 'Log out'}
          </button>
        </div>
      </div>

      <nav className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto border-t border-white/10 px-5 py-2 md:hidden sm:px-8">
        {links.map(({ href, label }) => {
          const isActive = pathname === href

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 ${
                isActive ? 'bg-fp-accent text-white' : 'text-fp-muted hover:bg-white/[0.04] hover:text-fp-text'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

function CurrencyToggle({
  currency,
  currencyBusy,
  onCurrencyChange,
}: {
  currency: DisplayCurrency
  currencyBusy: boolean
  onCurrencyChange: (currency: DisplayCurrency) => Promise<void>
}) {
  return (
    <div
      className="flex items-center rounded-full border border-white/16 bg-black/24 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
      aria-label="Display currency"
    >
      {currencies.map((displayCurrency) => {
        const isActive = currency === displayCurrency

        return (
          <button
            key={displayCurrency}
            type="button"
            disabled={currencyBusy}
            onClick={() => void onCurrencyChange(displayCurrency)}
            className={`rounded-full px-4 py-2 text-sm font-bold tracking-[0.02em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/70 disabled:opacity-60 ${
              isActive
                ? 'bg-fp-accent text-white shadow-[0_8px_22px_rgba(139,126,216,0.32)]'
                : 'text-fp-muted hover:text-fp-text'
            }`}
            aria-pressed={isActive}
          >
            {displayCurrency}
          </button>
        )
      })}
    </div>
  )
}
