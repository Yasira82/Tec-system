import { NextResponse } from 'next/server';
import { resolvePolicies } from '@/lib/system/server';

// GET /api/bff/system/policies — the policy registry (C-110 §5 / P1-1).
// SYSTEM is the authority for platform policy. Proxies the backend governance
// projection (identity-service) and returns source:'live'; falls back to the
// read-only C-47 projection (source:'sample') if the backend is unreachable, so the
// console is never blank. Read-only — policy WRITES require an AdminActor + audit
// trail and never go through a public BFF GET. NEW-A: gateway URL is server-only.
export async function GET() {
  const { policies, source } = await resolvePolicies();
  return NextResponse.json(
    { source, policies, count: policies.length },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
