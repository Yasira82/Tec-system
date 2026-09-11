// The Pay tap must not contain a Pi handshake.
//
// The reported sequence: pay in the Hub → come back to the app → tap Pay → it
// hangs. Nothing about the tap changed; what changed is that Pi Browser was
// left inside the Hub's Pi app, so the app's authenticate had to switch app
// context first — and that call sat AFTER the tap, so the button froze.
//
// The handshake cannot be made faster. It can happen at page load instead, and
// that is what these tests pin: one handshake, started early, joined (never
// duplicated) by the tap.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { piSession } from '@/lib/pi/pi-session';
import { PiRuntime } from '@/lib/pi/PiRuntime';

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const w = () => window as unknown as Record<string, unknown>;

const installPi = (authenticate: (...a: unknown[]) => unknown) => {
  w().Pi = { authenticate, createPayment: () => {}, init: () => {} };
};

describe('the Pi session is established once', () => {
  beforeEach(() => {
    piSession.reset();
    delete w().Pi;
    delete w().__TEC_PI_FOREIGN_SESSION;
    vi.restoreAllMocks();
  });

  it('a tap during the warm-up JOINS it — never a second concurrent authenticate', async () => {
    // Two concurrent Pi.authenticate calls are what Pi Browser answers neither
    // of; the loser dies silently on its own timer. That is the defect this
    // whole file exists for.
    const d = deferred<unknown>();
    let calls = 0;
    installPi(() => { calls += 1; return d.promise; });

    piSession.warm();                    // page load
    const tap = piSession.ensureAuth();  // user taps mid-handshake
    await Promise.resolve();
    expect(calls).toBe(1);

    d.resolve({ user: 'x' });
    await expect(tap).resolves.toBe(true);
    expect(calls).toBe(1);
  });

  it('after a successful warm-up the tap calls Pi ZERO times', async () => {
    let calls = 0;
    installPi(() => { calls += 1; return Promise.resolve({ user: 'x' }); });

    await piSession.ensureAuth();
    expect(calls).toBe(1);

    // This is the user-visible promise: the tap resolves with no Pi round-trip.
    await expect(piSession.ensureAuth()).resolves.toBe(true);
    expect(calls).toBe(1);
  });

  it('a failed warm-up is not sticky — the tap retries', async () => {
    let calls = 0;
    installPi(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('TIMEOUT')) : Promise.resolve({ user: 'x' });
    });

    await expect(piSession.ensureAuth()).resolves.toBe(false);
    await expect(piSession.ensureAuth()).resolves.toBe(true);
    expect(calls).toBe(2);
  });

  it('refuses to authenticate in a Hub-owned session (ADR-007)', async () => {
    let calls = 0;
    installPi(() => { calls += 1; return Promise.resolve({ user: 'x' }); });
    w().__TEC_PI_FOREIGN_SESSION = true;

    await expect(piSession.ensureAuth()).resolves.toBe(false);
    expect(calls).toBe(0);   // the call that never answers is never made
  });

  it('a login is adopted, so the first tap does not re-handshake', async () => {
    installPi(() => { throw new Error('must not authenticate again'); });
    piSession.markAuthenticated();
    await expect(piSession.ensureAuth()).resolves.toBe(true);
  });

  it('adoption is not a bypass — no SDK means no session', () => {
    piSession.markAuthenticated();
    delete w().Pi;
    expect(piSession.isAuthenticated).toBe(false);
  });

  it('goes through PiRuntime, so the circuit breaker still sees the call', async () => {
    installPi(() => Promise.resolve({ user: 'x' }));
    const spy = vi.spyOn(PiRuntime, 'authenticate');
    await piSession.ensureAuth();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('the payment path owns no handshake of its own', () => {
  const read = (p: string) =>
    require('node:fs').readFileSync(require('node:path').join(process.cwd(), p), 'utf8');

  it('createU2APayment authenticates through the session, not directly', () => {
    // A raw `Pi.authenticate(` reintroduced here puts the wait back on the tap
    // AND re-opens the concurrency bug — with no symptom but a frozen button.
    const src = read('src/lib/pi-payment.ts');
    expect(src).toContain('piSession.ensureAuth()');
    const code = src.split('\n').filter((l: string) =>
      !l.trim().startsWith('//') && !l.trim().startsWith('*'));
    expect(code.some((l: string) => /window\.Pi\.authenticate\s*\(/.test(l))).toBe(false);
  });

  it('the warm-up is mounted for every page', () => {
    expect(read('src/app/layout.tsx')).toContain('<PiWarmup />');
  });
});
