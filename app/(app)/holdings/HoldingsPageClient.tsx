'use client'

import { AddHoldingModal } from '@/components/AddHoldingModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useDisplayCurrency } from '@/components/CurrencyContext'
import { EditHoldingModal } from '@/components/EditHoldingModal'
import { HoldingsTable } from '@/components/HoldingsTable'
import { ModalShell } from '@/components/ModalShell'
import { formatMoney } from '@/lib/format'
import type { Holding, Wallet } from '@/types'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

function WalletIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H5a2 2 0 0 0-2 2z" />
      <path d="M3 10a2 2 0 0 1 2-2h15a1 1 0 0 1 1 1v7a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2z" />
      <path d="M18 14h.01" />
    </svg>
  )
}

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

export function HoldingsPageClient({
  initialHoldings,
  wallets,
  initialWalletId,
  walletValues,
}: {
  initialHoldings: Holding[]
  wallets: Wallet[]
  initialWalletId: string
  walletValues: Record<string, number>
}) {
  const router = useRouter()
  const { currency, usdToCad } = useDisplayCurrency()
  const [addOpen, setAddOpen] = useState(false)
  const [editHolding, setEditHolding] = useState<Holding | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [newWalletName, setNewWalletName] = useState('')
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [walletActionError, setWalletActionError] = useState<string | null>(null)
  const [deleteHoldingTarget, setDeleteHoldingTarget] = useState<Holding | null>(null)
  const [deleteWalletTarget, setDeleteWalletTarget] = useState<Wallet | null>(null)
  const [busy, setBusy] = useState(false)

  const currentWallet = wallets.find((w) => w.id === initialWalletId) ?? null
  const currentWalletValue = formatMoney(walletValues[initialWalletId] ?? 0, currency, usdToCad)
  const nonCashHoldingsCount = useMemo(
    () => initialHoldings.filter((holding) => holding.asset_type !== 'cash').length,
    [initialHoldings]
  )

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-[0.01em] text-white">Holdings</h1>
          <p className="mt-2 max-w-2xl text-sm text-fp-muted">
            Manage each wallet cleanly, keep balances organized, and update positions without jumping through awkward prompts.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <section
          className="rounded-[28px] border border-fp-border bg-[linear-gradient(180deg,rgba(24,31,42,0.95)_0%,rgba(18,24,34,0.98)_100%)] p-6 shadow-[0_24px_60px_rgba(3,8,20,0.24)]"
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-fp-border bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">
                  <WalletIcon />
                  Active wallet
                </div>
                <h2 className="mt-4 text-[1.6rem] font-semibold tracking-[0.01em] text-fp-text">
                  {currentWallet?.name ?? 'No wallet selected'}
                </h2>
                <p className="mt-2 text-sm text-fp-muted">
                  Switch wallets, review the current value, and add new holdings from one place.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAddOpen(true)}
                disabled={!initialWalletId}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-fp-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(139,126,216,0.24)] transition hover:bg-fp-accent-hover disabled:opacity-40"
              >
                <PlusIcon />
                Add holding
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">
                  Wallet
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-fp-input-border bg-[#121722] px-4 py-3 text-sm font-medium text-fp-text outline-none transition focus:ring-2 focus:ring-[#7c6fd4]"
                  value={initialWalletId}
                  onChange={(e) => selectWallet(e.target.value)}
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-[22px] border border-fp-border bg-white/[0.03] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">Wallet value</p>
                <p className="mt-3 text-[1.5rem] font-semibold tracking-[0.01em] text-fp-text">{currentWalletValue}</p>
              </div>

              <div className="rounded-[22px] border border-fp-border bg-white/[0.03] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">Positions</p>
                <p className="mt-3 text-[1.5rem] font-semibold tracking-[0.01em] text-fp-text">{initialHoldings.length}</p>
                <p className="mt-2 text-xs text-fp-muted">{nonCashHoldingsCount} market positions</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-fp-border bg-[linear-gradient(180deg,rgba(24,31,42,0.95)_0%,rgba(18,24,34,0.98)_100%)] p-6 shadow-[0_24px_60px_rgba(3,8,20,0.24)]">
          <div className="flex h-full flex-col gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">Wallet actions</p>
              <h3 className="mt-3 text-lg font-semibold text-fp-text">Create, rename, or remove wallets</h3>
              <p className="mt-2 text-sm text-fp-muted">
                Keep names tidy and remove empty wallets once you no longer need them.
              </p>
            </div>

            <form onSubmit={createWallet} className="space-y-3 rounded-[22px] border border-fp-border bg-white/[0.03] p-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fp-muted">New wallet name</label>
                <input
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  placeholder="Enter wallet name"
                  className="mt-2 w-full"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !newWalletName.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-fp-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-fp-accent-hover disabled:opacity-50"
              >
                <PlusIcon />
                Create wallet
              </button>
            </form>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <button
                type="button"
                disabled={busy || !currentWallet}
                onClick={() => {
                  if (!currentWallet) return
                  setWalletActionError(null)
                  setRenameId(currentWallet.id)
                  setRenameName(currentWallet.name)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fp-border bg-white/[0.03] px-4 py-3 text-sm font-medium text-fp-text transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                <RenameIcon />
                Rename wallet
              </button>
              <button
                type="button"
                disabled={busy || !currentWallet}
                onClick={() => {
                  if (!currentWallet) return
                  setWalletActionError(null)
                  setDeleteWalletTarget(currentWallet)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.06)] px-4 py-3 text-sm font-medium text-[#ffcdcd] transition hover:bg-[rgba(248,113,113,0.12)] disabled:opacity-50"
              >
                <TrashIcon />
                Delete wallet
              </button>
            </div>

            {walletActionError ? (
              <div className="rounded-[20px] border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#ffcbcb]">
                {walletActionError}
              </div>
            ) : null}
          </div>
        </section>
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
