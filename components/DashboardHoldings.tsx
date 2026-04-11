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
        <h2 className="font-semibold" style={{ fontSize: '16px', color: '#e4e4e7' }}>
          Holdings
        </h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!defaultWalletId}
          className="rounded-lg px-[18px] py-2 text-sm font-semibold text-white transition-colors duration-150 disabled:opacity-40"
          style={{ background: '#7c6fd4' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#8b7ed8'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#7c6fd4'
          }}
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
