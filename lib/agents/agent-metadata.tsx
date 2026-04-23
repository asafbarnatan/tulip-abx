import {
  Database,
  Zap,
  Presentation,
  Layers,
  Send,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'

// Single source of truth for agent color, label, icon, and AE-facing description.
// Imported by: Mission Control Activity Feed, account-detail Agents tab, /agents
// navbar page. Adding a new agent here makes it appear in all three without
// touching their render files.

export type AgentKey =
  | 'AccountIntelligenceAgent'
  | 'SignalWatcherAgent'
  | 'PositioningAgent'
  | 'PlayOrchestratorAgent'
  | 'LinkedInOutreachAgent'
  | 'ContactResearchAgent'

export interface AgentMeta {
  key: AgentKey
  displayName: string       // humanized label (e.g. "Signal Watcher")
  initials: string          // for avatar circles (e.g. "SW")
  tagline: string           // one-line role ("The radar.")
  color: string             // signature hex
  icon: LucideIcon          // thematic lucide icon
  description: string       // 1-paragraph plain-English for an AE
  whenToUse: string[]       // 2-4 bullets
  tools: string[]           // friendly tool names (not raw API names)
}

export const AGENTS: AgentMeta[] = [
  {
    key: 'AccountIntelligenceAgent',
    displayName: 'Account Intelligence',
    initials: 'AI',
    tagline: 'The analyst.',
    color: '#008CB9',
    icon: Database,
    description:
      'I read everything about one account — the firmographics, the buying-group contacts, every signal and every touchpoint logged in the last 30 days — and I write a synthesis that tells you what\'s actually going on. I also update the intent and engagement scores when the evidence supports it, and I write a new signal if I spot a gap (like "no one from Sales has touched VP Quality in 47 days").',
    whenToUse: [
      'You need a one-page situation report on a specific account before a call.',
      'Intent/engagement scores feel stale and you want them re-scored against fresh data.',
      'You suspect there\'s a silent problem — untouched contacts, missed signal — and want it surfaced.',
    ],
    tools: ['Read account record', 'Read buying group', 'Read recent signals', 'Read recent actions', 'Update scores', 'Write new signal'],
  },
  {
    key: 'SignalWatcherAgent',
    displayName: 'Signal Watcher',
    initials: 'SW',
    tagline: 'The radar.',
    color: '#f59e0b',
    icon: Zap,
    description:
      'I sweep every account every time you run me and rank them by urgency — critical, high, medium, low — based on unprocessed signals (news, job postings, regulatory deadlines) and how stale each one is. I update intent scores where the data supports it, mark signals as processed, and return one honest line explaining why each account got its urgency level. My output drives the Account Pulse colors on Mission Control.',
    whenToUse: [
      'Monday morning: you want to know which accounts to work first this week.',
      'A big news event broke for one of your target industries and you want to know if any accounts are suddenly hot.',
      'You just ingested a batch of new signals and want them triaged automatically.',
    ],
    tools: ['List all accounts with signals', 'Read unprocessed signals', 'Mark signals processed', 'Update intent scores'],
  },
  {
    key: 'PositioningAgent',
    displayName: 'Positioning',
    initials: 'PA',
    tagline: 'The strategist.',
    color: '#7c3aed',
    icon: Presentation,
    description:
      'I write the strategic message for how Tulip wins this specific account. Using the April Dunford framework (For / Category / Key Benefit / Unlike / Because), I produce a full positioning brief: strategic narrative, three strategic pillars, a tailored message per buying-group persona, relevant proof points from Tulip\'s real customer stories, and objection handlers. Grounded in the account\'s vertical, geography, digital maturity, and any intelligence from prior agent runs.',
    whenToUse: [
      'You\'re about to draft a cold email, LinkedIn InMail, or meeting agenda and need the strategic message.',
      'The positioning on an account feels generic and you want something tailored to their specific moment.',
      'A new buying-group contact got added and you need a fresh persona-specific message for them.',
    ],
    tools: ['Read account record', 'Read buying group', 'Read recent signals', 'Read positioning kernel', 'Read proof points', 'Save positioning brief'],
  },
  {
    key: 'PlayOrchestratorAgent',
    displayName: 'Play Orchestrator',
    initials: 'PO',
    tagline: 'The coordinator.',
    color: '#22c55e',
    icon: Layers,
    description:
      'I pick 3 to 5 sales plays from the Tulip play library that fit this account\'s stage and vertical, personalize the opener copy for named contacts in the buying group, and save each play as a draft action with a clear why-now, target, opener, and rationale. I don\'t execute anything — a human on your team picks up each draft and runs it.',
    whenToUse: [
      'You just finished a brief and want a prioritized list of concrete next moves.',
      'An SDR needs openers ready to personalize before the day starts.',
      'You want to compare two accounts on what plays the library recommends for each.',
    ],
    tools: ['Read account record', 'Read buying group', 'Read recommended plays from library', 'Read positioning brief', 'Read recent actions', 'Save personalized play draft'],
  },
  {
    key: 'LinkedInOutreachAgent',
    displayName: 'LinkedIn Outreach',
    initials: 'LI',
    tagline: 'The messenger.',
    color: '#0077b5',
    icon: Send,
    description:
      'I draft a LinkedIn Sponsored Content campaign anchored in the account\'s approved positioning brief — headline under 100 characters, body copy under 600, observational tone, zero vendor snark. I save it as a draft in LinkedIn Campaign Manager (never auto-launch). You review, polish if needed, pick a budget, and publish from LinkedIn itself.',
    whenToUse: [
      'The positioning brief is approved and you want to stand up a LinkedIn campaign for this account.',
      'You need a second creative variant tailored to a different buying-group persona.',
      'A campaign went live and you want a follow-up draft ready for the next flight.',
    ],
    tools: ['Read account record', 'Read buying group', 'Read approved positioning brief', 'Save LinkedIn campaign draft'],
  },
  {
    key: 'ContactResearchAgent',
    displayName: 'Contact Research',
    initials: 'CR',
    tagline: 'The scout.',
    color: '#0891b2',
    icon: UserPlus,
    description:
      'I find real, publicly verifiable people at target accounts for empty buying-group slots — and I refuse to invent. For each proposed contact I cite a real URL (LinkedIn profile, company website, press release) and a direct quote from that source as evidence. If the web doesn\'t show a credible answer for the role, I return nothing rather than guess.',
    whenToUse: [
      'The buying group has an empty slot (e.g. "VP Quality") and you need a real candidate with a source.',
      'A known contact left the account and you need to find their replacement.',
      'You want a second opinion on whether a sourced contact is actually the right level for the role.',
    ],
    tools: ['Read account record', 'Web search (live)', 'Propose contact with cited source + evidence quote'],
  },
]

// Lookup helpers used by the legacy call sites (AgentActivityFeed, AgentRunHistory)
// that were previously hardcoding these maps.
const BY_KEY: Record<string, AgentMeta> = Object.fromEntries(AGENTS.map(a => [a.key, a]))

export function agentMeta(key: string): AgentMeta | undefined {
  return BY_KEY[key]
}

export function agentColor(key: string | undefined | null): string {
  if (!key) return 'var(--tulip-gray)'
  return BY_KEY[key]?.color ?? 'var(--tulip-gray)'
}

export function agentLabel(key: string | undefined | null): string {
  if (!key) return 'Agent'
  return BY_KEY[key]?.displayName ?? key.replace(/Agent$/, '').replace(/([A-Z])/g, ' $1').trim()
}

export function agentInitials(key: string | undefined | null): string {
  if (!key) return '??'
  return BY_KEY[key]?.initials ?? '??'
}
