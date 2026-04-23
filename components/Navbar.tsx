'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const [linkedInConnected, setLinkedInConnected] = useState(false)

  useEffect(() => {
    fetch('/api/linkedin/campaigns')
      .then(r => r.json())
      .then(d => setLinkedInConnected(!!d.connected))
      .catch(() => null)
  }, [])

  return (
    <nav className="border-b sticky top-0 z-50" style={{ backgroundColor: '#F8F8F6', borderColor: '#D0DBE6' }}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
        <Link href="/mission-control" className="flex items-center gap-2.5">
          <Image
            src="/tulip-logo.png"
            alt="Tulip"
            width={90}
            height={28}
            priority
            style={{ height: 22, width: 'auto' }}
          />
          <span
            className="font-semibold text-base"
            style={{ color: '#00263E', borderLeft: '1px solid #D0DBE6', paddingLeft: 10 }}
          >
            ABX
          </span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          <NavLink href="/mission-control" active={pathname === '/mission-control' || pathname === '/'}>
            Mission Control
          </NavLink>
          <NavLink href="/dashboard" active={pathname === '/dashboard' || pathname.startsWith('/accounts')}>
            Accounts
          </NavLink>
          <NavLink href="/agents" active={pathname.startsWith('/agents')}>
            Agents
          </NavLink>
          <NavLink href="/settings/integrations" active={pathname.startsWith('/settings')}>
            Integrations
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
            style={{
              borderColor: linkedInConnected ? '#22c55e' : '#D0DBE6',
              color: linkedInConnected ? '#15803d' : '#5F6D77',
              backgroundColor: linkedInConnected ? '#f0fdf4' : 'transparent',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: linkedInConnected ? '#22c55e' : '#d1d5db' }} />
            <span className="font-medium">{linkedInConnected ? 'LinkedIn ✓' : 'LinkedIn'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#00263E' }}>
              T
            </div>
            <span className="text-sm font-medium" style={{ color: '#121C2E' }}>Tulip GTM</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  if (active) {
    return (
      <Link
        href={href}
        className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
        style={{ backgroundColor: '#00263E', color: '#F2EEA1' }}
      >
        {children}
      </Link>
    )
  }
  // Inactive links: hover reveals navy text on a light celery-tinted chip
  // — gives the nav a sense of being responsive instead of static.
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-[#5F6D77] hover:text-[#00263E] hover:bg-[#F2EEA1]/40"
    >
      {children}
    </Link>
  )
}
