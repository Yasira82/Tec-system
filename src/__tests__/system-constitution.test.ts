import { describe, it, expect } from 'vitest';
import {
  POLICIES, TIERS, CAPABILITIES, STATUS_META, getPolicy,
} from '@/lib/system/constitution';

describe('TEC System — Constitution Runtime (C-110, read-only)', () => {
  it('projects all 10 C-47 Forbidden Behaviors as policies with unique ids', () => {
    expect(POLICIES).toHaveLength(10);
    const ids = POLICIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('every policy carries an enforcement class + a violation response (C-47 matrix)', () => {
    for (const p of POLICIES) {
      expect(['hard', 'soft']).toContain(p.enforcement);
      expect(p.violationResponse.trim().length).toBeGreaterThan(0);
      expect(p.domain.trim().length).toBeGreaterThan(0);
    }
  });

  it('financial-flow policies are HARD-enforced (never soft)', () => {
    for (const p of POLICIES.filter((x) => x.domain === 'payment' || x.domain === 'wallet')) {
      expect(p.enforcement).toBe('hard');
    }
  });

  it('getPolicy resolves case-insensitively and fails closed for unknown ids', () => {
    expect(getPolicy('fb-07')?.domain).toBe('wallet');
    expect(getPolicy('nope')).toBeNull();
  });

  it('subscription tiers are FREE/PRO/ENTERPRISE and strictly widen', () => {
    expect(TIERS.map((t) => t.tier)).toEqual(['FREE', 'PRO', 'ENTERPRISE']);
    // Each higher tier explicitly inherits the one below (C-110 §5).
    const pro = TIERS.find((t) => t.tier === 'PRO');
    const ent = TIERS.find((t) => t.tier === 'ENTERPRISE');
    expect(pro?.capabilities.some((c) => c.toLowerCase().includes('free'))).toBe(true);
    expect(ent?.capabilities.some((c) => c.toLowerCase().includes('pro'))).toBe(true);
  });

  it('the first governed capabilities (C-94) have a valid lifecycle status + owner', () => {
    const wanted = ['payment', 'authentication', 'asset-transfer', 'order-creation', 'analytics-query'];
    for (const id of wanted) {
      const c = CAPABILITIES.find((x) => x.id === id);
      if (!c) throw new Error(`missing governed capability: ${id}`);
      expect(STATUS_META[c.governanceStatus]).toBeTruthy();
      expect(c.owner.startsWith('tec-')).toBe(true);
    }
  });

  it('payment + authentication are certified (highest governed capabilities)', () => {
    expect(CAPABILITIES.find((c) => c.id === 'payment')?.governanceStatus).toBe('certified');
    expect(CAPABILITIES.find((c) => c.id === 'authentication')?.governanceStatus).toBe('certified');
  });
});
