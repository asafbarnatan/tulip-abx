'use client'

import type { PositioningStatement } from '@/lib/database.types'

interface Props {
  value: PositioningStatement | null
  onChange: (next: PositioningStatement) => void
}

// Edits the 5-field April Dunford positioning statement inline. Empty statement
// is rendered as 5 empty inputs so the user can create one from scratch.
export default function PositioningStatementEditor({ value, onChange }: Props) {
  const safe: PositioningStatement = value ?? { for: '', category: '', key_benefit: '', unlike: '', because: '' }

  const update = (field: keyof PositioningStatement, next: string) => {
    onChange({ ...safe, [field]: next })
  }

  const FIELDS: Array<{ key: keyof PositioningStatement; label: string; placeholder: string }> = [
    { key: 'for',         label: 'For',         placeholder: 'e.g. large regulated manufacturers' },
    { key: 'category',    label: 'Category',    placeholder: 'e.g. a GxP-ready frontline operations platform' },
    { key: 'key_benefit', label: 'Key benefit', placeholder: 'e.g. digital batch records in 90 days, not 18 months' },
    { key: 'unlike',      label: 'Unlike',      placeholder: 'e.g. traditional MES vendors' },
    { key: 'because',     label: 'Because',     placeholder: 'e.g. our no-code layer sits on top of SAP S/4' },
  ]

  return (
    <div className="space-y-3">
      {FIELDS.map(f => (
        <div key={f.key}>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{f.label}</label>
          <input
            type="text"
            value={safe[f.key] ?? ''}
            onChange={e => update(f.key, e.target.value)}
            placeholder={f.placeholder}
            className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] transition-colors"
            style={{ borderColor: 'var(--tulip-border)' }}
          />
        </div>
      ))}
    </div>
  )
}
