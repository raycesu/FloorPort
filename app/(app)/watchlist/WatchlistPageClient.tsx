'use client'

import type { WatchlistItem } from '@/types'
import { AddWatchlistModal } from '@/components/AddWatchlistModal'
import { WatchlistTable } from '@/components/WatchlistTable'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function WatchlistPageClient({ initialItems }: { initialItems: WatchlistItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function remove(id: string) {
    const res = await fetch(`/api/watchlist?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Watchlist</h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-fp-accent/50 px-4 py-2 text-sm font-semibold text-fp-accent hover:bg-fp-accent/10"
        >
          Add symbol
        </button>
      </div>
      <WatchlistTable items={initialItems} onRemove={remove} />
      <AddWatchlistModal open={open} onClose={() => setOpen(false)} onDone={() => router.refresh()} />
    </div>
  )
}
