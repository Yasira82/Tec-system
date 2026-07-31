import { NextResponse } from 'next/server';
import { resolveConstitution } from '@/lib/system/server';

// GET /api/bff/system/constitution — the whole read projection of the constitution
// (C-110): the policy registry + the subscription-tier gating map + the C-94
// capability registry, in one call. Proxies the backend governance projection
// (identity-service) and returns source:'live'; falls back to the curated C-47
// projection (source:'projection') if the backend is unreachable, so the console is
// never blank. Read-only — writes are AdminActor + audit trail only (C-110 §5).
// NEW-A: gateway URL is server-only.
export async function GET() {
  const { policies, tiers, capabilities, source } = await resolveConstitution();
  return NextResponse.json(
    { source, policies, tiers, capabilities },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
