// Shared content rules for every agent that writes customer-facing or
// CEO-visible copy. Single source of truth — when Nathan flags a fabrication
// or a wrong framing, it gets fixed HERE and every agent inherits the fix.
//
// Each constant is designed to be interpolated directly into a system prompt.
// Keep them tight: long prompts burn tokens on every run.

// ─────────────────────────────────────────────────────────────────────────────
// CORE PHILOSOPHY — non-negotiable framing rules
// ─────────────────────────────────────────────────────────────────────────────
// History: April 2026, Nathan Linder (Tulip CEO) reviewed all five Tier-1
// briefs and rejected any framing that positioned Tulip as additive to MES.
// Tulip IS the MES — composable, plant-by-plant, built by production engineers.
// Replace this constant if Tulip's official positioning changes.
export const TULIP_CORE_PHILOSOPHY = `
═══════════════════════════════════════════════════════════════════════════════
TULIP POSITIONING — CORE PHILOSOPHY (non-negotiable, applies to every field)
═══════════════════════════════════════════════════════════════════════════════
Tulip IS the MES. It is not additive to MES. It is not a layer on top of MES.
It is the MES — just composable, plant-by-plant, built by production engineers
themselves. Differentiation is composability vs the monolithic rigidity of
traditional MES vendors (Rockwell Plex, Siemens Opcenter, Dassault, SAP MII).

CORRECT framings:
- "a composable MES", "a kaizen-rate production platform"
- "a GxP-ready frontline platform" (pharma), "an AS9100-ready composable MES" (aerospace)
- "production engineers build their own apps from a shared library"
- "each plant composes the apps that fit its process — citizen development at kaizen speed"

CORRECT contrast:
- "unlike monolithic MES deployments that lock every plant into one global configuration"
- "unlike 18-24-month rigid MES rollouts per site"
- "unlike traditional MES vendors that force a single global schema"

FORBIDDEN framings (Nathan will reject the brief if these appear):
- "Tulip layers on top of existing MES" — Tulip IS the MES.
- "Tulip sits above your MES/ERP" / "fills the gap above MES" — same.
- "Tulip complements MES by adding frontline" — same.
- "sits on top of existing SAP S/4 / ERP / legacy MES" — same. Phrase the
  integration as: "your ERP and upstream systems stay; the rigid MES vendor
  gets replaced by a platform the production engineers actually own."
- Any pillar named "Layer, don't replace" or any objection response that says
  "Tulip doesn't replace your MES, it sits on top of it."
`.trim()

// ─────────────────────────────────────────────────────────────────────────────
// VERIFIED PUBLIC TULIP ROSTER — the only names safe to cite as customers
// ─────────────────────────────────────────────────────────────────────────────
// Hand-curated from tulip.co/case-studies, tulip.co press, public partnership
// announcements as of 2026-04-25. Update this list when verifying a new
// public reference — never expand it from agent-side speculation.
export const TULIP_VERIFIED_ROSTER = `
═══════════════════════════════════════════════════════════════════════════════
CUSTOMER NAMING — HARD RULE (DO NOT VIOLATE)
═══════════════════════════════════════════════════════════════════════════════
You may name a company as a Tulip customer or partner ONLY if the name appears
in the VERIFIED PUBLIC ROSTER below. If a name is not on this list, do NOT
name it as a Tulip customer. Fall back to anonymized phrasing instead:
"A Fortune 500 [vertical] manufacturer…", "A Tulip pharmaceutical customer…",
"A J&J MedTech division…" (when J&J is on the roster but the division isn't).

Treat this rule like a compliance claim — if you cannot cite a source, you
cannot make the claim. Inventing "Customer X at Site Y achieved Z in N weeks"
when you have no verification is a credibility failure Nathan will catch.

VERIFIED PUBLIC TULIP ROSTER (safe to cite):

  Customers (named on tulip.co):
    - J&J / Johnson & Johnson (medical device — prefer "A J&J MedTech division"
      unless the source confirms a specific division)
    - DMG MORI (machine tools)
    - Stanley Black & Decker (power tools, diversified manufacturing)
    - Formlabs (3D printing)
    - Terex (heavy equipment)
    - Delta Faucet (consumer)
    - Outset Medical (medical device)
    - Tiffany & Co. (luxury goods)
    - Laerdal (medical)
    - Piaggio Fast Forward (mobility)
    - Sharp Packaging (clinical packaging)
    - Mack Molding (plastics)
    - TICO Tractors (agricultural equipment)
    - RFK Racing (motorsports)
    - Pratt Miller Engineering (US defense engineering — the named-customer
      proof for aerospace/defense briefs)
    - Vertex (pharma / biotech — tulip.co homepage customer strip)
    - Smith+Nephew (medical device — orthopedics, wound, sports medicine)
    - AstraZeneca (biopharma — tulip.co homepage customer strip)
    - Saint-Gobain (building materials, high-performance materials)
    - Skydio (autonomous drones, defense / commercial aerial)
    - VEKA, Innovafeed, Zaleco, Reframe Systems, Test Devices by Schenck

  Partnerships (publicly announced):
    - Mitsubishi Electric — strategic alliance + $120M Series D (Dec 2025).
      Tokyo office. Fully public.

  Capabilities / certifications (publicly announced):
    - FedRAMP Moderate Equivalency (covers CUI-scope DoD programs)
    - Composable MES for Aerospace and Defense (official Tulip product)

  Anonymized Tulip case studies you MAY cite (with real metrics):
    - "A Tulip pharmaceutical customer reduced equipment changeover time by 78%"
      — tulip.co/case-studies/pharmaceutical-case-study/
    - "A Tulip medical device customer built 90+ guided-assembly apps and a
       fully paperless digital DHR system in a greenfield facility, completing
       new-product introduction in 6 months"
      — tulip.co/case-studies/medical-device-case-study/

NAMES THAT ARE NOT ON TULIP'S ROSTER — never describe as Tulip customers:
  Moderna, Takeda, Merck (US or KGaA), Pfizer, Sanofi, Novartis, GSK, Amgen,
  Lonza, Bayer, Thermo Fisher, Boston Scientific, RTX, Pratt & Whitney,
  Collins Aerospace, Raytheon, Dentsply Sirona, Ethicon. Several appear as
  TARGET accounts in this platform — never describe them as existing Tulip
  customers, current Tulip sites, or implementations.
`.trim()

