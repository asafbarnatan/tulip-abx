import type { IndustryVertical, Geography, Account } from './database.types'

// ICP fit scoring — rule-based
// Returns a score 0–100 and a tier (1, 2, or 3)

const VERTICAL_SCORES: Record<IndustryVertical, number> = {
  'Discrete Manufacturing': 30,
  'Pharmaceuticals': 30,
  'Medical Device': 30,
  'Aerospace & Defense': 25,
  'Life Sciences': 20,
}

const GEOGRAPHY_SCORES: Record<Geography, number> = {
  'Japan': 25,       // strategic priority
  'Europe': 25,      // strategic priority
  'North America': 20,
}

function employeeScore(count: number): number {
  if (count >= 10000) return 30
  if (count >= 5000) return 25
  if (count >= 1000) return 20
  if (count >= 500) return 15
  return 10
}

function maturityScore(maturity: number): number {
  // Maturity 2–4 is the sweet spot — either starting their journey or ready to expand
  if (maturity === 2 || maturity === 3) return 15
  if (maturity === 4) return 12
  if (maturity === 1) return 10
  if (maturity === 5) return 8 // already very advanced, harder to sell
  return 0
}

export function calculateIcpFitScore(account: Pick<Account, 'industry_vertical' | 'geography' | 'employee_count' | 'digital_maturity'>): number {
  const score =
    (VERTICAL_SCORES[account.industry_vertical] ?? 0) +
    (GEOGRAPHY_SCORES[account.geography] ?? 0) +
    employeeScore(account.employee_count) +
    maturityScore(account.digital_maturity)

  return Math.min(100, score)
}

export function calculateTier(icpScore: number): 1 | 2 | 3 {
  if (icpScore >= 80) return 1
  if (icpScore >= 60) return 2
  return 3
}
