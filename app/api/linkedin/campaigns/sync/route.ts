import { NextRequest, NextResponse } from 'next/server'
import { syncLinkedInAnalytics } from '@/lib/linkedin-analytics'

// POST /api/linkedin/campaigns/sync
// POST /api/linkedin/campaigns/sync?accountId=X
// Forces a call to LinkedIn adAnalyticsV2 and writes the results onto linkedin_campaigns.
// Returns a structured result so the UI can show "synced N, skipped M, error: ..." directly.
export async function POST(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId')
  const result = await syncLinkedInAnalytics(accountId)
  const status = result.error ? 502 : 200
  return NextResponse.json(result, { status })
}