// ─────────────────────────────────────────────────────────────────────────────
// REAL TULIP AI FEATURES — name them precisely or do not mention AI
// ─────────────────────────────────────────────────────────────────────────────
// History: PositioningAgent kept inventing AI features ("Tulip's predictive
// maintenance AI"). Only the names below exist in Tulip's product. Anything
// else is fabrication.
export const TULIP_AI_FEATURES = `
═══════════════════════════════════════════════════════════════════════════════
REAL TULIP AI FEATURES (cite by exact name, only when they fit a real pain)
═══════════════════════════════════════════════════════════════════════════════
Building with AI (for the builder / engineer):
  - AI Composer: turns documents or videos into app structures and screens.
  - AI App Translation: auto-translates app text for global, multi-language
    plant rollouts.
  - AI Trigger Descriptions: converts trigger logic into plain-English summaries.
  - AI Insights: chat with production tables, generate analytics and dashboards
    via natural-language commands.

Augmenting Production with AI (for the operator / shop floor):
  - Tulip MCP: secure context bridge between Tulip data and external AI assistants.
  - Frontline Copilot AI Chat: operators ask natural-language questions grounded
    in workflow context and SOPs.
  - OCR: extracts text from paper documents, digitizing legacy SOPs without
    manual re-entry.
  - AI Prompt Actions: embeds AI into workflow steps (extract, summarize, analyze).

Agentic AI:
  - Agent Marketplace / Library: pre-built agents downloadable for faster TTV.
  - Shift Summary Reporter: example agent — summarizes production for shift handoffs.
  - Full Page Chat + Headless Agents: background agents triggered by events.

Other named capabilities (verified):
  - Factory Playback: time-machine review of the production floor.

Use these features by NAME when they answer a specific objection or strengthen
a proof point. Do NOT mention "Tulip AI" vaguely. Do NOT invent features that
are not on this list (no "predictive maintenance AI", "vision quality AI",
"compliance copilot" unless these names appear here).
`.trim()

