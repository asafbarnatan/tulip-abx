import type { IndustryVertical, Geography, LifecycleStage } from './database.types'

export interface Play {
  id: string
  name: string
  description: string
  play_type: 'outbound' | 'inbound' | 'event' | 'exec' | 'demo' | 'cs_expansion' | 'content'
  owner_team: 'marketing' | 'sales' | 'sdr' | 'cs'
  trigger_conditions: {
    lifecycle_stages?: LifecycleStage[]
    verticals?: IndustryVertical[]
    geographies?: Geography[]
    min_maturity?: number
    max_maturity?: number
    min_tier?: number
    signal_types?: string[]
  }
  duration_days: number
  assets: string[]
  sample_outreach_opener: string
  expected_outcome: string
}

export const PLAY_LIBRARY: Play[] = [
  {
    id: 'factory-playback-demo',
    name: 'Factory Playback Live Demo',
    description: 'Show how Tulip combines video and production data into a rewindable timeline. Find root causes faster and align teams on reality. This play is ideal for accounts who struggle with quality escapes or rework loops.',
    play_type: 'demo',
    owner_team: 'sales',
    trigger_conditions: {
      lifecycle_stages: ['prospect', 'pipeline'],
      min_tier: 1,
      min_maturity: 2,
    },
    duration_days: 14,
    assets: [
      'Factory Playback product page (tulip.co)',
      'Factory Playback one-pager',
      'Live demo environment',
      'Root cause analysis case study',
    ],
    sample_outreach_opener: "I wanted to share something we recently launched that I think would resonate with your team: Factory Playback. It combines video footage with your actual production data into a single rewindable timeline — so when a defect or deviation happens, you can go back and understand exactly what occurred, in context. We've seen teams cut their root cause investigation time dramatically. Worth a 20-minute look?",
    expected_outcome: 'Scheduled demo call with plant manager or VP Ops within 2 weeks',
  },
  {
    id: 'ai-process-engineer-workshop',
    name: 'AI Process Engineer Workshop',
    description: 'In-person or virtual workshop where Tulip certifies operators and engineers as AI Process Engineers. Demonstrates Tulip\'s AI-native platform capabilities and builds internal champions. Strong for Japan and Europe.',
    play_type: 'event',
    owner_team: 'marketing',
    trigger_conditions: {
      lifecycle_stages: ['prospect', 'pipeline'],
      min_tier: 1,
    },
    duration_days: 30,
    assets: [
      'Workshop invitation (localized)',
      'AI Process Engineer certification overview',
      'Workshop agenda',
      'Post-workshop follow-up sequence',
    ],
    sample_outreach_opener: "We're running an AI Process Engineer Workshop for manufacturing leaders — a hands-on session where participants work directly with Tulip's AI tools and walk away with a certification in AI-driven operations. Given your team's focus on operational excellence, I thought this would be worth flagging. Would anyone on your team benefit from attending?",
    expected_outcome: 'At least 2 contacts attend; post-workshop discovery call scheduled',
  },
  {
    id: 'digital-work-instructions-poc',
    name: 'Digital Work Instructions Proof of Concept',
    description: '30-day POC focused on replacing paper-based work instructions with Tulip apps. Operators build the first apps themselves — proving speed to value without IT. Best entry point for low-maturity accounts.',
    play_type: 'demo',
    owner_team: 'sales',
    trigger_conditions: {
      lifecycle_stages: ['prospect', 'pipeline'],
      max_maturity: 2,
    },
    duration_days: 30,
    assets: [
      'POC proposal template',
      'Work instruction app template',
      'Success metrics framework',
      '30-day POC timeline',
    ],
    sample_outreach_opener: "One pattern we see often: manufacturers that are still on paper or spreadsheets want to digitize but fear a multi-year IT project. What if we could show you — on your own process, with your own operators — what's possible in 30 days? No code, no IT project. Just results. Would that be worth exploring?",
    expected_outcome: 'POC agreement signed; first Tulip app built by operator in week 1',
  },
  {
    id: 'ai-quality-inspection-poc',
    name: 'AI-Powered Quality Inspection POC',
    description: 'Demonstrate Tulip\'s native AI and ML capabilities applied to quality inspection — computer vision, anomaly detection, and guided defect classification. Ideal for accounts with high quality escape rates or regulated environments.',
    play_type: 'demo',
    owner_team: 'sales',
    trigger_conditions: {
      lifecycle_stages: ['prospect', 'pipeline'],
      verticals: ['Discrete Manufacturing', 'Medical Device', 'Pharmaceuticals', 'Aerospace & Defense'],
      min_maturity: 2,
    },
    duration_days: 21,
    assets: [
      'AI Quality demo environment',
      'Native AI and ML product overview',
      'Quality ROI calculator',
      'Case study: quality escape reduction',
    ],
    sample_outreach_opener: "Quality inspection is one of the highest-leverage areas for AI in manufacturing — and Tulip has native AI and ML built directly into the platform, not bolted on. Operators can use computer vision and anomaly detection without writing a line of code. I'd love to show you what this looks like in a live demo on a real production use case. Does that sound relevant to what your team is working on?",
    expected_outcome: 'Demo completed; quality team engaged; POC scoped',
  },
  {
    id: 'virtual-tour',
    name: 'Tulip Virtual Tour',
    description: 'Self-guided or live virtual tour of Tulip\'s platform — showing the full composable operations story across production tracking, quality, digital guidance, and AI. Good for early-stage prospects or executives who need a quick orientation.',
    play_type: 'inbound',
    owner_team: 'marketing',
    trigger_conditions: {
      lifecycle_stages: ['prospect'],
    },
    duration_days: 7,
    assets: [
      'Virtual tour link (tulip.co)',
      'Post-tour follow-up email',
      'Platform overview one-pager',
    ],
    sample_outreach_opener: "Before we get into a full conversation, I wanted to share Tulip's Virtual Tour — it's the fastest way to understand what the platform does and how it's different from traditional MES. Takes about 10 minutes. If it resonates, we can set up a conversation focused on your specific environment.",
    expected_outcome: 'Tour completed; contact replies with specific question or area of interest',
  },
  {
    id: 'exec-briefing-expansion',
    name: 'Executive Briefing + Expansion Planning',
    description: 'For existing customers with expansion potential. Joint business review focused on operational outcomes achieved, new Tulip capabilities (Factory Playback, AI), and expansion to additional sites or use cases.',
    play_type: 'cs_expansion',
    owner_team: 'cs',
    trigger_conditions: {
      lifecycle_stages: ['customer', 'expansion'],
      min_tier: 1,
    },
    duration_days: 30,
    assets: [
      'QBR template (customized)',
      'Factory Playback expansion overview',
      'AI capabilities roadmap',
      'Multi-site expansion case study',
    ],
    sample_outreach_opener: "We'd love to set aside time for a joint business review — look at the outcomes you've achieved with Tulip so far, and share some new capabilities we've launched (including Factory Playback and our latest AI features) that we think could be valuable for your other sites. Are you open to a 45-minute session with your leadership team?",
    expected_outcome: 'Expansion opportunity identified; new sites or use cases scoped; upsell initiated',
  },
  {
    id: 'ai-value-conversation',
    name: 'AI Pricing & Value Conversation',
    description: 'Strategic conversation play for accounts ready to discuss Tulip\'s AI capabilities as a value driver — not just a feature. Positions AI pricing in terms of ROI: error reduction, compliance cost avoidance, operator productivity uplift.',
    play_type: 'exec',
    owner_team: 'sales',
    trigger_conditions: {
      lifecycle_stages: ['pipeline', 'customer'],
      min_maturity: 3,
      min_tier: 1,
    },
    duration_days: 14,
    assets: [
      'AI value framework (internal)',
      'ROI calculator with AI scenarios',
      'AI for Operations podcast (reference)',
      'Agentic systems overview',
    ],
    sample_outreach_opener: "One conversation I've been having with manufacturing leaders lately is around how AI pricing actually maps to value. Tulip's AI is native to the platform — it's not an add-on — so the ROI calculation is fundamentally different. I'd like to walk you through how we frame it, and hear your perspective on where AI creates the most leverage in your operations.",
    expected_outcome: 'AI capabilities included in deal scope; pricing conversation advanced',
  },
  {
    id: 'traceability-compliance-pitch',
    name: 'Traceability & Compliance Fast-Start',
    description: 'For regulated industries (Pharma, MedDev, A&D) where compliance pain is the primary entry point. Emphasizes Tulip\'s audit trail, electronic records, and FedRAMP Moderate Equivalency achievement.',
    play_type: 'outbound',
    owner_team: 'sdr',
    trigger_conditions: {
      lifecycle_stages: ['prospect'],
      verticals: ['Pharmaceuticals', 'Medical Device', 'Aerospace & Defense', 'Life Sciences'],
    },
    duration_days: 21,
    assets: [
      'Traceability & Compliance solution overview',
      'FedRAMP announcement (for A&D)',
      'Electronic batch records demo',
      'Compliance ROI framework',
    ],
    sample_outreach_opener: "Given your environment, I imagine compliance documentation is a constant operational pressure. Tulip recently achieved FedRAMP Moderate Equivalency — a signal of how seriously we take security and compliance in regulated manufacturing. More practically, we help teams replace paper-based records, close audit trail gaps, and pass inspections faster. Would a 20-minute conversation be worth your time?",
    expected_outcome: 'Discovery call booked; quality or compliance leader engaged',
  },
]

export function getRecommendedPlays(account: {
  lifecycle_stage: LifecycleStage
  industry_vertical: IndustryVertical
  geography: Geography
  digital_maturity: number
  tier: number
}): Play[] {
  return PLAY_LIBRARY.filter(play => {
    const { trigger_conditions: tc } = play
    if (tc.lifecycle_stages && !tc.lifecycle_stages.includes(account.lifecycle_stage)) return false
    if (tc.verticals && !tc.verticals.includes(account.industry_vertical)) return false
    if (tc.geographies && !tc.geographies.includes(account.geography)) return false
    if (tc.min_maturity && account.digital_maturity < tc.min_maturity) return false
    if (tc.max_maturity && account.digital_maturity > tc.max_maturity) return false
    if (tc.min_tier && account.tier > tc.min_tier) return false
    return true
  }).slice(0, 5)
}
