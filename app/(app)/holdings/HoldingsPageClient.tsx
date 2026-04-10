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
        <h1 className="text-2xl font-semibold text-white">Holdings</h1>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={!initialWalletId}
          className="rounded-lg bg-fp-accent px-4 py-2 text-sm font-semibold text-[#0d0d14] hover:opacity-90 disabled:opacity-40"
        >
          Add holding
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-fp-surface p-4">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs text-zinc-500">Wallet</label>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-fp-accent"
            value={initialWalletId}
            onChange={(e) => selectWallet(e.target.value)}
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} · {formatMoney(walletValues[w.id] ?? 0, currency, usdToCad)}
              </option>
            ))}
          </select>
          {initialWalletId ? (
            <p className="mt-1.5 text-xs tabular-nums text-zinc-500">
              Wallet value{' '}
              <span className="font-medium text-zinc-300">
                {formatMoney(walletValues[initialWalletId] ?? 0, currency, usdToCad)}
              </span>
            </p>
          ) : null}
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
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Rename
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void deleteWallet(currentWallet.id)}
              className="rounded-lg border border-fp-negative/40 px-3 py-2 text-sm text-fp-negative hover:bg-fp-negative/10"
            >
              Delete wallet
            </button>
          </div>
        ) : null}
        <form onSubmit={createWallet} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-zinc-500">New wallet</label>
            <input
              value={newWalletName}
              onChange={(e) => setNewWalletName(e.target.value)}
              placeholder="Name"
              className="mt-1 w-40 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-fp-accent"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !newWalletName.trim()}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-40"
          >
            Create
          </button>
        </form>
      </div>

      {renameId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={saveRename}
            className="w-full max-w-sm rounded-xl border border-white/10 bg-[#16161f] p-5 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-white">Rename wallet</h3>
            <input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameId(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-fp-accent px-3 py-1.5 text-sm font-semibold text-[#0d0d14]"
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