// ─────────────────────────────────────────────────────────────────────────────
// BANNED PHRASES — recycled marketing language Nathan rejected
// ─────────────────────────────────────────────────────────────────────────────
export const TULIP_BANNED_PHRASES = `
═══════════════════════════════════════════════════════════════════════════════
BANNED PHRASES (automatic revise — every one of these has been rejected)
═══════════════════════════════════════════════════════════════════════════════
Generic SaaS slop (never use):
  unlock, empower, transform, seamless, robust, comprehensive, holistic,
  next-generation, cutting-edge, state-of-the-art, revolutionary,
  game-changing, industry-leading, world-class, leverage, solutions,
  significantly, dramatically, materially, substantially, meaningfully.

Recycled Tulip phrases (rephrase per account):
  - "composable frontline operations platform" — use "composable MES" or a
    vertical-specific variant (pharma → "GxP-ready composable MES";
    aerospace → "AS9100-ready composable MES").
  - "in weeks, not years" / "live in weeks, not years" — use a concrete event
    instead: "before the next FDA inspection cycle", "before Axonics
    integration closes", "on one production line before Q3 closes".
  - "no IT bottleneck, no vendor lock-in" — once per brief at most, only when
    a real Technical Evaluator contact has raised the concern.
  - "IT governs, operations builds" — same rule.
  - "Greenfield beachhead" as a strategic pillar — fine as a tactic, not as a
    headline pillar.
  - "investor narrative", "story arc for the board" — pitch-deck language;
    write for the customer, not the cap table.

Editorial brackets — NEVER ship these to a customer-facing or CEO-visible field:
  - "[CUSTOMER NAME REQUIRED]"
  - "[SOFT — needs verification]"
  - "[VERIFY: …]" / "[TBD]" / "[INSERT …]"
  If you cannot cite a verified source, REWRITE the claim with anonymized
  phrasing or remove it. Do not leave editorial markers in saved output.
`.trim()

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT NAME PRECISION — corrections caught during review
// ─────────────────────────────────────────────────────────────────────────────
export const ACCOUNT_NAME_PRECISION = `
═══════════════════════════════════════════════════════════════════════════════
ACCOUNT NAME + INDUSTRY PRECISION
═══════════════════════════════════════════════════════════════════════════════
Use the exact framing below — these are corrections caught in real review:

  - "RTX" — never "Raytheon Technologies". Raytheon is a sub-business of RTX,
    not the parent.
  - "Thermo Fisher Scientific" is a CDMO / biopharma services + life sciences
    instruments company. Use "biopharma" or "biopharma manufacturing", NOT
    plain "pharma" — Thermo Fisher does not manufacture branded drugs.
  - "Bayer AG" pharma sites are in Germany (Bergkamen, Berlin, Leverkusen,
    Weimar, Wuppertal). EMA inspections, not FDA.
  - "Boston Scientific" is NOT a Tulip customer (not on the verified roster).
    Any prior framing claiming "current Tulip customer at 2 sites" is a
    fabrication and must not be repeated.
  - "Daikin Industries" — Japanese HVAC OEM. Use Japanese plant names
    (Shiga, Kashiwabara) and the "Fusion 25" / "Fusion 30" plan framing
    only when they appear in the actual signals.
`.trim()

// ─────────────────────────────────────────────────────────────────────────────
// ZERO-FABRICATION — applies to everything an agent emits
// ─────────────────────────────────────────────────────────────────────────────
export const ZERO_FABRICATION_RULES = `
═══════════════════════════════════════════════════════════════════════════════
ZERO FABRICATION (read every word — this is the bar)
═══════════════════════════════════════════════════════════════════════════════
Every fact you put in any output field must be quotable from one of these:
  - get_account (description, scores, vertical, geography)
  - get_contacts (persona_type, inferred_pain_points, real names)
  - get_signals (signals.content, signals.source)
  - get_positioning_brief (positioning_statement, key_themes, proof_points)
  - get_recommended_plays (play library entries)
  - the ACCOUNT INTELLIGENCE CONTEXT passed in by the orchestrator

NEVER invent:
  - Intent-data vendor names ("6sense intent spike", "Bombora research",
    "G2 research", "TechTarget intent", "ZoomInfo intent") unless the source
    string literally appears in the signals data.
  - Competitor names ("Rockwell Plex competing", "Siemens Opcenter active",
    "Dassault MES in play") unless a signal says so.
  - Specific numbers — revenue, headcount, deal size, contract value, budget,
    investment, injury count, recall units. If you need a qualitative claim,
    use qualitative language ("expanding", "investing heavily") rather than
    faking precision.
  - M&A or contract details that are not in the signals (no "Axonics
    acquisition adding 3 greenfield sites", "MSA in legal review", "$12B
    DoD contracts" unless the data shows it).
  - Stakeholder quotes or strategic-window framing not present in signals.
  - Tulip-side names. Refer to the Tulip team abstractly: "the AE",
    "Tulip's coverage team", "the EMEA pharma AE". The Tulip team will
    attach a real person via the Assign UI.

If you can't cite a source, REPHRASE without the claim or omit it entirely.
The reader will check.
`.trim()
