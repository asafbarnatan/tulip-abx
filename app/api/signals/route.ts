import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId')
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ signals: data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { account_id, signal_type, source, content, sentiment } = body

  const { data, error } = await supabase
    .from('signals')
    .insert({ account_id, signal_type, source, content, sentiment, processed: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ signal: data })
}
