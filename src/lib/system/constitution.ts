// TEC System — the Constitution Runtime data model (C-110). SYSTEM is the
// governance authority: it makes C-47 rules queryable at runtime. This module is
// a READ-ONLY projection of the constitution — the machine-readable shape of the
// policy registry (C-110 §5, P1-1), the subscription-tier gating map (§5), and
// the capability registry (C-94, P1-2). SYSTEM OWNS policy definitions + admin
// authority; it does NOT enforce (each service self-enforces) or process payments
// (C-110 §4). Policy *writes* require an AdminActor + audit trail — those live in
// the backend governance service and are NOT built here (§10 Phase 1+).

// ── Policy registry (C-110 §5 / P1-1) ───────────────────────────────────────
// The 10 Forbidden Behaviors of C-47, as machine-readable policies. Each carries
// an enforcement class + the violation response from the C-47 violation matrix.
export type Enforcement = 'hard' | 'soft';

export interface Policy {
  id:                string;   // stable policy id (versioned; never deleted)
  domain:            string;   // which layer/service the rule governs
  rule: string; // human-readable rule text (from C-47)
  enforcement:       Enforcement;
  violationResponse: string; // C-47 violation matrix response
}

export const POLICIES: Policy[] = [
  { id: 'FB-01', domain: 'services',  rule: 'Direct DB mutation bypassing the service layer.', enforcement: 'hard', violationResponse: 'Reject — 403 + audit log.' },
  { id: 'FB-02', domain: 'payment', rule: 'Payment completion without event verification.', enforcement: 'hard', violationResponse: 'Fail closed — 500 + ALERT.' },
  { id: 'FB-03', domain: 'services',  rule: 'Cross-service shared database logic.', enforcement: 'hard', violationResponse: 'Reject at review + runtime deny.' },
  { id: 'FB-04', domain: 'gateway',   rule: 'Business logic inside the API Gateway.', enforcement: 'hard', violationResponse: 'Reject — gateway stays orchestration-only (P5).' },
  { id: 'FB-05', domain: 'sdk',       rule: 'Divergent SDK contracts vs backend behavior.', enforcement: 'hard', violationResponse: 'Fail closed — 500 + alert on contract mismatch.' },
  { id: 'FB-06', domain: 'payment',   rule: 'Silent failure in financial flows.', enforcement: 'hard', violationResponse: 'Reject — every financial action is audited (Invariant 4).' },
  { id: 'FB-07', domain: 'wallet',    rule: "Reading another user's wallet/payment without authorization.", enforcement: 'hard', violationResponse: 'Deny by default (P6) — 401/403.' },
  { id: 'FB-08', domain: 'platform',  rule: 'Sensitive operation with a missing ActorContext.', enforcement: 'hard', violationResponse: 'Deny by default (P6) — 401.' },
  { id: 'FB-09', domain: 'payment',   rule: 'Transitioning from a terminal payment state (completed/failed/cancelled).', enforcement: 'hard', violationResponse: 'Reject — 409 Conflict + audit log.' },
  { id: 'FB-10', domain: 'platform',  rule: 'Ad-hoc system recovery without an audit trail.', enforcement: 'hard', violationResponse: 'Reject — reconciliation path only, always audited.' },
];

export const getPolicy = (id: string): Policy | null =>
  POLICIES.find((p) => p.id.toLowerCase() === id.toLowerCase()) ?? null;

// ── Subscription-tier gating (C-110 §5) ─────────────────────────────────────
// SYSTEM enforces feature access per tier — server-side in BFF routes, never on
// the client (§5). This is the canonical capability map SYSTEM is the authority
// for; apps QUERY it, they do not redefine it.
export type Tier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface TierDef {
  tier:        Tier;
  priceHint:   string;
  capabilities: string[];
}

export const TIERS: TierDef[] = [
  { tier: 'FREE',       priceHint: '0π',            capabilities: ['Basic Hub', 'Basic Commerce', 'Basic Ecommerce'] },
  { tier: 'PRO',        priceHint: 'subscription',  capabilities: ['Hub PRO', 'Advanced analytics', 'TEC AI (basic)', 'everything in FREE'] },
  { tier: 'ENTERPRISE', priceHint: 'custom',        capabilities: ['All features', 'Custom workflows (Nexus)', 'API access', 'everything in PRO'] },
];

// ── Capability registry (C-94 / C-110 §5, P1-2) ─────────────────────────────
// The C-94 capability lifecycle for the first governed capabilities. SYSTEM
// certifies capabilities; governanceStatus is the certification state.
export type GovernanceStatus = 'proposed' | 'designed' | 'verified' | 'certified' | 'deprecated';

export interface Capability {
  id:               string;
  owner:            string;   // owning service
  governanceStatus: GovernanceStatus;
  note:             string;
}

export const CAPABILITIES: Capability[] = [
  { id: 'payment',        owner: 'tec-payment-service', governanceStatus: 'certified', note: 'Pi payment lifecycle — outbox + state machine (ADR-004).' },
  { id: 'authentication', owner: 'tec-auth-service',    governanceStatus: 'certified', note: 'Pi identity + JWT issuance (ADR-002).' },
  { id: 'asset-transfer', owner: 'tec-asset-service',   governanceStatus: 'verified',  note: 'Ownership transfer requires verified payment.' },
  { id: 'order-creation', owner: 'tec-commerce-service', governanceStatus: 'verified', note: 'Order created only after payment approved.' },
  { id: 'analytics-query', owner: 'tec-analytics-service', governanceStatus: 'designed', note: 'Read-only aggregates; eventual consistency.' },
];

export const STATUS_META: Record<GovernanceStatus, { label: string; tone: 'good' | 'mid' | 'low' }> = {
  proposed:   { label: 'Proposed',   tone: 'low' },
  designed:   { label: 'Designed',   tone: 'mid' },
  verified:   { label: 'Verified',   tone: 'mid' },
  certified:  { label: 'Certified',  tone: 'good' },
  deprecated: { label: 'Deprecated', tone: 'low' },
};
