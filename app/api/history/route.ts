import { createClient } from '@/lib/supabase/server'
import { getSparkline7d } from '@/lib/pricesHistory'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const assetType = searchParams.get('asset_type') as 'crypto' | 'stock' | null
  if (!symbol || (assetType !== 'crypto' && assetType !== 'stock')) {
    return NextResponse.json({ error: 'symbol and asset_type required' }, { status: 400 })
  }

  const data = await getSparkline7d(symbol, assetType)
  return NextResponse.json({ data })
}
