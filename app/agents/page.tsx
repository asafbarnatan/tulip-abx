export const dynamic = 'force-dynamic'

import AgentGrid from '@/components/AgentShowcase/AgentGrid'

export default function AgentsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--tulip-cream)' }}>
      {/* Header band */}
      <div style={{ backgroundColor: 'var(--tulip-navy)', color: 'white', padding: '24px 32px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div
            style={{
              fontSize: 11, color: 'var(--tulip-teal-light)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              fontWeight: 600, marginBottom: 4,
            }}
          >
            Tulip · Agent Catalog
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.1 }}>
            Meet the Agents
          </h1>
          <p style={{ fontSize: 13, color: 'var(--tulip-teal-light)', marginTop: 8, maxWidth: 720, lineHeight: 1.55 }}>
            Six Claude Opus 4.6 agents run the Tulip ABX motion. Each has a specific job,
            specific tools, and a clear moment when you should call on them. Hover any
            card for the full description, or jump back to Mission Control to see them
            work in real time.
          </p>
        </div>
      </div>

      {/* Grid of agent cards */}
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 32px 48px' }}>
        <AgentGrid />
      </div>
    </div>
  )
}
