import { Cog, Pill, HeartPulse, Plane, FlaskConical, Factory } from 'lucide-react'

// Stable component wrapper — renders the right lucide icon for an industry vertical.
// Dispatches via a switch instead of a map+lookup so React's create-components-in-render
// lint rule doesn't flag the dynamic `const Icon = ...` pattern.
export function VerticalIcon({
  vertical,
  size = 20,
  color = '#00263E',
  strokeWidth = 1.75,
}: {
  vertical: string | null | undefined
  size?: number
  color?: string
  strokeWidth?: number
}) {
  switch (vertical) {
    case 'Discrete Manufacturing': return <Cog size={size} color={color} strokeWidth={strokeWidth} />
    case 'Pharmaceuticals':        return <Pill size={size} color={color} strokeWidth={strokeWidth} />
    case 'Medical Device':         return <HeartPulse size={size} color={color} strokeWidth={strokeWidth} />
    case 'Aerospace & Defense':    return <Plane size={size} color={color} strokeWidth={strokeWidth} />
    case 'Life Sciences':          return <FlaskConical size={size} color={color} strokeWidth={strokeWidth} />
    default:                       return <Factory size={size} color={color} strokeWidth={strokeWidth} />
  }
}
