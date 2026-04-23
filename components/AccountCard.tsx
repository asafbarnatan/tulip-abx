import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Account } from '@/lib/database.types'
import { MapPin, Users, ArrowRight } from 'lucide-react'
import { VerticalIcon } from '@/lib/industry-icons'
import { displayLocation } from '@/lib/format-location'

const STAGE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  prospect:  { bg: 'bg-blue-50',   text: 'text-blue-700',  label: 'Prospect' },
  pipeline:  { bg: 'bg-amber-50',  text: 'text-amber-700', label: 'Pipeline' },
  customer:  { bg: 'bg-green-50',  text: 'text-green-700', label: 'Customer' },
  expansion: { bg: 'bg-purple-50', text: 'text-purple-700',label: 'Expansion' },
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium text-gray-500 w-7 text-right">{value}</span>
    </div>
  )
}

export default function AccountCard({ account }: { account: Account }) {
  const stage = STAGE_COLORS[account.lifecycle_stage] ?? STAGE_COLORS.prospect

  return (
    <Link href={`/accounts/${account.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200 h-full group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center rounded-md shrink-0"
                style={{ width: 36, height: 36, backgroundColor: '#F2EEA1' }}
                aria-hidden="true"
              >
                <VerticalIcon vertical={account.industry_vertical} size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-[#00263E] transition-colors">
                  {account.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{displayLocation(account.headquarters, account.geography)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stage.bg} ${stage.text}`}>
                {stage.label}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#008CB9] transition-colors" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant="outline" className="text-xs font-normal">
              {account.industry_vertical}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {account.geography}
            </Badge>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {(account.employee_count ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">Maturity {account.digital_maturity}/5</span>
          </div>

          {/* Scores */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-20 shrink-0">ICP Fit</span>
              <ScoreBar value={account.icp_fit_score} color="#00263E" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-20 shrink-0">Intent</span>
              <ScoreBar value={account.intent_score} color="#008CB9" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-20 shrink-0">Engagement</span>
              <ScoreBar value={account.engagement_score} color="#f59e0b" />
            </div>
          </div>

          {/* Primary use case (left) + AE (right) — left-aligned "Primary use case"
              reads as a field label + value pair. AE floats right so it doesn't
              compete for hierarchy. */}
          {(account.assigned_ae || account.primary_use_case) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-start justify-between gap-3 text-xs">
              {account.primary_use_case ? (
                <div className="text-left flex-1 min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-gray-400 mb-0.5">
                    Primary use case
                  </div>
                  <div className="text-gray-600 leading-relaxed">{account.primary_use_case}</div>
                </div>
              ) : <div className="flex-1" />}
              {account.assigned_ae && (
                <span className="shrink-0 text-gray-400 whitespace-nowrap">AE: {account.assigned_ae}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
