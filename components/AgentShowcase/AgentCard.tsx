'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Circle } from 'lucide-react'
import type { AgentMeta } from '@/lib/agents/agent-metadata'

interface Props {
  agent: AgentMeta
}

export default function AgentCard({ agent }: Props) {
  const [recentRunCount, setRecentRunCount] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/agents/runs?agent_name=${agent.key}&limit=100`)
      .then(r => r.json())
      .then(d => setRecentRunCount((d.runs ?? []).length))
      .catch(() => setRecentRunCount(null))
  }, [agent.key])

  const Icon = agent.icon

  return (
    <div
      className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col"
      style={{ borderColor: 'var(--tulip-border)' }}
    >
      {/* Header band — colored tint of the agent's signature color */}
      <div
        className="px-6 py-5 flex items-start gap-4"
        style={{ backgroundColor: `${agent.color}10`, borderBottom: `3px solid ${agent.color}` }}
      >
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 56, height: 56, backgroundColor: agent.color }}
          aria-hidden="true"
        >
          <Icon size={28} color="white" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
            <h2 className="text-xl font-bold" style={{ color: '#00263E' }}>{agent.displayName}</h2>
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: agent.color }}>
              {agent.tagline}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 font-mono">{agent.key}</div>
        </div>
      </div>

      {/* Body — description + when to use */}
      <div className="px-6 py-5 flex-1">
        <div className="text-[10px] font-bold tracking-wider uppercase text-gray-400 mb-2">What I do</div>
        <p className="text-sm leading-relaxed text-gray-700 mb-5">{agent.description}</p>

        <div className="text-[10px] font-bold tracking-wider uppercase text-gray-400 mb-2">When to use me</div>
        <ul className="space-y-2 mb-5">
          {agent.whenToUse.map((bullet, i) => (
            <li key={i} className="text-sm text-gray-700 flex items-start gap-2 leading-relaxed">
              <Circle size={6} fill={agent.color} color={agent.color} className="mt-2 shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        <div className="text-[10px] font-bold tracking-wider uppercase text-gray-400 mb-2">My tools</div>
        <div className="flex flex-wrap gap-1.5">
          {agent.tools.map((tool, i) => (
            <span
              key={i}
              className="text-[11px] font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: `${agent.color}18`, color: agent.color }}
            >
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* Footer — recent runs count + link to Mission Control */}
      <div
        className="px-6 py-3 border-t flex items-center justify-between text-xs"
        style={{ borderColor: 'var(--tulip-border)', backgroundColor: '#F8F8F6' }}
      >
        <span className="text-gray-500">
          {recentRunCount === null
            ? 'Loading runs…'
            : recentRunCount === 0
              ? 'No runs yet'
              : `${recentRunCount} recent run${recentRunCount === 1 ? '' : 's'}`}
        </span>
        <Link
          href="/mission-control"
          className="font-semibold flex items-center gap-1"
          style={{ color: agent.color }}
        >
          View activity <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  )
}
