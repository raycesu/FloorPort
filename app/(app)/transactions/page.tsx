import { TransactionsPageClient } from './TransactionsPageClient'
import { mapRowToTransaction } from '@/lib/mappers'
import { createClient } from '@/lib/supabase/server'
import type { Transaction } from '@/types'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('transactions')
    .select('*')
    .order('executed_at', { ascending: false })

  const list: Transaction[] = (rows ?? []).map((r) => mapRowToTransaction(r as Record<string, unknown>))

  if (list.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-[20px] font-semibold text-fp-text">Transactions</h1>
        <div className="rounded-xl border border-dashed border-fp-border bg-fp-surface py-16 text-center text-sm text-fp-muted">
          No transactions yet. Add a holding or edit quantity to create history.
        </div>
      </div>
    )
  }

  return <TransactionsPageClient initialList={list} />
}
