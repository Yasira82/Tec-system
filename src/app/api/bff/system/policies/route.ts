import { NextResponse } from 'next/server';
import { POLICIES } from '@/lib/system/constitution';

// GET /api/bff/system/policies — the policy registry (C-110 §5 / P1-1).
// SYSTEM is the authority for platform policy. This V1 serves the read-only C-47
// projection (source:'sample'); when the backend governance service exists
// (tec-governance-service, C-110 §5), this route proxies its versioned registry
// and returns source:'live' with the same shape. Read-only — policy WRITES require
// an AdminActor + audit trail and never go through a public BFF GET.
export async function GET() {
  return NextResponse.json(
    { source: 'sample', policies: POLICIES, count: POLICIES.length },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
