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

  // LinkedIn Campaign Manager exports CSVs as UTF-16 LE with a BOM, and its
  // "Ad Performance Report" is tab-separated, not comma-separated. The first
  // 4 lines are metadata ("Ad Performance Report", "Report Start: …", …) with
  // no tabs, so we have to scan further to detect the real delimiter. If ANY
  // line in the first 20 contains a tab but no comma, treat the whole file as
  // TSV and rewrite to CSV.
  let normalized = csv.replace(/^﻿/, '')
  const firstLines = normalized.split(/\r?\n/).slice(0, 20)
  const looksTabDelimited = firstLines.some(l => l.includes('\t')) && !firstLines.some(l => /^[^\t]*,[^\t]*,[^\t]*,/.test(l))
  if (looksTabDelimited) {
    // Split each line on tabs and rejoin with commas, quoting any cell that
    // contains a comma, quote, or newline. Lines with no tab (metadata header
    // rows) pass through unchanged.
    normalized = normalized.split(/\r?\n/).map(line => {
      if (!line.includes('\t')) return line
      return line.split('\t').map(cell => {
        if (/[",\n\r]/.test(cell)) return '"' + cell.replace(/"/g, '""') + '"'
        return cell
      }).join(',')
    }).join('\n')
  }

  // Split into lines, skip empty rows
  const lines = normalized.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
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
  // LinkedIn's hierarchy: Campaign > Ad Set > Ad. The ID we actually store in
  // linkedin_campaign_id is the AD SET ID (what adAnalyticsV2 returns when you
  // query a Sponsored Update campaign). The CSV export labels the parent as
  // "Campaign ID" and the thing we track as "Ad Set ID" — so we must try both.
  const adSetColIdx = findCol(headers, ['Ad Set ID', 'AdSetID', 'Ad Set Id', 'ad_set_id'])
  const impColIdx = findCol(headers, ['Impressions', 'Total Impressions'])
  const clkColIdx = findCol(headers, ['Clicks', 'Total Clicks'])
  const spendColIdx = findCol(headers, ['Total Spent', 'Total Spent (USD)', 'Total Spent in Account Currency', 'Amount Spent', 'Cost', 'Spend', 'Total Amount Spent'])
  const leadsColIdx = findCol(headers, ['Leads', 'Total Leads', 'Lead Gen Form Completions'])
  // Engagement is LinkedIn's "Total Engagements" column on the Ad Performance
  // report (reactions + comments + shares + follows + other clicks). Absent
  // on older exports — falls back to 0.
  const engagementsColIdx = findCol(headers, ['Total Engagements', 'Total Engagement', 'Engagements', 'Engagement'])

  if (idColIdx === -1 && adSetColIdx === -1) {
    return NextResponse.json({
      error: 'Could not find a "Campaign ID" or "Ad Set ID" column in the CSV. LinkedIn Campaign Manager → Analytics → Export should include at least one of these columns.',
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

  const matched: Array<{ linkedin_campaign_id: string; campaign_name: string; impressions: number; clicks: number; cost_usd: number; leads: number; total_engagements: number }> = []
  const not_found: string[] = []
  const errors: string[] = []

  // LinkedIn's Ad Performance Report partitions by day: a single ad running
  // for 5 days produces 5 rows. Earlier versions of this endpoint wrote each
  // row directly, so the last row's metrics clobbered the sum. Accumulate
  // into a per-campaign bucket and write ONCE at the end.
  type Bucket = { match: { id: string; campaign_name: string }; linkedinId: string; impressions: number; clicks: number; cost_usd: number; leads: number; engagements: number; rowCount: number }
  const buckets = new Map<string, Bucket>()

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i])
    if (cells.length < headers.length - 2) continue // row too short, likely a footer

    // Try Campaign ID first (cheaper — it's the column most users think of),
    // then fall back to Ad Set ID which is what our DB actually stores.
    const campaignIdFromCsv = idColIdx >= 0 ? extractCampaignId(cells[idColIdx]) : ''
    const adSetIdFromCsv = adSetColIdx >= 0 ? extractCampaignId(cells[adSetColIdx]) : ''
    const candidates = [campaignIdFromCsv, adSetIdFromCsv].filter(id => id && /^\d+$/.test(id))
    if (candidates.length === 0) continue // neither column had a numeric id on this row

    let match: { id: string; campaign_name: string } | undefined
    let matchedVia = ''
    for (const id of candidates) {
      match = byLinkedInId.get(id)
      if (match) { matchedVia = id; break }
    }
    if (!match) {
      not_found.push(candidates.join('/'))
      continue
    }
    const linkedinId = matchedVia

    const impressions = impColIdx >= 0 ? toNumber(cells[impColIdx]) : 0
    const clicks = clkColIdx >= 0 ? toNumber(cells[clkColIdx]) : 0
    const cost_usd = spendColIdx >= 0 ? toNumber(cells[spendColIdx]) : 0
    const leads = leadsColIdx >= 0 ? toNumber(cells[leadsColIdx]) : 0
    const engagements = engagementsColIdx >= 0 ? toNumber(cells[engagementsColIdx]) : 0

    const b = buckets.get(match.id)
    if (!b) {
      buckets.set(match.id, { match, linkedinId, impressions, clicks, cost_usd, leads, engagements, rowCount: 1 })
    } else {
      b.impressions += impressions
      b.clicks += clicks
      b.cost_usd += cost_usd
      b.leads += leads
      b.engagements += engagements
      b.rowCount += 1
    }
  }

  for (const b of buckets.values()) {
    // Round cost to cents — sums of 2-decimal numbers can pick up FP noise.
    const cost_usd = Math.round(b.cost_usd * 100) / 100
    const { error: updateErr } = await sb
      .from('linkedin_campaigns')
      .update({
        impressions: b.impressions,
        clicks: b.clicks,
        cost_usd,
        leads: b.leads,
        total_engagements: b.engagements,
        updated_at: new Date().toISOString(),
      })
      .eq('id', b.match.id)

    if (updateErr) {
      errors.push(`${b.match.campaign_name}: ${updateErr.message}`)
    } else {
      matched.push({
        linkedin_campaign_id: b.linkedinId,
        campaign_name: b.match.campaign_name,
        impressions: b.impressions,
        clicks: b.clicks,
        cost_usd,
        leads: b.leads,
        total_engagements: b.engagements,
      })
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
      ad_set_id: adSetColIdx >= 0 ? headers[adSetColIdx] : null,
      impressions: impColIdx >= 0 ? headers[impColIdx] : null,
      clicks: clkColIdx >= 0 ? headers[clkColIdx] : null,
      spend: spendColIdx >= 0 ? headers[spendColIdx] : null,
      leads: leadsColIdx >= 0 ? headers[leadsColIdx] : null,
      engagements: engagementsColIdx >= 0 ? headers[engagementsColIdx] : null,
    },
  })
}
