'use client'

import { AddHoldingModal } from '@/components/AddHoldingModal'
import { AllocationChart } from '@/components/AllocationChart'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useDisplayCurrency } from '@/components/CurrencyContext'
import { EditHoldingModal } from '@/components/EditHoldingModal'
import { HoldingsTable } from '@/components/HoldingsTable'
import { ModalShell } from '@/components/ModalShell'
import { PerformanceBars } from '@/components/PerformanceBars'
import { formatMoney, formatPercent } from '@/lib/format'
import type { Holding, PortfolioSummary, Wallet } from '@/types'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'

function PlusIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function RenameIcon() {
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
      <path d="m18 2 4 4" />
      <path d="m17 7 3-3" />
      <path d="M8 18H4a2 2 0 0 1-2-2v-4" />
      <path d="M16 8 4 20" />
      <path d="m16 8 4 4" />
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

function ChevronDownIcon({ isOpen }: { isOpen: boolean }) {
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
      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

const holdingsHeroTopStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1.25rem',
}

const holdingsActionsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '0.75rem',
}

const holdingsMetricsGridStyle: CSSProperties = {
  display: 'grid',
  alignItems: 'stretch',
  gap: '1.25rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
}

const holdingsStatsGridStyle: CSSProperties = {
  display: 'contents',
}

