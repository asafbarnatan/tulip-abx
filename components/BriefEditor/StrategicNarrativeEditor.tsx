'use client'

import { useState } from 'react'
import StringListEditor from './StringListEditor'

interface Props {
  value: string
  onChange: (next: string) => void
}

// Parses a raw core_message string into { whyNow, play, legacy }. The agent
// writes output in a structured format:
//
//   WHY NOW:
//   - bullet 1
//   - bullet 2
//
//   THE PLAY:
//   - bullet A
//   - bullet B
//
// Briefs generated before the structured prompt land as free-form prose — for
// those, the editor falls back to a single textarea so the user can keep the
// original wording or restructure manually.

interface Parsed {
  whyNow: string[]
  play: string[]
  hasStructure: boolean
  raw: string
}

function parse(raw: string): Parsed {
  const normalized = raw.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n')
  const whyNowMatch = normalized.match(/WHY\s*NOW\s*:\s*([\s\S]*?)(?=THE\s*PLAY\s*:|$)/i)
  const playMatch = normalized.match(/THE\s*PLAY\s*:\s*([\s\S]*)$/i)

  const bulletsFrom = (block: string | undefined): string[] => {
    if (!block) return []
    return block
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 10)
  }

  const whyNow = bulletsFrom(whyNowMatch?.[1])
  const play = bulletsFrom(playMatch?.[1])

  return {
    whyNow,
    play,
    hasStructure: whyNow.length > 0 || play.length > 0,
    raw: normalized,
  }
}

function serialize(whyNow: string[], play: string[]): string {
  const whyNowClean = whyNow.map(s => s.trim()).filter(Boolean)
  const playClean = play.map(s => s.trim()).filter(Boolean)
  const parts: string[] = []
  if (whyNowClean.length > 0) {
    parts.push('WHY NOW:')
    parts.push(...whyNowClean.map(b => `- ${b}`))
  }
  if (playClean.length > 0) {
    if (parts.length > 0) parts.push('')
    parts.push('THE PLAY:')
    parts.push(...playClean.map(b => `- ${b}`))
  }
  return parts.join('\n')
}

export default function StrategicNarrativeEditor({ value, onChange }: Props) {
  const parsed = parse(value)
  const [whyNow, setWhyNow] = useState<string[]>(parsed.whyNow.length > 0 ? parsed.whyNow : [''])
  const [play, setPlay] = useState<string[]>(parsed.play.length > 0 ? parsed.play : [''])
  // If the original brief was legacy prose (no structure), allow the user to
  // toggle back to a raw textarea so they can keep their existing wording.
  const [rawMode, setRawMode] = useState(!parsed.hasStructure)
  const [rawText, setRawText] = useState(parsed.raw)

  // Any time the structured inputs change, re-serialize and bubble up.
  const sync = (nextWhyNow: string[], nextPlay: string[]) => {
    setWhyNow(nextWhyNow)
    setPlay(nextPlay)
    onChange(serialize(nextWhyNow, nextPlay))
  }

  const switchToRaw = () => {
    setRawText(value)
    setRawMode(true)
  }
  const switchToStructured = () => {
    const reparsed = parse(rawText)
    setWhyNow(reparsed.whyNow.length > 0 ? reparsed.whyNow : [''])
    setPlay(reparsed.play.length > 0 ? reparsed.play : [''])
    onChange(serialize(
      reparsed.whyNow.length > 0 ? reparsed.whyNow : [],
      reparsed.play.length > 0 ? reparsed.play : [],
    ))
    setRawMode(false)
  }

  if (rawMode) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Raw editor</div>
          <button
            type="button"
            onClick={switchToStructured}
            className="text-[11px] text-[#008CB9] hover:underline font-semibold"
          >
            Switch to structured editor →
          </button>
        </div>
        <textarea
          value={rawText}
          onChange={e => {
            setRawText(e.target.value)
            onChange(e.target.value)
          }}
          rows={10}
          className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] font-mono leading-relaxed resize-vertical"
          style={{ borderColor: 'var(--tulip-border)' }}
        />
        <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
          Free-form prose is saved verbatim and renders as a paragraph. To get bullet rendering, use the structured editor instead.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* WHY NOW section — fixed label, editable bullets */}
      <div
        className="rounded-lg p-4 border"
        style={{ backgroundColor: '#F0F9FF', borderColor: '#B6DCE1' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: '#0369a1' }}>
              WHY NOW
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Fixed section. The trigger evidence that makes this account worth acting on right now.
            </div>
          </div>
        </div>
        <StringListEditor
          value={whyNow}
          onChange={next => sync(next, play)}
          placeholder="One bullet describing a real trigger — e.g. 'Fusion 25 DX plan names connect-equipment as deliverable'"
          addLabel="+ Add WHY NOW bullet"
        />
      </div>

      {/* THE PLAY section — fixed label, editable bullets */}
      <div
        className="rounded-lg p-4 border"
        style={{ backgroundColor: '#F2EEA120', borderColor: '#F2EEA1' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: '#92400e' }}>
              THE PLAY
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Fixed section. The concrete move the AE makes in response.
            </div>
          </div>
        </div>
        <StringListEditor
          value={play}
          onChange={next => sync(whyNow, next)}
          placeholder="One bullet describing a concrete action — e.g. 'Open with Hiroaki Ueda (Champion, DX Strategy) on monozukuri reform mandate'"
          addLabel="+ Add THE PLAY bullet"
        />
      </div>

      <div className="text-right">
        <button
          type="button"
          onClick={switchToRaw}
          className="text-[11px] text-gray-400 hover:text-gray-700 underline"
        >
          Switch to raw editor (legacy prose)
        </button>
      </div>
    </div>
  )
}
