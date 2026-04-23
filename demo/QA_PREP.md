# Nathan Q&A Prep — Tulip ABX Demo

Anticipating the questions Nathan (and the panel) are likely to ask after the 2-min demo. Scripted answers below, plus fallback positions for harder follow-ups.

---

## Strategic questions (most likely)

### Q: "How does this actually integrate with our stack at Tulip — Salesforce, ZoomInfo, our LinkedIn infrastructure?"

**Answer (60s):**
> *"The Command Center is designed to sit above your existing stack, not replace it. In production, Salesforce is the source of truth for account lifecycle and pipeline tracking — the AccountIntelligenceAgent would read account records, contacts, opportunities, and recent activity from Salesforce via the REST API, not from a separate database. ZoomInfo plugs in as a signal source: firmographic changes, new intent signals, job postings — those feed the SignalWatcher. LinkedIn is bidirectional: we pull intent data for the account pulse, and we push campaigns via the Marketing Developer Platform once the agent drafts them.*
>
> *The demo you just saw uses a local database because I'm a candidate without Salesforce access. But the architecture is the same — swap the `getSupabase()` calls for your Salesforce wrappers and the agents don't change."*

**Fallback if pressed on implementation specifics:**
> *"I'd scope the Salesforce integration in two phases. Phase 1, read-only — agents pull account, contacts, and recent activity. Phase 2, write — the PlayOrchestratorAgent creates Salesforce tasks tied to contacts, and the LinkedInOutreachAgent writes the campaign URL back to the opportunity record. Both phases are two-week efforts each."*

---

### Q: "You said this is an 'operating system.' What's the actual IP versus a wrapper over Claude?"

**Answer (45s):**
> *"Three layers of IP. First, the agent orchestration — five named agents with explicit tools, distinct prompts, and a pipeline that passes context between them. That's not a wrapper; it's a workflow definition. Second, the positioning kernel — the vertical context, geography context, maturity context, and proof point library that grounds every agent output in Tulip's actual voice and product. Third, the human-in-the-loop surfaces — Mission Control, the brief approval flow, the LinkedIn publish gate. Those are product decisions, not LLM calls.*
>
> *The Claude-ness is the engine. The IP is the chassis, the steering, and the dashboard."*

---

### Q: "What's the scale of this? You demoed 5 accounts. We have 50-100 Tier 1 accounts."

**Answer (30s):**
> *"Linear scaling. Each account pipeline runs independently — 4 minutes of wall time, roughly $0.80 of API spend at Opus rates. For 100 Tier 1 accounts, refreshed weekly, that's ~$400/month in API cost and the SignalWatch cross-account sweep adds another $20. You'd want async queue processing instead of the synchronous SSE stream I'm showing here, and rate limit buckets per account for concurrency — but nothing architecturally hard."*

---

### Q: "Who owns this tool in the org? Marketing? Sales? CS?"

**Answer (40s):**
> *"You told me this in your email — Marketing owns ABX, in collaboration with Sales, CS, and Ecosystem. The Command Center respects that boundary. The SignalWatcher and PositioningAgent are marketing-owned — they produce the strategic narrative and brief. The PlayOrchestratorAgent hands off to Sales via the account_actions table — those become CRM tasks. The LinkedInOutreachAgent is marketing's production muscle. The handoff between marketing and sales is the **brief approval gate** — marketing approves the brief, and only approved briefs get surfaced in sales workflows.*
>
> *CS has a different read on the same data — for existing customers like Boston Scientific, the agent surfaces expansion opportunities rather than acquisition plays. Same tool, role-aware output."*

---

## Technical questions (expect Stephanie or Eliska)

### Q: "Why Claude Opus 4.6 specifically? Why not a cheaper model for the routine stuff?"

**Answer (30s):**
> *"Opus for the reasoning-heavy agents — positioning and strategic narrative, where the output is read by senior GTM leaders. Haiku or Sonnet for the mechanical stuff — signal classification, metric summarization, data enrichment. For this demo I put everything on Opus because quality mattered more than cost at 5 accounts. In production I'd route by task type: Opus for creative/strategic, Sonnet for structured extraction, Haiku for high-volume classification. Probably cuts cost 60% with no quality loss."*

---

### Q: "How do you prevent the agent from hallucinating facts about our customers?"

**Answer (40s):**
> *"Three guardrails. First, structured tool calls — agents can only access data through named tools (`get_account`, `get_contacts`, `get_signals`). They can't invent a contact who isn't in the database. Second, explicit anti-hallucination rules in the system prompt — the PositioningAgent is told to use `[CUSTOMER NAME REQUIRED]` placeholders rather than inventing named customers for proof points. Third, human gate — marketing reviews and approves every brief before it reaches sales. The agent is a first draft, not a final output."*

---

### Q: "How do you handle PII and data security? These are real customer names on a screen."

