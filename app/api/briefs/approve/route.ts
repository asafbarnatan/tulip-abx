import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { briefId, approved } = await request.json()

  const { data, error } = await supabase
    .from('positioning_briefs')
    .update({ approved })
    .eq('id', briefId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ brief: data })
}
