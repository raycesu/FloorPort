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
    <header
      className="sticky top-0 z-40 bg-fp-nav"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center px-8 gap-8">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center transition-opacity hover:opacity-85"
        >
          <Image
            src="/floorport-logo-v2.png"
            alt="FloorPort"
            width={707}
            height={353}
            className="h-10 w-auto max-h-full"
            priority
          />
        </Link>

        {/* Desktop nav — centered */}
        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex">
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="relative pb-0.5 text-sm font-medium transition-colors duration-150"
                style={{
                  color: active ? '#7c6fd4' : '#71717a',
                  borderBottom: active ? '2px solid #7c6fd4' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLAnchorElement).style.color = '#e4e4e7'
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLAnchorElement).style.color = '#71717a'
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4 ml-auto md:ml-0">
          {/* Segmented currency toggle */}
          <div
            className="flex items-center rounded-full p-0.5 relative"
            style={{
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {(['USD', 'CAD'] as DisplayCurrency[]).map((c) => (
              <button
                key={c}
                type="button"
                disabled={currencyBusy}
                onClick={() => void setCurrency(c)}
                className="relative z-10 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 disabled:opacity-60"
                style={{
                  background: currency === c ? '#7c6fd4' : 'transparent',
                  color: currency === c ? '#ffffff' : '#71717a',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Email */}
          <span
            className="hidden max-w-[160px] truncate sm:inline"
            style={{ color: '#52525b', fontSize: '13px' }}
            title={email ?? ''}
          >
            {email}
          </span>

          {/* Log out */}
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={busy}
            className="text-sm font-medium transition-colors duration-150 disabled:opacity-40"
            style={{ color: '#52525b', background: 'none', border: 'none' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = '#e4e4e7'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = '#52525b'
            }}
          >
            {busy ? '…' : 'Log out'}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav
        className="flex min-h-11 gap-6 overflow-x-auto px-8 py-2 md:hidden"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {links.map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="shrink-0 pb-0.5 text-sm font-medium"
              style={{
                color: active ? '#7c6fd4' : '#71717a',
                borderBottom: active ? '2px solid #7c6fd4' : '2px solid transparent',
              }}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
