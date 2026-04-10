'use client'

import { AddHoldingModal } from '@/components/AddHoldingModal'
import { HoldingsTable } from '@/components/HoldingsTable'
import type { Holding } from '@/types'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DashboardHoldings({
  initialHoldings,
  defaultWalletId,
}: {
  initialHoldings: Holding[]
  defaultWalletId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Holdings</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!defaultWalletId}
          className="rounded-lg bg-fp-accent px-4 py-2 text-sm font-semibold text-[#0d0d14] hover:opacity-90 disabled:opacity-40"
        >
          Add holding
        </button>
      </div>
      <HoldingsTable holdings={initialHoldings} showActions={false} showChart />
      <AddHoldingModal
        open={open}
        walletId={defaultWalletId}
        onClose={() => setOpen(false)}
        onDone={() => router.refresh()}
      />
    </section>
  )
}
