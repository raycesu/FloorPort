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
        <div>
          <h2 className="font-bold text-white" style={{ fontSize: 18 }}>
            Holdings
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: '#93a0b4' }}>
            Portfolio-wide positions grouped by asset
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!defaultWalletId}
          className="rounded-lg font-semibold text-white transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
          style={{
            background: '#8b7ed8',
            padding: '10px 20px',
            fontSize: 14,
            boxShadow: '0 12px 24px rgba(139,126,216,0.24)',
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#978ae3'
            }
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#8b7ed8'
          }}
        >
          Add holding
        </button>
      </div>
      <HoldingsTable holdings={initialHoldings} showActions={false} />
      <AddHoldingModal
        open={open}
        walletId={defaultWalletId}
        onClose={() => setOpen(false)}
        onDone={() => router.refresh()}
      />
    </section>
  )
}
