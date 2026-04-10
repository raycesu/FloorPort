import { TransactionsTable } from '@/components/TransactionsTable'
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Transactions</h1>
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-fp-surface py-16 text-center text-sm text-zinc-500">
          No transactions yet. Add a holding or edit quantity to create history.
        </div>
      ) : (
        <TransactionsTable list={list} />
      )}
    </div>
  )
}
