'use client'

import { AddHoldingModal } from '@/components/AddHoldingModal'
import { useDisplayCurrency } from '@/components/CurrencyContext'
import { EditHoldingModal } from '@/components/EditHoldingModal'
import { HoldingsTable } from '@/components/HoldingsTable'
import { formatMoney } from '@/lib/format'
import type { Holding, Wallet } from '@/types'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
  const [busy, setBusy] = useState(false)

  async function handleDelete(h: Holding) {
    if (!window.confirm(`Remove ${h.symbol} and its transaction history for this holding?`)) return
    const res = await fetch(`/api/holdings?id=${encodeURIComponent(h.id)}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  function openEdit(h: Holding) {
    setEditHolding(h)
    setEditOpen(true)
  }

  function selectWallet(id: string) {
    router.push(`/holdings?wallet=${encodeURIComponent(id)}`)
  }

  async function createWallet(e: React.FormEvent) {
    e.preventDefault()
    const name = newWalletName.trim()
    if (!name) return
    setBusy(true)
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
      }
    } finally {
      setBusy(false)
    }
  }

  async function saveRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renameId) return
    const name = renameName.trim()
    if (!name) return
    setBusy(true)
    try {
      const res = await fetch('/api/wallets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: renameId, name }),
      })
      if (res.ok) {
        setRenameId(null)
        setRenameName('')
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  async function deleteWallet(id: string) {
    if (!window.confirm('Delete this wallet? It must have no holdings.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/wallets?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (res.ok) {
        const next = wallets.find((w) => w.id !== id)
        if (next) router.push(`/holdings?wallet=${encodeURIComponent(next.id)}`)
        else router.push('/holdings')
        router.refresh()
      } else {
        const j = await res.json().catch(() => ({}))
        alert(typeof j.error === 'string' ? j.error : 'Could not delete wallet')
      }
    } finally {
      setBusy(false)
    }
  }

  const currentWallet = wallets.find((w) => w.id === initialWalletId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-fp-text">Holdings</h1>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={!initialWalletId}
          className="rounded-lg bg-fp-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Add holding
        </button>
      </div>

      <div className="rounded-xl border border-fp-border bg-fp-surface p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="text-xs text-fp-muted">Wallet</label>
            <select
              className="mt-1 h-9 w-full rounded-lg border border-fp-border bg-fp-surface px-3 text-sm"
              value={initialWalletId}
              onChange={(e) => selectWallet(e.target.value)}
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          {currentWallet ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setRenameId(currentWallet.id)
                  setRenameName(currentWallet.name)
                }}
                className="rounded-lg border border-transparent bg-transparent px-3 py-2 text-xs font-medium text-fp-muted hover:border-fp-border hover:text-fp-text"
              >
                Rename
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteWallet(currentWallet.id)}
                className="rounded-lg border border-transparent bg-transparent px-3 py-2 text-xs font-medium text-fp-negative hover:border-fp-negative"
              >
                Delete wallet
              </button>
            </div>
          ) : null}
          <form onSubmit={createWallet} className="ml-auto flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs text-fp-muted">New wallet name</label>
              <input
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                placeholder="Name"
                className="mt-1 h-9 w-44 rounded-lg border border-fp-input-border bg-fp-surface px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !newWalletName.trim()}
              className="h-9 rounded-lg bg-fp-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Create
            </button>
          </form>
        </div>
        {initialWalletId ? (
          <p className="mt-2 text-[13px] tabular-nums text-fp-muted">
            Wallet value:{' '}
            <span className="font-medium text-fp-text">
              {formatMoney(walletValues[initialWalletId] ?? 0, currency, usdToCad)}
            </span>
          </p>
        ) : null}
      </div>

      {renameId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={saveRename}
            className="w-full max-w-sm rounded-xl border border-fp-border bg-fp-surface p-6"
          >
            <h3 className="text-sm font-semibold text-fp-text">Rename wallet</h3>
            <input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              className="mt-3 w-full"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameId(null)}
                className="rounded-lg border border-fp-border bg-transparent px-5 py-2.5 text-sm text-fp-muted hover:bg-fp-page"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-fp-accent px-5 py-2.5 text-sm font-medium text-white"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <HoldingsTable
        holdings={initialHoldings}
        showActions
        showChart
        onEdit={openEdit}
        onDelete={handleDelete}
      />
      <AddHoldingModal
        open={addOpen}
        walletId={initialWalletId}
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
