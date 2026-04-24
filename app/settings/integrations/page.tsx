// Server component wrapper — the actual UI lives in ./IntegrationsClient.tsx.
// Split so Vercel's build adapter emits a proper lambda for this route.
// Without this wrapper, the page was a pure 'use client' module and Vercel
// would fail the build with "Unable to find lambda for route: /settings/integrations".
// export const dynamic gets silently ignored on client-only modules, which is
// why pushing it into a separate client component (referenced from a server
// parent) is the reliable fix.
export const dynamic = 'force-dynamic'

import IntegrationsClient from './IntegrationsClient'

export default function IntegrationsPage() {
  return <IntegrationsClient />
}
