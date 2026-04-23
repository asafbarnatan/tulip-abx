import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generatePositioningBrief } from '@/lib/brief-generator'

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    // Fetch account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Fetch contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('account_id', accountId)

    // Fetch recent signals
    const { data: signals } = await supabase
      .from('signals')
      .select('content, signal_type')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(5)

    const recentSignals = signals?.map(s => `[${s.signal_type.toUpperCase()}] ${s.content}`) ?? []

    // Generate brief via Claude
    const briefData = await generatePositioningBrief({
      account,
      contacts: contacts ?? [],
      recentSignals,
    })

    // Save to database
    const { data: savedBrief, error: saveError } = await supabase
      .from('positioning_briefs')
      .insert({
        account_id: accountId,
        positioning_statement: briefData.positioning_statement,
        core_message: briefData.core_message,
        persona_messages: briefData.persona_messages,
        proof_points: briefData.proof_points,
        objection_handlers: briefData.objection_handlers,
        recommended_tone: briefData.recommended_tone,
        key_themes: briefData.key_themes,
        approved: false,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      return NextResponse.json({ error: 'Failed to save brief', details: saveError.message }, { status: 500 })
    }

    return NextResponse.json({ brief: savedBrief })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Brief generation failed', details: message }, { status: 500 })
  }
}
