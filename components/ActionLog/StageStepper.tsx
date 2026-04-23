'use client'

import { CircleCheck, Circle, Trophy, XCircle, Pencil } from 'lucide-react'
import type { InteractionStage } from '@/lib/database.types'
import { SALES_STAGES, CUSTOMER_STAGES, STAGE_BY_KEY, stageIndex } from './stages'

interface Props {
  current: InteractionStage | null
  onEditClick?: () => void
}

// Two-phase stepper: pre-sale rail on top, post-sale customer rail below, with
// the closed_won milestone bridging the two. Terminal closed_lost renders as a
// separate chip — it takes you off the main flow.
export default function StageStepper({ current, onEditClick }: Props) {
  const overallIdx = stageIndex(current)
  const isLost = current === 'closed_lost'
  const isCustomerPhase = (STAGE_BY_KEY[current ?? 'prospecting'].phase === 'customer')

  return (
    <div
      className="bg-white border rounded-xl p-5"
      style={{ borderColor: 'var(--tulip-border)' }}
    >
      {/* Header — current stage name + edit button */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-400 mb-0.5">
            Client Interaction Stage
          </div>
          <div className="text-sm font-semibold" style={{ color: '#00263E' }}>
            {STAGE_BY_KEY[current ?? 'prospecting']?.label ?? 'Prospecting'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {STAGE_BY_KEY[current ?? 'prospecting']?.tagline}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors hover:bg-gray-50 flex items-center gap-1.5"
              style={{ borderColor: 'var(--tulip-border)', color: '#00263E' }}
              title="Change this account's interaction stage (e.g. move back, or jump to any stage)"
            >
              <Pencil size={12} />
              Edit stage
            </button>
          )}
          {current === 'closed_won' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold"
                 style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
              <Trophy size={14} /> WON
            </div>
          )}
          {isLost && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold"
                 style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
              <XCircle size={14} /> LOST
            </div>
          )}
        </div>
      </div>

      {/* Sales motion rail — 5 stages */}
      <div className="mb-5">
        <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-400 mb-2">
          Sales motion
        </div>
        <StageRail
          stages={SALES_STAGES}
          activeIdx={isLost ? 4 : Math.min(overallIdx, 4)}
          allDone={overallIdx >= 5 /* closed_won or later */}
          current={current}
        />
      </div>

      {/* Customer motion rail — closed_won → onboarding → adoption → expansion → renewal */}
      <div>
        <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-400 mb-2">
          Customer motion
        </div>
        <StageRail
          stages={CUSTOMER_STAGES}
          activeIdx={
            isLost ? -1
              : !isCustomerPhase ? -1 /* sales phase — nothing active on this rail yet */
              : CUSTOMER_STAGES.findIndex(s => s.key === current)
          }
          allDone={false}
          current={current}
        />
      </div>
    </div>
  )
}

// Reusable single-row rail. activeIdx = index of current stage in THIS rail,
// -1 if no stage in this rail is active yet (i.e. we're on a different rail).
// allDone means every stage in this rail is past (renders all as checkmarks).
function StageRail({
  stages,
  activeIdx,
  allDone,
  current,
}: {
  stages: { key: InteractionStage; label: string }[]
  activeIdx: number
  allDone: boolean
  current: InteractionStage | null
}) {
  return (
    <div className="flex items-start">
      {stages.map((stage, i) => {
        const isCurrent = !allDone && i === activeIdx && stage.key === current
        const isPast = allDone || (activeIdx >= 0 && i < activeIdx)
        const isNotStarted = !isCurrent && !isPast
        return (
          <div key={stage.key} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: 64 }}>
              <div className="relative flex items-center justify-center">
                {isPast ? (
                  <CircleCheck size={22} fill="#22c55e" color="white" strokeWidth={2} />
                ) : isCurrent ? (
                  <div
                    className="rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ width: 22, height: 22, backgroundColor: '#00263E' }}
                  >
                    {i + 1}
                  </div>
                ) : (
                  <Circle size={22} color="#D0DBE6" strokeWidth={1.5} />
                )}
              </div>
              <div
                className="text-[10px] font-semibold whitespace-nowrap text-center leading-tight px-1"
                style={{
                  color: isCurrent ? '#00263E' : isPast ? '#166534' : isNotStarted ? '#94a3b8' : '#94a3b8',
                  maxWidth: 88,
                }}
              >
                {stage.label}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mt-[11px] rounded"
                style={{
                  backgroundColor: isPast ? '#22c55e'
                    : isCurrent ? '#00263E40'
                    : '#E2E8F0',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
