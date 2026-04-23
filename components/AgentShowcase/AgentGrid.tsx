'use client'

import { AGENTS } from '@/lib/agents/agent-metadata'
import AgentCard from './AgentCard'

export default function AgentGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {AGENTS.map(agent => (
        <AgentCard key={agent.key} agent={agent} />
      ))}
    </div>
  )
}
