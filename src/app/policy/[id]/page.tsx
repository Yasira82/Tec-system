// TEC System — policy detail (C-110). Read-only view of one constitutional policy
// (a C-47 Forbidden Behavior) with its enforcement class + violation response.
// SYSTEM presents policy; changes require an AdminActor + audit trail (backend
// governance service, C-110 §5) — never edited here.
import Link from 'next/link';
import type { Metadata } from 'next';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { getPolicy } from '@/lib/system/constitution';
import { resolvePolicy } from '@/lib/system/server';

// Rendered dynamically from the live governance projection (resolvePolicy does a
// no-store gateway fetch); a live 404 is authoritative → notFound(). The policies
// are the canonical C-47 constitution — definitional content, not user data.
export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const p = getPolicy(id);
  return {
    title:       p ? `${p.id} — TEC System policy` : 'TEC System — Policy',
    description: p ? p.rule : 'A TEC platform governance policy (C-110).',
  };
}

export default async function PolicyPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Resolve from the live governance projection; fall back to the curated C-47
  // registry so the page never 500s. A live 404 is authoritative → "not found".
  const { policy: p } = await resolvePolicy(id);

  const wrap: React.CSSProperties = {
    minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text,
    padding: '32px 22px', fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  const inner: React.CSSProperties = { maxWidth: 640, margin: '0 auto' };

  if (!p) {
    return (
      <main style={wrap}>
        <div style={inner}>
          <Link href="/app" style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>← Governance Console</Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: TEC_COLORS.text, marginTop: 16 }}>Policy not found</h1>
          <p style={{ fontSize: 13, color: TEC_COLORS.subtext }}>No policy <code>{id}</code> in the registry.</p>
        </div>
      </main>
    );
  }

  const hard = p.enforcement === 'hard';
  const factCard: React.CSSProperties = {
    background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}22`,
    borderRadius: 12, padding: 14,
  };

  return (
    <main style={wrap}>
      <div style={inner}>
        <Link href="/app" style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>← Governance Console</Link>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>Policy · {p.domain}</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: TEC_COLORS.gold, margin: '4px 0 0' }}>{p.id}</h1>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: hard ? '#0a0800' : TEC_COLORS.text, background: hard ? `linear-gradient(135deg, ${TEC_COLORS.error}, #b83227)` : 'transparent', border: hard ? 'none' : `1px solid ${TEC_COLORS.gold}66`, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}>
            {hard ? '⛔ hard enforcement' : '⚠️ soft enforcement'}
          </div>
        </div>

        <p style={{ fontSize: 15, color: TEC_COLORS.text, margin: '16px 0 0', lineHeight: 1.6 }}>{p.rule}</p>

        <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
          <div style={factCard}>
            <div style={{ fontSize: 13, fontWeight: 800, color: TEC_COLORS.text }}>Violation response</div>
            <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 5, lineHeight: 1.5 }}>{p.violationResponse}</div>
          </div>
          <div style={factCard}>
            <div style={{ fontSize: 13, fontWeight: 800, color: TEC_COLORS.text }}>Enforcement class</div>
            <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 5, lineHeight: 1.5 }}>
              {hard
                ? 'Hard — the owning service rejects a non-compliant request immediately (C-110 §5).'
                : 'Soft — the service logs the violation and continues (legacy compatibility).'}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '22px 0 0', lineHeight: 1.5 }}>
          Source: C-47 Forbidden Behaviors (the constitutional source of truth). SYSTEM
          presents this policy read-only; it is versioned and never deleted. Changes
          require an AdminActor + audit trail (backend governance service, C-110 §5).
        </p>
      </div>
    </main>
  );
}
