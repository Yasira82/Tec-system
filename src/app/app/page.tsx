'use client';

// TEC System — the Governance Console (C-110). SYSTEM is the Constitution Runtime:
// it makes C-47 rules queryable and governs subscription tiers + capability
// certification (C-94). This console is READ-ONLY — it PRESENTS the constitution.
// Policy WRITES require an AdminActor + audit trail and live in the backend
// governance service (C-110 §5/§10) — not here. SYSTEM defines policy; each
// service self-enforces; SYSTEM never processes payments (§4).
import Link from 'next/link';
import { InviteCard } from '@/components/referral/InviteCard';
import { useEffect, useState } from 'react';
import { usePiAuth } from '@yasser172/tec-auth';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { SystemSupporter } from './components/SystemSupporter';
import {
  POLICIES, TIERS, CAPABILITIES, STATUS_META,
  type Policy, type TierDef, type Capability,
} from '@/lib/system/constitution';

export default function SystemConsole() {
  const { user, isLoading } = usePiAuth();
  const name = user?.piUsername ? `@${user.piUsername}` : '';

  const [policies,     setPolicies]     = useState<Policy[]>(POLICIES);
  const [tiers,        setTiers]        = useState<TierDef[]>(TIERS);
  const [capabilities, setCapabilities] = useState<Capability[]>(CAPABILITIES);
  const [source,       setSource]       = useState<'projection' | 'live'>('projection');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // The whole read projection (policies + tiers + capabilities) in one call —
        // live from the backend governance projection, or the curated C-47 fallback.
        const res  = await fetch('/api/bff/system/constitution', { credentials: 'include' });
        const data = await res.json().catch(() => null);
        if (!alive || !data) return;
        if (Array.isArray(data.policies))     setPolicies(data.policies as Policy[]);
        if (Array.isArray(data.tiers))        setTiers(data.tiers as TierDef[]);
        if (Array.isArray(data.capabilities)) setCapabilities(data.capabilities as Capability[]);
        setSource(data.source === 'live' ? 'live' : 'projection');
      } catch { /* keep the constitution projection */ }
    })();
    return () => { alive = false; };
  }, []);

  const card: React.CSSProperties = {
    background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}22`,
    borderRadius: 12, padding: 14,
  };
  const toneColor = (tone: 'good' | 'mid' | 'low') =>
    tone === 'good' ? TEC_COLORS.success : tone === 'mid' ? TEC_COLORS.gold : TEC_COLORS.subtext;

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text, padding: '32px 22px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <header>
          <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>TEC System · Governance</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEC_COLORS.gold, margin: '6px 0 0' }}>
            {isLoading || !name ? 'Governance Console' : `Governance Console, ${name}`}
          </h1>
          <p style={{ fontSize: 14, color: TEC_COLORS.subtext, margin: '6px 0 0', lineHeight: 1.6 }}>
            System makes the platform&apos;s rules easy to look up. This console is
            <strong style={{ color: TEC_COLORS.text }}> read-only</strong> — changes are
            made by administrators with a full audit trail.
          </p>
        </header>

        {/* System Supporter — a real Pi U2A payment (voluntary; grants no authority).
            Satisfies the Pi Portal "Process a Transaction" step. */}
        <SystemSupporter />

        {/* Policy registry — the 10 Forbidden Behaviors (C-47) as policies. */}
        <section style={{ marginTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>Policy Registry</h2>
            <span style={{ fontSize: 11, color: TEC_COLORS.subtext, border: `1px solid ${TEC_COLORS.gold}33`, borderRadius: 999, padding: '2px 10px' }}>
              {source === 'live'? 'live': 'read-only'} · {policies.length} policies
            </span>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {policies.map((p) => (
              <Link key={p.id} href={`/policy/${p.id}`} style={{ ...card, display: 'block', textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: TEC_COLORS.text }}>
                    <span style={{ color: TEC_COLORS.gold }}>{p.id}</span> · {p.domain}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', color: p.enforcement === 'hard' ? TEC_COLORS.error : TEC_COLORS.gold, border: `1px solid ${p.enforcement === 'hard' ? TEC_COLORS.error : TEC_COLORS.gold}55`, borderRadius: 999, padding: '2px 8px' }}>
                    {p.enforcement === 'hard' ? '⛔ hard' : '⚠️ soft'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 5, lineHeight: 1.5 }}>{p.rule}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Subscription tiers — SYSTEM enforces gating server-side (§5). */}
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>Subscription Tiers</h2>
          <p style={{ fontSize: 12, color: TEC_COLORS.subtext, margin: '6px 0 12px', lineHeight: 1.5 }}>
            The canonical capability map SYSTEM is the authority for. Apps query it;
            access is always checked securely on the server.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {tiers.map((t: TierDef) => (
              <div key={t.tier} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: TEC_COLORS.gold }}>{t.tier}</span>
                  <span style={{ fontSize: 11, color: TEC_COLORS.subtext }}>{t.priceHint}</span>
                </div>
                <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                  {t.capabilities.map((c) => (
                    <li key={c} style={{ fontSize: 12, color: TEC_COLORS.subtext, lineHeight: 1.7 }}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Capability registry — C-94 lifecycle. */}
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>Capability Registry <span style={{ fontSize: 12, color: TEC_COLORS.subtext, fontWeight: 600 }}></span></h2>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {capabilities.map((c: Capability) => {
              const st = STATUS_META[c.governanceStatus];
              return (
                <div key={c.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: TEC_COLORS.text }}>{c.id}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', color: toneColor(st.tone), border: `1px solid ${toneColor(st.tone)}55`, borderRadius: 999, padding: '2px 8px' }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: TEC_COLORS.gold, marginTop: 3 }}>owner: {c.owner}</div>
                  <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 5, lineHeight: 1.5 }}>{c.note}</div>
                </div>
              );
            })}
          </div>
        </section>

        <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '24px 0 0', lineHeight: 1.5 }}>
          System defines and publishes the platform&apos;s rules. It doesn&apos;t process
          payments or verify identity itself — those are handled by their dedicated
          systems. Rule changes are made by administrators with a full audit trail.
        </p>
        <InviteCard />
      </div>
    </main>
  );
}
