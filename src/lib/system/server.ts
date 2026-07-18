import {
  POLICIES, TIERS, CAPABILITIES, getPolicy,
  type Policy, type Enforcement, type TierDef, type Tier,
  type Capability, type GovernanceStatus,
} from './constitution';

// Server-only System backend access (C-110). Calls the real System governance
// projection (identity-service) via the gateway with the inter-service key, and maps
// the backend rows to the frontend shape. READ-ONLY (C-110 §5): there is no write
// call here — policy writes are AdminActor + audit-trail in the governance service.
// Everything degrades to the curated C-47 projection so the console is never blank /
// never 500s. NEW-A: the gateway URL is server-only (API_GATEWAY_URL).
const GW = process.env.API_GATEWAY_URL ?? '';

const gwHeaders = () => ({
  'Content-Type': 'application/json',
  'x-request-id': crypto.randomUUID(),
  ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
});

// backend (system_policies) → frontend Policy.
export function policyFromBackend(p: Record<string, unknown>): Policy {
  return {
    id:                String(p.policy_id ?? ''),
    domain:            String(p.domain ?? ''),
    rule:              String(p.rule ?? ''),
    enforcement:       String(p.enforcement ?? 'hard').toLowerCase() as Enforcement,
    violationResponse: String(p.violation_response ?? ''),
  };
}

// backend (system_tier_defs) → frontend TierDef.
export function tierFromBackend(t: Record<string, unknown>): TierDef {
  const caps = Array.isArray(t.capabilities) ? (t.capabilities as unknown[]).map(String) : [];
  return {
    tier:         String(t.tier ?? '') as Tier,
    priceHint:    String(t.price_hint ?? ''),
    capabilities: caps,
  };
}

// backend (system_capabilities) → frontend Capability.
export function capabilityFromBackend(c: Record<string, unknown>): Capability {
  return {
    id:               String(c.cap_id ?? ''),
    owner:            String(c.owner ?? ''),
    governanceStatus: String(c.governance_status ?? 'proposed').toLowerCase() as GovernanceStatus,
    note:             String(c.note ?? ''),
  };
}

async function gwGet(path: string): Promise<Record<string, unknown> | null> {
  if (!GW) return null;
  try {
    const res = await fetch(`${GW}${path}`, { headers: gwHeaders(), cache: 'no-store' });
    if (res.ok) return (await res.json().catch(() => null))?.data ?? null;
  } catch { /* fall through to the curated projection */ }
  return null;
}

export interface ResolvedPolicies { policies: Policy[]; source: 'live' | 'sample'; }

// The policy registry — live backend first, curated C-47 projection as fallback.
export async function resolvePolicies(): Promise<ResolvedPolicies> {
  const data = await gwGet('/api/identity/system/policies');
  const rows = data?.policies;
  if (Array.isArray(rows)) return { policies: rows.map((p) => policyFromBackend(p as Record<string, unknown>)), source: 'live' };
  return { policies: POLICIES, source: 'sample' };
}

export interface ResolvedConstitution {
  policies:     Policy[];
  tiers:        TierDef[];
  capabilities: Capability[];
  source:       'live' | 'sample';
}

// The whole read projection (policies + tiers + capabilities) in one call.
export async function resolveConstitution(): Promise<ResolvedConstitution> {
  const data = await gwGet('/api/identity/system/constitution');
  const pol = data?.policies; const tie = data?.tiers; const cap = data?.capabilities;
  if (Array.isArray(pol) && Array.isArray(tie) && Array.isArray(cap)) {
    return {
      policies:     pol.map((p) => policyFromBackend(p as Record<string, unknown>)),
      tiers:        tie.map((t) => tierFromBackend(t as Record<string, unknown>)),
      capabilities: cap.map((c) => capabilityFromBackend(c as Record<string, unknown>)),
      source:       'live',
    };
  }
  return { policies: POLICIES, tiers: TIERS, capabilities: CAPABILITIES, source: 'sample' };
}

export interface ResolvedPolicy { policy: Policy | null; source: 'live' | 'sample'; }

// One policy by id — live backend first, sample fallback. A live 404 is
// authoritative (policy: null, source: 'live').
export async function resolvePolicy(id: string): Promise<ResolvedPolicy> {
  if (GW) {
    try {
      const res = await fetch(`${GW}/api/identity/system/policy/${encodeURIComponent(id)}`, {
        headers: gwHeaders(), cache: 'no-store',
      });
      if (res.ok) {
        const p = (await res.json().catch(() => null))?.data?.policy;
        if (p) return { policy: policyFromBackend(p as Record<string, unknown>), source: 'live' };
      }
      if (res.status === 404) return { policy: null, source: 'live' };
    } catch { /* fall through to the curated projection */ }
  }
  return { policy: getPolicy(id), source: 'sample' };
}
