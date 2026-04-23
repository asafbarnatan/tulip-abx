'use client'

// Each key_theme is a TEXT row in the format "Title — description". The
// PositioningBriefTab splits on "—" to render as 3 numbered cards. This editor
// shows 3 rows of title+description so users don't have to remember the
// separator convention. Serialized back to "Title — description" on save.
interface Props {
  value: string[]
  onChange: (next: string[]) => void
}

function split(theme: string): { title: string; desc: string } {
  const idx = theme.indexOf('—')
  if (idx === -1) return { title: theme.trim(), desc: '' }
  return { title: theme.slice(0, idx).trim(), desc: theme.slice(idx + 1).trim() }
}

export default function KeyThemesEditor({ value, onChange }: Props) {
  // Pad to at least 3 rows so users can fill empty pillars.
  const themes = [...value]
  while (themes.length < 3) themes.push('')

  const updateRow = (i: number, title: string, desc: string) => {
    const next = [...themes]
    next[i] = desc ? `${title} — ${desc}` : title
    onChange(next.filter(t => t.trim()))
  }

  return (
    <div className="space-y-3">
      {themes.slice(0, 5).map((theme, i) => {
        const { title, desc } = split(theme)
        return (
          <div key={i} className="border rounded-md p-3" style={{ borderColor: 'var(--tulip-border)', backgroundColor: '#F8F8F6' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Pillar {i + 1}
            </div>
            <input
              type="text"
              value={title}
              onChange={e => updateRow(i, e.target.value, desc)}
              placeholder="Pillar title"
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] mb-2"
              style={{ borderColor: 'var(--tulip-border)' }}
            />
            <input
              type="text"
              value={desc}
              onChange={e => updateRow(i, title, e.target.value)}
              placeholder="Short explanation (max ~18 words)"
              className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9]"
              style={{ borderColor: 'var(--tulip-border)' }}
            />
          </div>
        )
      })}
    </div>
  )
}