**Answer (30s):**
> *"The demo runs locally on my machine with demo data. For production at Tulip, three things change. First, all data stays in your Salesforce — the agents call Salesforce APIs, not a local DB. Second, the Anthropic Workspace plan includes data privacy guarantees — prompts and completions aren't used for training. Third, the Command Center's auth layer gates access by role — marketing sees everything, sales sees only their accounts, CS sees only their book."*

---

## Product questions

### Q: "What's missing that you wish you'd built?"

**Answer (30s, honest):**
> *"Three things I cut for time. One, automatic metric sync from LinkedIn — currently I refresh manually because Marketing Developer Platform approval takes 2 weeks. Two, a Salesforce integration layer — proof of concept only, real connector is Day-7 work. Three, a digest email to the AE each morning — 'here's what changed on your Tier 1 accounts overnight, here's the top play for today'. That's the obvious next feature."*

---

### Q: "What did you learn about our business from this build?"

**Answer (45s):**
> *"Three insights. First, the positioning work is harder than the agent infrastructure. Tulip's composable-vs-monolithic story has to be told differently for pharma than for discrete — the pain points, the vocabulary, the proof points don't transfer. Building the vertical context layer took as long as building the agents. Second, the Mission Control gap you described — 'deep account-level intelligence Salesforce doesn't have' — is where the leverage is. The KPI bar and Account Pulse aren't the value; the per-account briefs are. Third, the human-in-the-loop story is more credible than full automation, especially for regulated customers like your pharma accounts. No Bayer compliance officer is going to let an agent publish paid media without review."*

---

## Harder questions (be ready, don't be defensive)

### Q: "This took you 6 days — how do I know it's not just impressive prompt engineering?"

**Answer:**
> *"Fair question. Three things separate this from a prompt hack. One: the orchestration layer — agents hand off to each other, context propagates, failures are recoverable. That's 800 lines of TypeScript that have nothing to do with LLM prompting. Two: the data model — Supabase schema, typed interfaces, agent run audit trail. Three: the product surface — Mission Control, the approval gates, the brief UI. A prompt hack is a clever API call. This is a product."*

---

### Q: "Would you bet your next year on this direction?"

**Answer:**
> *"Yes. The shift toward agentic marketing is happening whether or not Tulip leads it. The only question is whether the operating system comes from a GTM-led product team inside Tulip, or from a startup that ends up selling it back to you. I'd rather be inside."*

---

### Q: "Why should this be PM-led, not engineering-led?"

**Answer:**
> *"Because the hard work is the taste. The agents write 50 different things for Bayer vs Daikin — which 3 of those are the ones Elena sees first matters more than which model generates them. That's positioning strategy, buyer journey mapping, regional nuance. Engineering can build the pipes; a PM with real empathy for the GTM motion has to design the output. That's my actual craft."*

---

## If asked about specific accounts

### "Tell me what the agent said about Bayer."
Pull up Bayer's positioning brief. Read the positioning statement aloud. Then the strategic narrative. Then one persona message (recommend Claudia Becker — Champion is the warmest story). Don't read all of it.

### "Tell me about Daikin."
Nemawashi. Kaizen. Shiga Factory beachhead. Mitsubishi Electric partnership as Japan-market proof. Keiko Nakamura champion. 98 plants scale question. Hit these five and stop.

### "What about Boston Scientific — they're already a customer."
This is the expansion story. 34% MoM usage surge, David Park's unprompted Factory Playback inquiry, Axonics acquisition adding 3 greenfield sites with no MES. The agent correctly frames this as multi-site pricing, not new logo.

### "RTX — we've never sold them."
FedRAMP Moderate Equivalency is the opener. $12B DoD contract win forcing scale, Pratt & Whitney paper travelers, Samantha Rivers as the digital manufacturing program manager — a real champion. Long sales cycle (12-18 months) acknowledged.

### "Thermo Fisher — they're competing us against Rockwell Plex."
This is the one where the agent does the sharpest work. It identified Michael Crane as a blocker (persona_type in contacts), flagged that his security questionnaire has been unanswered, and built an explicit neutralization strategy for him. Read that part aloud if they want depth.

---

## Recovery lines if something breaks

| Failure | What to say |
|---|---|
| Dev server crashes mid-demo | *"Let me re-open — the pipeline is idempotent, takes 10 seconds to come back up."* Pull backup screenshots. |
| LinkedIn panel shows 0 impressions (campaign not started yet) | *"Campaign goes live tomorrow morning — I'll send the real metrics by end of day Monday."* |
| Agent throws a rate limit error | *"That's a 429 — Opus 4.6 shares a workspace rate bucket. In production we'd queue per-account. Let me re-run."* Wait 30s, retry. |
| A brief tab shows empty | *"One second — caching issue. Let me refresh."* F5, usually fixes it. |
| Signal Watch takes >30 seconds | Keep talking while it runs: *"While this runs, one thing worth noting — the agent's reasoning is persisted in the run history, so if the output is weak the AE can audit exactly which tool calls produced it."* |
