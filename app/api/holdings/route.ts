import { parseAssetType, FIAT_ALLOWLIST } from '@/lib/assetValidation'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const walletId = new URL(request.url).searchParams.get('wallet_id')

  let q = supabase.from('holdings').select('*').eq('user_id', user.id).order('added_at', { ascending: false })
  if (walletId) {
    q = q.eq('wallet_id', walletId)
  }

  const { data, error } = await q

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const wallet_id = String(body.wallet_id ?? '').trim()
  const symbol = String(body.symbol ?? '')
    .trim()
    .toUpperCase()
  const name = String(body.name ?? '').trim()
  const asset_type = parseAssetType(body.asset_type)
  const quantity = parseNum(body.quantity)
  const avg_buy_price = parseNum(body.avg_buy_price)
  const coingecko_id =
    body.coingecko_id != null && String(body.coingecko_id).trim() !== ''
      ? String(body.coingecko_id).trim()
      : null

  if (!wallet_id) {
    return NextResponse.json({ error: 'wallet_id is required' }, { status: 400 })
  }

  const { data: walletRow, error: walletErr } = await supabase
    .from('wallets')
    .select('id')
    .eq('id', wallet_id)
    .eq('user_id', user.id)
    .single()

  if (walletErr || !walletRow) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  if (!symbol || !name || !asset_type) {
    return NextResponse.json({ error: 'Invalid holding fields' }, { status: 400 })
  }

  if (asset_type === 'cash') {
    if (!FIAT_ALLOWLIST.has(symbol)) {
      return NextResponse.json({ error: 'Unsupported fiat currency' }, { status: 400 })
    }
    if (quantity == null || quantity <= 0 || avg_buy_price == null || avg_buy_price < 0) {
      return NextResponse.json({ error: 'Invalid cash balance' }, { status: 400 })
    }
  } else {
    if (quantity == null || quantity <= 0 || avg_buy_price == null || avg_buy_price < 0) {
      return NextResponse.json({ error: 'Invalid holding fields' }, { status: 400 })
    }
  }

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    wallet_id,
    symbol,
    name,
    asset_type,
    quantity,
    avg_buy_price,
  }
  if (asset_type === 'crypto' && coingecko_id) {
    insertPayload.coingecko_id = coingecko_id
  }

  const { data: holding, error: insertErr } = await supabase
    .from('holdings')
    .insert(insertPayload)
    .select()
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'You already have a holding for this symbol in this wallet' }, { status: 409 })
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json(holding)
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const id = String(body.id ?? '')
  const newQty = parseNum(body.quantity)
  const newAvg = parseNum(body.avg_buy_price)

  if (!id || newQty == null || newQty <= 0 || newAvg == null || newAvg < 0) {
    return NextResponse.json(
      { error: 'Quantity must be positive, or delete the holding to remove it' },
      { status: 400 }
    )
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('holdings')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Holding not found' }, { status: 404 })
  }

  const { data: updated, error: upErr } = await supabase
    .from('holdings')
    .update({ quantity: newQty, avg_buy_price: newAvg })
    .eq('id', id)
    .select()
    .single()

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = new URL(request.url).searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const { data: deletedRows, error } = await supabase
    .from('holdings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!deletedRows?.length) {
    return NextResponse.json({ error: 'Holding not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
