import { createClient } from '@/lib/supabase/server'
import { getLivePrices, type PriceKey } from '@/lib/prices'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { holdings?: PriceKey[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const holdings = body.holdings ?? []
  if (!Array.isArray(holdings)) {
    return NextResponse.json({ error: 'holdings must be an array' }, { status: 400 })
  }

  const prices = await getLivePrices(holdings)
  return NextResponse.json({ prices })
}
