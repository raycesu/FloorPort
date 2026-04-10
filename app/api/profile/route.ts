import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED = new Set(['USD', 'CAD'])

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('preferred_currency')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const preferred_currency = data?.preferred_currency === 'CAD' ? 'CAD' : 'USD'
  return NextResponse.json({ preferred_currency })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { preferred_currency?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const c = String(body.preferred_currency ?? '').toUpperCase()
  if (!ALLOWED.has(c)) {
    return NextResponse.json({ error: 'preferred_currency must be USD or CAD' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ preferred_currency: c })
    .eq('id', user.id)
    .select('preferred_currency')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ preferred_currency: data?.preferred_currency ?? c })
}
