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
        <h1 className="font-bold text-white" style={{ fontSize: 18 }}>
          Holdings
        </h1>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={!initialWalletId}
          className="rounded-lg font-semibold text-white transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
          style={{
            background: '#7c6fd4',
            padding: '9px 20px',
            fontSize: 14,
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#8b7ed8'
            }
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#7c6fd4'
          }}
        >
          Add holding
        </button>
      </div>

      <div
        className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"
        style={{
          background: '#18181b',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
          padding: '20px 24px',
        }}
      >
        <div className="min-w-0 flex-1 space-y-3 sm:max-w-md">
          <label
            className="block font-medium uppercase"
            style={{ fontSize: 11, letterSpacing: '0.07em', color: '#52525b' }}
          >
            Wallet
          </label>
          <select
            className="w-full border font-medium outline-none transition-colors focus:ring-2 focus:ring-[#7c6fd4]/30"
            style={{
              background: '#0d0d0f',
              border: '1px solid #2e2e32',
              borderRadius: 8,
              color: '#e4e4e7',
              padding: '8px 12px',
              fontSize: 14,
            }}
            value={initialWalletId}
            onChange={(e) => selectWallet(e.target.value)}
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          {initialWalletId ? (
            <p className="text-[13px] tabular-nums" style={{ color: '#71717a' }}>
              Wallet value:{' '}
              <span style={{ color: '#e4e4e7', fontWeight: 500 }}>
                {formatMoney(walletValues[initialWalletId] ?? 0, currency, usdToCad)}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4 sm:items-end">
          {currentWallet ? (
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setRenameId(currentWallet.id)
                  setRenameName(currentWallet.name)
                }}
                className="border-0 bg-transparent p-0 text-[13px] font-medium transition-colors duration-150 disabled:opacity-50"
                style={{ color: '#7c6fd4' }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) (e.currentTarget as HTMLButtonElement).style.color = '#9b8ee0'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#7c6fd4'
                }}
              >
                Rename
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteWallet(currentWallet.id)}
                className="border-0 bg-transparent p-0 text-[13px] font-medium transition-colors duration-150 disabled:opacity-50"
                style={{ color: '#f87171' }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#f87171'
                }}
              >
                Delete wallet
              </button>
            </div>
          ) : null}
          <form
            onSubmit={createWallet}
            className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end sm:justify-end"
          >
            <div className="w-full min-w-[200px] sm:w-auto">
              <label
                className="mb-1.5 block font-medium uppercase"
                style={{ fontSize: 11, letterSpacing: '0.07em', color: '#52525b' }}
              >
                New wallet name
              </label>
              <input
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                placeholder="New wallet name"
                className="w-full border outline-none transition-colors focus:ring-2 focus:ring-[#7c6fd4]/30 sm:w-52"
                style={{
                  background: '#0d0d0f',
                  border: '1px solid #2e2e32',
                  borderRadius: 8,
                  color: '#e4e4e7',
                  padding: '8px 12px',
                  fontSize: 14,
                }}
              />
            </div>
            <button
              type="submit"
              disabled={busy || !newWalletName.trim()}
              className="shrink-0 rounded-lg font-semibold text-white transition-opacity duration-150 disabled:opacity-40"
              style={{
                background: '#7c6fd4',
                padding: '8px 16px',
                fontSize: 14,
              }}
            >
              Create
            </button>
          </form>
        </div>
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