function SummaryStat({
  label,
  value,
  helper,
  tone = 'neutral',
  accent = false,
}: {
  label: string
  value: string
  helper?: string
  tone?: 'neutral' | 'positive' | 'negative'
  accent?: boolean
}) {
  const valueClassName =
    tone === 'positive'
      ? 'text-fp-positive'
      : tone === 'negative'
        ? 'text-[#f87171]'
        : 'text-fp-text'

  return (
    <div
      className={`flex min-h-[130px] flex-col justify-center rounded-[24px] border px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_42px_rgba(3,8,20,0.18)] sm:px-6 ${
        accent
          ? 'border-[#8b7ed8]/35 bg-[radial-gradient(circle_at_top,rgba(139,126,216,0.24),transparent_58%),linear-gradient(135deg,rgba(139,126,216,0.14),rgba(255,255,255,0.04))]'
          : 'border-fp-border bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))]'
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fp-muted">{label}</p>
      <p className={`mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[1.9rem] ${valueClassName}`}>
        {value}
      </p>
      {helper ? <p className="mt-1.5 text-sm tabular-nums text-fp-muted">{helper}</p> : null}
    </div>
  )
}

export function HoldingsPageClient({
  initialHoldings,
  wallets,
  initialWalletId,
  walletValues,
  walletSummary,
  performanceSeries,
}: {
  initialHoldings: Holding[]
  wallets: Wallet[]
  initialWalletId: string
  walletValues: Record<string, number>
  walletSummary: PortfolioSummary
  performanceSeries: { timestamp: number; value: number }[]
}) {
  const router = useRouter()
  const { currency, usdToCad } = useDisplayCurrency()
  const [addOpen, setAddOpen] = useState(false)
  const [editHolding, setEditHolding] = useState<Holding | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [createWalletOpen, setCreateWalletOpen] = useState(false)
  const [newWalletName, setNewWalletName] = useState('')
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [walletActionError, setWalletActionError] = useState<string | null>(null)
  const [deleteHoldingTarget, setDeleteHoldingTarget] = useState<Holding | null>(null)
  const [deleteWalletTarget, setDeleteWalletTarget] = useState<Wallet | null>(null)
  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const currentWallet = wallets.find((w) => w.id === initialWalletId) ?? null
  const currentWalletValue = formatMoney(walletValues[initialWalletId] ?? 0, currency, usdToCad)
  const currentWalletPnl = formatMoney(walletSummary.total_pnl, currency, usdToCad)
  const currentWalletPnlPercent = formatPercent(walletSummary.total_pnl_percent)
  const isWalletPnlPositive = walletSummary.total_pnl >= 0
  const walletOptions = useMemo(
    () =>
      wallets.map((wallet) => ({
        ...wallet,
        formattedValue: formatMoney(walletValues[wallet.id] ?? 0, currency, usdToCad),
      })),
    [currency, usdToCad, walletValues, wallets]
  )
  const selectedWalletOption = walletOptions.find((wallet) => wallet.id === initialWalletId) ?? null

  const handleWalletSwitcherBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget as Node | null
    if (nextFocusedElement && event.currentTarget.contains(nextFocusedElement)) return

    setWalletSwitcherOpen(false)
  }

  const handleWalletSwitcherKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return

    setWalletSwitcherOpen(false)
  }

  const handleWalletSwitcherButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    setWalletSwitcherOpen(true)
  }

  const handleWalletOptionSelect = (id: string) => {
    setWalletSwitcherOpen(false)
    selectWallet(id)
  }

  const handleWalletOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    handleWalletOptionSelect(id)
  }

  function openEdit(h: Holding) {
    setEditHolding(h)
    setEditOpen(true)
  }

  function selectWallet(id: string) {
    setWalletActionError(null)
    router.push(`/holdings?wallet=${encodeURIComponent(id)}`)
  }

  async function createWallet(e: React.FormEvent) {
    e.preventDefault()
    const name = newWalletName.trim()
    if (!name) return

    setBusy(true)
    setWalletActionError(null)
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const row = await res.json().catch(() => null)
      if (res.ok && row?.id) {
        setNewWalletName('')
        setCreateWalletOpen(false)
        router.push(`/holdings?wallet=${encodeURIComponent(row.id)}`)
        router.refresh()
        return
      }

      setWalletActionError(typeof row?.error === 'string' ? row.error : 'Could not create wallet.')
    } finally {
      setBusy(false)
    }
  }

  async function saveRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renameId) return
    const name = renameName.trim()
    if (!name) {
      setWalletActionError('Enter a name for the wallet.')
      return
    }

    setBusy(true)
    setWalletActionError(null)
    try {
      const res = await fetch('/api/wallets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: renameId, name }),
      })
      const payload = await res.json().catch(() => ({}))
      if (res.ok) {
        setRenameId(null)
        setRenameName('')
        router.refresh()
        return
      }

      setWalletActionError(typeof payload.error === 'string' ? payload.error : 'Could not rename wallet.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmHoldingDelete() {
    if (!deleteHoldingTarget) return

    setBusy(true)
    try {
      const res = await fetch(`/api/holdings?id=${encodeURIComponent(deleteHoldingTarget.id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDeleteHoldingTarget(null)
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  async function confirmWalletDelete() {
    if (!deleteWalletTarget) return

    setBusy(true)
    setWalletActionError(null)
    try {
      const res = await fetch(`/api/wallets?id=${encodeURIComponent(deleteWalletTarget.id)}`, {
        method: 'DELETE',
      })
      const payload = await res.json().catch(() => ({}))
      if (res.ok) {
        setDeleteWalletTarget(null)
        const next = wallets.find((wallet) => wallet.id !== deleteWalletTarget.id)
        if (next) router.push(`/holdings?wallet=${encodeURIComponent(next.id)}`)
        else router.push('/holdings')
        router.refresh()
        return
      }

      setWalletActionError(typeof payload.error === 'string' ? payload.error : 'Could not delete wallet.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8 lg:space-y-9">
      <section className="relative overflow-visible rounded-[32px] border border-fp-border bg-[radial-gradient(circle_at_top_left,rgba(139,126,216,0.18),transparent_34%),linear-gradient(180deg,rgba(24,31,42,0.98)_0%,rgba(14,19,29,0.99)_100%)] p-5 shadow-[0_28px_70px_rgba(3,8,20,0.34)] sm:p-7">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="relative space-y-6">
          <div className="fp-holdings-hero-top flex flex-col gap-5 md:flex-row md:items-start md:justify-between" style={holdingsHeroTopStyle}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fp-muted">Active wallet</p>
                <span className="rounded-full border border-[#8b7ed8]/30 bg-[#8b7ed8]/10 px-3 py-1 text-[11px] font-semibold text-[#d8d1ff]">
                  Live portfolio
                </span>
              </div>
              <h2 className="mt-3 truncate text-5xl font-semibold leading-tight tracking-[-0.04em] text-fp-text">
                {currentWallet?.name ?? 'No wallet selected'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-fp-muted">
                Manage wallet holdings, performance, and allocation from one focused workspace.
              </p>
            </div>

            <div className="fp-holdings-actions flex flex-wrap items-center gap-3 md:justify-end" style={holdingsActionsStyle}>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                disabled={!initialWalletId}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-fp-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(139,126,216,0.28)] transition hover:bg-fp-accent-hover disabled:opacity-40"
              >
                <PlusIcon />
                Add holding
              </button>
              <button
                type="button"
                onClick={() => {
                  setWalletActionError(null)
                  setCreateWalletOpen(true)
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-fp-border bg-white/[0.045] px-4 py-3 text-sm font-medium text-fp-text transition hover:border-[#8b7ed8]/40 hover:bg-white/[0.075]"
              >
                <PlusIcon />
                New wallet
              </button>
              <button
                type="button"
                disabled={busy || !currentWallet}
                onClick={() => {
                  if (!currentWallet) return
                  setWalletActionError(null)
                  setRenameId(currentWallet.id)
                  setRenameName(currentWallet.name)
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-fp-border bg-white/[0.045] px-4 py-3 text-sm font-medium text-fp-text transition hover:border-[#8b7ed8]/40 hover:bg-white/[0.075] disabled:opacity-50"
              >
                <RenameIcon />
                Rename
              </button>
              <button
                type="button"
                disabled={busy || !currentWallet}
                onClick={() => {
                  if (!currentWallet) return
                  setWalletActionError(null)
                  setDeleteWalletTarget(currentWallet)
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm font-medium text-[#ffcdcd] transition hover:bg-[rgba(248,113,113,0.14)] disabled:opacity-50"
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          </div>

          <div
            className="fp-holdings-metrics-grid grid gap-5 md:grid-cols-[minmax(280px,0.95fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-stretch"
            style={holdingsMetricsGridStyle}
          >
            <div
              className="relative z-40 rounded-[26px] border border-fp-border bg-[#111722] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5"
              onBlur={handleWalletSwitcherBlur}
              onKeyDown={handleWalletSwitcherKeyDown}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">
                Switch wallet
              </span>
              <button
                type="button"
                className={`mt-3 flex w-full items-center justify-between gap-4 rounded-[22px] border px-4 py-4 text-left outline-none transition ${
                  walletSwitcherOpen
                    ? 'border-[#8b7ed8] bg-[#171d2b] ring-2 ring-[#8b7ed8]/25'
                    : 'border-fp-input-border bg-[#0d1320] hover:border-[#8b7ed8]/60 hover:bg-[#151b29]'
                }`}
                aria-haspopup="listbox"
                aria-expanded={walletSwitcherOpen}
                onClick={() => setWalletSwitcherOpen((isOpen) => !isOpen)}
                onKeyDown={handleWalletSwitcherButtonKeyDown}
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold text-fp-text">
                    {selectedWalletOption?.name ?? 'Choose a wallet'}
                  </span>
                  <span className="mt-1 block text-sm tabular-nums text-fp-muted">
                    {selectedWalletOption?.formattedValue ?? 'No wallet value'}
                  </span>
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-fp-border bg-white/[0.05] text-fp-muted">
                  <ChevronDownIcon isOpen={walletSwitcherOpen} />
                </span>
              </button>

              {walletSwitcherOpen ? (
                <div
                  role="listbox"
                  aria-label="Wallets"
                  className="absolute left-4 right-4 z-50 mt-3 overflow-hidden rounded-[22px] border border-[#2b3446] bg-[#0b111d] p-2 shadow-[0_28px_80px_rgba(0,0,0,0.62)]"
                >
                  <div className="max-h-64 overflow-y-auto overscroll-contain pr-1">
                    {walletOptions.map((wallet) => {
                      const isSelected = wallet.id === initialWalletId

                      return (
                        <button
                          key={wallet.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleWalletOptionSelect(wallet.id)}
                          onKeyDown={(event) => handleWalletOptionKeyDown(event, wallet.id)}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left outline-none transition focus:ring-2 focus:ring-[#8b7ed8]/40 ${
                            isSelected ? 'bg-[#8b7ed8]/14' : 'hover:bg-white/[0.055]'
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${
                              isSelected ? 'bg-fp-accent' : 'bg-white/[0.14]'
                            } ${isSelected ? 'ring-[#8b7ed8]/15' : 'ring-transparent'}`}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-fp-text" title={wallet.name}>
                              {wallet.name}
                            </span>
                            <span className="mt-0.5 block text-xs tabular-nums text-fp-muted">
                              {wallet.formattedValue}
                            </span>
                          </span>
                          {isSelected ? (
                            <span className="rounded-full border border-[#8b7ed8]/25 bg-[#8b7ed8]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d8d1ff]">
                              Active
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="fp-holdings-stats-grid grid gap-4 sm:grid-cols-2 md:contents" style={holdingsStatsGridStyle}>
              <SummaryStat label="Wallet value" value={currentWalletValue} accent />
              <SummaryStat
                label="Total P/L"
                value={currentWalletPnl}
                helper={currentWalletPnlPercent}
                tone={isWalletPnlPositive ? 'positive' : 'negative'}
              />
            </div>
          </div>

        {walletActionError && !deleteWalletTarget ? (
          <div className="mt-5 rounded-[20px] border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#ffcbcb]">
            {walletActionError}
          </div>
        ) : null}
        </div>
      </section>

      <div className="grid items-stretch gap-6 md:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] xl:gap-8">
        <PerformanceBars
          series={performanceSeries}
          title="Wallet Performance"
          description={`${currentWallet?.name ?? 'Selected wallet'} value across the selected range`}
          apiQuery={{ wallet_id: initialWalletId }}
        />
        <AllocationChart
          holdings={initialHoldings}
          title="Holdings Allocation"
          description="Current wallet value by asset"
        />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">Wallet holdings</p>
            <h2 className="mt-2 text-lg font-semibold text-fp-text">
              {currentWallet ? `${currentWallet.name} assets` : 'Assets'}
            </h2>
          </div>
          <p className="text-sm text-fp-muted">
            {initialHoldings.length === 0
              ? 'No positions in this wallet yet.'
              : `${initialHoldings.length} holding${initialHoldings.length === 1 ? '' : 's'} in this wallet.`}
          </p>
        </div>

        <HoldingsTable
          holdings={initialHoldings}
          showActions
          onEdit={openEdit}
          onDelete={(holding) => setDeleteHoldingTarget(holding)}
        />
      </section>

      <ModalShell
        open={createWalletOpen}
        onClose={() => {
          setCreateWalletOpen(false)
          setNewWalletName('')
        }}
        title="New wallet"
        description="Create a wallet, then add holdings when you're ready."
        widthClassName="max-w-md"
      >
        <form onSubmit={createWallet} className="space-y-5">
          <div>
            <label className="text-xs font-medium uppercase tracking-[0.08em] text-fp-muted">Wallet name</label>
            <input
              value={newWalletName}
              onChange={(e) => setNewWalletName(e.target.value)}
              placeholder="Enter wallet name"
              className="mt-2 w-full"
              autoFocus
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setCreateWalletOpen(false)
                setNewWalletName('')
              }}
              className="rounded-2xl border border-fp-border bg-transparent px-5 py-3 text-sm font-medium text-fp-text-secondary transition hover:bg-white/[0.04]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !newWalletName.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-fp-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-fp-accent-hover disabled:opacity-50"
            >
              <PlusIcon />
              {busy ? 'Creating…' : 'Create wallet'}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={Boolean(renameId)}
        onClose={() => {
          setRenameId(null)
          setRenameName('')
        }}
        title="Rename wallet"
        description="Choose a clearer label for this wallet. The rename updates everywhere this wallet appears."
        widthClassName="max-w-md"
      >
        <form onSubmit={saveRename} className="space-y-5">
          <div>
            <label className="text-xs font-medium uppercase tracking-[0.08em] text-fp-muted">Wallet name</label>
            <input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              className="mt-2 w-full"
              autoFocus
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setRenameId(null)
                setRenameName('')
              }}
              className="rounded-2xl border border-fp-border bg-transparent px-5 py-3 text-sm font-medium text-fp-text-secondary transition hover:bg-white/[0.04]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-2xl bg-fp-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-fp-accent-hover disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </form>
      </ModalShell>

      <ConfirmDialog
        open={Boolean(deleteHoldingTarget)}
        title={deleteHoldingTarget ? `Delete ${deleteHoldingTarget.symbol}?` : 'Delete holding?'}
        description={
          deleteHoldingTarget && currentWallet
            ? `${deleteHoldingTarget.name || deleteHoldingTarget.symbol} will be removed from ${currentWallet.name}. This does not delete the wallet itself.`
            : 'This holding will be removed from the current wallet.'
        }
        confirmLabel="Delete holding"
        tone="danger"
        loading={busy}
        onCancel={() => setDeleteHoldingTarget(null)}
        onConfirm={confirmHoldingDelete}
      />

      <ConfirmDialog
        open={Boolean(deleteWalletTarget)}
        title={deleteWalletTarget ? `Delete ${deleteWalletTarget.name}?` : 'Delete wallet?'}
        description={
          deleteWalletTarget
            ? `${deleteWalletTarget.name} can only be deleted if it has no holdings left. If the wallet still contains assets, we will keep it and show the reason here.`
            : 'Wallets can only be deleted when they are empty.'
        }
        confirmLabel="Delete wallet"
        tone="danger"
        loading={busy}
        error={deleteWalletTarget ? walletActionError : null}
        onCancel={() => {
          setDeleteWalletTarget(null)
          setWalletActionError(null)
        }}
        onConfirm={confirmWalletDelete}
      />

      <AddHoldingModal
        open={addOpen}
        walletId={initialWalletId}
        walletName={currentWallet?.name}
        onClose={() => setAddOpen(false)}
        onDone={() => router.refresh()}
      />

      <EditHoldingModal
        holding={editHolding}
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditHolding(null)
        }}
        onDone={() => router.refresh()}
      />
    </div>
  )
}
