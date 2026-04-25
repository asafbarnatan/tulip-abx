'use client'

import { AGENTS } from '@/lib/agents/agent-metadata'
import AgentCard from './AgentCard'

// Two-section layout. Pipeline agents (5) render first in dependency-correct
// order so the visual flow matches what Full Pipeline actually executes.
// SignalWatcher renders separately because it's a portfolio-wide sweep, not
// part of the per-account pipeline. This is a key explainer for the demo.
export default function AgentGrid() {
  const pipeline = AGENTS
    .filter(a => a.pipelineRole === 'pipeline')
    .sort((a, b) => (a.pipelineStep ?? 99) - (b.pipelineStep ?? 99))
  const portfolio = AGENTS.filter(a => a.pipelineRole === 'portfolio')

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader
          eyebrow="Per-Account Pipeline"
          title="Run on one account, in this order"
          subtitle="Click Run Pipeline on Mission Control and these five agents fire in sequence. Each one's output feeds the next."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {pipeline.map(agent => (
            <AgentCard key={agent.key} agent={agent} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Portfolio Sweep"
          title="Runs across every account at once"
          subtitle="Click Run Signal Watch on Mission Control. This agent ranks all five accounts by urgency in a single pass — outside the per-account pipeline."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {portfolio.map(agent => (
            <AgentCard key={agent.key} agent={agent} />
          ))}
        </div>
      </section>
    </div>
  )
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <div
        style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--tulip-teal)', marginBottom: 4,
        }}
      >
        {eyebrow}
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#00263E', margin: 0, lineHeight: 1.2 }}>
        {title}
      </h2>
      <p style={{ fontSize: 13, color: '#475569', marginTop: 6, maxWidth: 720, lineHeight: 1.5 }}>
        {subtitle}
      </p>
    </div>
  )
}
