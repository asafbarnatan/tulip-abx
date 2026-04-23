'use client'

import { Trash2 } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  addLabel?: string
}

// Reusable dynamic list editor for simple TEXT[] columns like proof_points.
export default function StringListEditor({ value, onChange, placeholder, addLabel }: Props) {
  const update = (i: number, v: string) => {
    const next = [...value]
    next[i] = v
    onChange(next)
  }
  const remove = (i: number) => {
    onChange(value.filter((_, j) => j !== i))
  }
  const add = () => {
    onChange([...value, ''])
  }

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <div className="text-xs text-gray-400 italic py-2">No entries yet. Add one below.</div>
      )}
      {value.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="text-[10px] font-bold text-gray-400 w-5 shrink-0 text-right">{i + 1}.</div>
          <input
            type="text"
            value={v}
            onChange={e => update(i, e.target.value)}
            placeholder={placeholder ?? 'Entry'}
            className="flex-1 text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]"
            style={{ borderColor: 'var(--tulip-border)' }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-gray-400 hover:text-red-600 p-1.5 rounded transition-colors"
            title="Remove"
            aria-label="Remove entry"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors hover:bg-gray-50"
        style={{ borderColor: 'var(--tulip-border)', color: '#00263E' }}
      >
        {addLabel ?? '+ Add entry'}
      </button>
    </div>
  )
}
