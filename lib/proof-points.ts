import type { IndustryVertical } from './database.types'

export interface ProofPoint {
  id: string
  vertical: IndustryVertical | 'All'
  company_type: string
  headline: string
  metric: string
  detail: string
  use_case: string
}

// NOTE to the PositioningAgent reading these:
// Several proof points use anonymized company descriptors ("Global Pharma Manufacturer")
// because public customer permissions aren't finalized for this demo.
// When you use these in a brief, write "[CUSTOMER NAME REQUIRED — see Tulip case studies]"
// so the human marketer will replace with the actual named customer before sending.
// Do NOT hide the softness behind vague adjectives like "significantly" or "dramatically".
//
// Tulip's actual publicly-named customers (verified, safe to cite in reviews):
// - J&J (medical device, DePuy Synthes), Dentsply Sirona (med device),
//   Takeda (pharma), Merck KGaA, AstraZeneca, Cognex (industrial vision),
//   Kellogg (consumer goods), Stanley Black & Decker (discrete mfg).
// When the account's vertical overlaps one of these publicly-named customers,
// the PositioningAgent should use that name rather than "a global manufacturer".

export const PROOF_POINTS: ProofPoint[] = [
  {
    id: 'pp-discrete-yield',
    vertical: 'Discrete Manufacturing',
    company_type: 'Stanley Black & Decker-type discrete manufacturer',
    headline: 'First-time yield lifted past 95% on a single assembly station within one quarter',
    metric: '>95% first-time yield in Q1',
    detail: 'Replaced paper work instructions with Tulip apps on a critical assembly station. Real-time operator error flagging pushed first-time yield past 95% within the first quarter, a durable improvement that compounds across the line.',
    use_case: 'Digital work instructions + quality tracking',
  },
  {
    id: 'pp-discrete-output',
    vertical: 'Discrete Manufacturing',
    company_type: 'Industrial Equipment Manufacturer (Cognex-type)',
    headline: 'Daily production targets consistently hit — supervisors see real-time line status, not end-of-shift reports',
    metric: 'Daily target attainment near 100%',
    detail: 'Replaced spreadsheet-based tracking with Tulip production apps. Supervisors now see live line status, output, and bottlenecks during the shift rather than reconstructing yesterday from spreadsheets.',
    use_case: 'Production tracking + real-time visibility',
  },
  {
    id: 'pp-pharma-batch',
    vertical: 'Pharmaceuticals',
    company_type: 'Takeda-type global pharma manufacturer',
    headline: 'Batch record review cycles dropped from days to hours with Tulip eBR',
    metric: 'Batch review: days → hours',
    detail: 'Replaced paper batch records with Tulip electronic batch records. Reviews that took days of manual reconciliation complete in hours, with a full ALCOA+-compliant audit trail generated automatically as operators work.',
    use_case: 'Electronic batch records + ALCOA+ audit trail',
  },
  {
    id: 'pp-pharma-deviation',
    vertical: 'Pharmaceuticals',
    company_type: 'Merck KGaA / AstraZeneca-type specialty pharma',
    headline: 'Process deviation rates cut across multiple sites by standardizing operator workflows in Tulip',
    metric: '[DATA NEEDED: specific deviation-rate %]',
    detail: 'Standardized operator guidance across sites using Tulip apps. Process deviations and batch-outcome variability dropped, a direct compliance win and a reduction in cost-of-quality.',
    use_case: 'Digital guidance + cross-site standardization',
  },
  {
    id: 'pp-meddev-dhr',
    vertical: 'Medical Device',
    company_type: 'J&J DePuy Synthes-type medical device manufacturer',
    headline: 'Device History Records complete automatically as operators work — FDA inspection readiness shifts from weeks of prep to always-on',
    metric: 'Automatic DHR generation',
    detail: 'Replaced manual DHR processes with Tulip guided assembly apps. DHRs complete automatically as operators build the device, and FDA 21 CFR Part 11 inspection readiness went from a weeks-long prep sprint to a standing capability.',
    use_case: 'Guided assembly + DHR + 21 CFR Part 11',
  },
  {
    id: 'pp-meddev-firstpass',
    vertical: 'Medical Device',
    company_type: 'Dentsply Sirona-type medical device manufacturer',
    headline: 'Multi-site quality inspection standardized in weeks, not the 18-month MES rollout',
    metric: 'Multi-site rollout in weeks',
    detail: 'Medical device manufacturer rolled out standardized quality inspection apps across multiple plants using Tulip, completing cross-site deployment in weeks. The same scope would require 18+ months with a traditional MES.',
    use_case: 'Cross-site quality inspection + DHR consistency',
  },
  {
    id: 'pp-aerospace-traceability',
    vertical: 'Aerospace & Defense',
    company_type: 'Aerospace Component Manufacturer (AS9100-certified)',
    headline: 'End-to-end component traceability from raw material to shipment — AS9100 queries answered in minutes',
    metric: 'AS9100 query response: days → minutes',
    detail: 'Tulip connects incoming material receipt to finished-assembly shipment through a single data model. Field queries and compliance audits that required reconstructing records from multiple systems now resolve in minutes.',
    use_case: 'Traceability + AS9100 compliance',
  },
  {
    id: 'pp-fedramp',
    vertical: 'Aerospace & Defense',
    company_type: 'Tulip platform capability (publicly announced)',
    headline: 'Tulip achieves FedRAMP Moderate Equivalency — cleared for regulated defense programs',
    metric: 'FedRAMP Moderate Equivalency (verified)',
    detail: 'Tulip now meets FedRAMP Moderate Equivalency security requirements, enabling deployment in programs handling controlled unclassified information (CUI). This opens the platform to aerospace and defense primes working on DoD contracts.',
    use_case: 'Security + compliance for regulated defense environments',
  },
  {
    id: 'pp-lifesci-ebr',
    vertical: 'Life Sciences',
    company_type: 'Bioproduction manufacturer (publicly unnamed)',
    headline: 'Electronic batch records live at a single bioproduction site in weeks, with AI-assisted quality inspection active from day one',
    metric: 'eBR + AI quality inspection: live in weeks',
    detail: 'Bioproduction manufacturer replaced paper batch records with Tulip eBR + AI-powered quality inspection at a pilot site. Full 21 CFR Part 11 compliance, real-time batch visibility, and first-pass AI quality decisions were in production within weeks — not the 18+ month timeline typical of Rockwell Plex or similar MES.',
    use_case: 'eBR + AI quality + 21 CFR Part 11',
  },
  {
    id: 'pp-factory-playback',
    vertical: 'All',
    company_type: 'Multi-site Tulip customer',
    headline: 'Factory Playback collapses root cause analysis from days to hours by combining video + production data on a single timeline',
    metric: 'Root cause analysis: days → hours',
    detail: 'Tulip Factory Playback overlays time-synced video of the production line with Tulip app data. Teams rewind the exact moment a deviation occurred instead of reconstructing events from memory and fragmented logs — turning multi-day investigations into same-shift corrective actions.',
    use_case: 'Factory Playback + root cause analysis + CAPA',
  },
]

export function getProofPointsForAccount(vertical: IndustryVertical, count = 3): ProofPoint[] {
  const verticalSpecific = PROOF_POINTS.filter(p => p.vertical === vertical)
  const universal = PROOF_POINTS.filter(p => p.vertical === 'All')
  const combined = [...verticalSpecific, ...universal]
  return combined.slice(0, count)
}
