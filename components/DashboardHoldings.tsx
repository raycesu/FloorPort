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
        <h2 className="font-bold text-white" style={{ fontSize: 18 }}>
          Holdings
        </h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!defaultWalletId}
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
