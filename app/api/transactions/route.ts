import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const holdingId = new URL(request.url).searchParams.get('holding_id')

  let qb = supabase.from('transactions').select('*')
  if (holdingId) {
    qb = qb.eq('holding_id', holdingId)
  }
  const { data, error } = await qb.order('executed_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}
