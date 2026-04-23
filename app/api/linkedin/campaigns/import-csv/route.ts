import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// Parse one CSV row, handling quoted fields with commas inside them.
function parseCsvRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells.map(c => c.trim())
}

// Normalize header names for flexible column matching.
// LinkedIn exports use slightly different names depending on which report type.
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Find the index of a column by a set of possible normalized names.
function findCol(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader)
  for (const c of candidates) {
    const idx = normalized.indexOf(normalizeHeader(c))
    if (idx !== -1) return idx
  }
  return -1
}

function toNumber(s: string): number {
  if (!s) return 0
  // Strip currency symbols, commas, spaces
  const cleaned = s.replace(/[$,€£¥\s]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

// Extract the numeric campaign ID from either a bare ID or a URN like "urn:li:sponsoredCampaign:123"
function extractCampaignId(raw: string): string {
  const trimmed = (raw ?? '').trim().replace(/^"|"$/g, '')
  const urnMatch = trimmed.match(/urn:li:sponsoredCampaign:(\d+)/)
  if (urnMatch) return urnMatch[1]
  const numMatch = trimmed.match(/^\d+$/)
  if (numMatch) return trimmed
  return trimmed
}

export async function POST(request: NextRequest) {
  const { csv } = await request.json()
  if (typeof csv !== 'string' || !csv.trim()) {
    return NextResponse.json({ error: 'Paste CSV content in the "csv" field.' }, { status: 400 })
  }

  // Split into lines, skip empty rows
  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) {
    return NextResponse.json({ error: 'CSV needs at least a header row and one data row.' }, { status: 400 })
  }

  // Find the row that looks like a header (contains "campaign" in any cell)
  let headerIndex = 0
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cells = parseCsvRow(lines[i])
    if (cells.some(c => /campaign/i.test(c))) {
      headerIndex = i
      break
    }
  }

  const headers = parseCsvRow(lines[headerIndex])

  const idColIdx = findCol(headers, ['Campaign ID', 'CampaignID', 'Campaign Id', 'campaign_id'])
  const impColIdx = findCol(headers, ['Impressions', 'Total Impressions'])
  const clkColIdx = findCol(headers, ['Clicks', 'Total Clicks'])
  const spendColIdx = findCol(headers, ['Total Spent', 'Total Spent (USD)', 'Total Spent in Account Currency', 'Amount Spent', 'Cost', 'Spend', 'Total Amount Spent'])
  const leadsColIdx = findCol(headers, ['Leads', 'Total Leads', 'Lead Gen Form Completions'])

  if (idColIdx === -1) {
    return NextResponse.json({
      error: 'Could not find a "Campaign ID" column in the CSV. LinkedIn Campaign Manager → Analytics → Export should include this column.',
      headers_found: headers,
    }, { status: 400 })
  }

  // Pre-fetch all campaigns to match by linkedin_campaign_id
  const sb = getSupabase()
  const { data: campaigns, error: fetchErr } = await sb
    .from('linkedin_campaigns')
    .select('id, linkedin_campaign_id, campaign_name')
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const byLinkedInId = new Map<string, { id: string; campaign_name: string }>()
  for (const c of campaigns ?? []) {
    if (c.linkedin_campaign_id) byLinkedInId.set(String(c.linkedin_campaign_id), { id: c.id, campaign_name: c.campaign_name })
  }

  const matched: Array<{ linkedin_campaign_id: string; campaign_name: string; impressions: number; clicks: number; cost_usd: number; leads: number }> = []
  const not_found: string[] = []
  const errors: string[] = []

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i])
    if (cells.length < headers.length - 2) continue // row too short, likely a footer
    const linkedinId = extractCampaignId(cells[idColIdx])
    if (!linkedinId || !/^\d+$/.test(linkedinId)) continue // not a campaign row

    const match = byLinkedInId.get(linkedinId)
    if (!match) {
      not_found.push(linkedinId)
      continue
    }

    const impressions = impColIdx >= 0 ? toNumber(cells[impColIdx]) : 0
    const clicks = clkColIdx >= 0 ? toNumber(cells[clkColIdx]) : 0
    const cost_usd = spendColIdx >= 0 ? toNumber(cells[spendColIdx]) : 0
    const leads = leadsColIdx >= 0 ? toNumber(cells[leadsColIdx]) : 0

    const { error: updateErr } = await sb
      .from('linkedin_campaigns')
      .update({
        impressions,
        clicks,
        cost_usd,
        leads,
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id)

    if (updateErr) {
      errors.push(`${match.campaign_name}: ${updateErr.message}`)
    } else {
      matched.push({ linkedin_campaign_id: linkedinId, campaign_name: match.campaign_name, impressions, clicks, cost_usd, leads })
    }
  }

  return NextResponse.json({
    matched_count: matched.length,
    not_found_count: not_found.length,
    errors_count: errors.length,
    matched,
    not_found,
    errors,
    columns_detected: {
      campaign_id: idColIdx >= 0 ? headers[idColIdx] : null,
      impressions: impColIdx >= 0 ? headers[impColIdx] : null,
      clicks: clkColIdx >= 0 ? headers[clkColIdx] : null,
      spend: spendColIdx >= 0 ? headers[spendColIdx] : null,
      leads: leadsColIdx >= 0 ? headers[leadsColIdx] : null,
    },
  })
}
