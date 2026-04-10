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
        <h1 className="text-[20px] font-semibold text-fp-text">Watchlist</h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-fp-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Add symbol
        </button>
      </div>
      <WatchlistTable items={initialItems} onRemove={remove} />
      <AddWatchlistModal open={open} onClose={() => setOpen(false)} onDone={() => router.refresh()} />
    </div>
  )
}
