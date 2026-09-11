import { PiWarmup } from '@/components/pi/PiWarmup';
import { RefCapture } from '@/components/referral/RefCapture';
import { RefApply } from '@/components/referral/RefApply';
import { LocaleProvider } from '@/lib/i18n';
import { HUB_HOSTS } from '@/lib/pi-network';
import type { Metadata } from 'next';
import '@/styles/tec-design-tokens.css';

export const metadata: Metadata = {
  title:       'TEC System — Governance Console',
  description: 'The governance console for the TEC platform: policies, subscription tiers, and capabilities.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        {/* Full-bleed dark shell — tint the browser UI + declare dark canvas so
            no white frame shows around the app in Pi Browser. */}
        <meta name="theme-color" content="#050816" />
        <meta name="color-scheme" content="dark" />
        {/* A Mode-1 payment (ADR-007) leaves this origin entirely: the Pay tap
            navigates to the Hub. Opening that cross-origin connection now means
            the navigation is not also paying for DNS + TLS at the moment the
            user is waiting on it. Costs nothing when Mode 2 is used instead. */}
        <link rel="preconnect" href="https://hub.tecosystem.app" />
        <link rel="preconnect" href="https://tec-app-frontend.vercel.app" />
        {/* The Pi SDK is NOT loaded here. It is injected below, and ONLY when
            this is not a Hub-owned session — see the note in that script. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function() {
                // ADR-007/C-12 §3: Hub-entered = Hub owns this Pi Browser
                // session — never Pi.init() here (it poisons the session and
                // breaks the Hub PaymentModal). The SSO landing persists the
                // flag; referrer covers direct hops.
                //
                // BOTH Hub hosts. The list is interpolated from
                // lib/pi-network.ts (HUB_HOSTS) because this script runs before
                // any module and cannot import — but it must not become a
                // second, drifting copy of the answer. It named only the
                // Mainnet Hub, so a hop from the Testnet Hub ran Pi.init() into
                // a session the Hub owns and every later Pi call went silent.
                var __hubHosts = ${JSON.stringify(HUB_HOSTS)};
                var __fromHub = false;
                try {
                  __fromHub = !!document.referrer &&
                    __hubHosts.indexOf(new URL(document.referrer).hostname.toLowerCase()) !== -1;
                } catch (e) {}
                //
                // And in that session the SDK is not merely left un-init'd —
                // it is NOT LOADED AT ALL. Skipping init while still pulling
                // pi-sdk.js opened Pi's bridge on this origin anyway, which is
                // enough to contest the Pi app context the Hub is holding: the
                // Mode-1 bounce back to the Hub then had to switch context
                // before it could authenticate, and THAT is the long wait the
                // user sees (the Hub trace stops at "warming the Pi session"
                // and nothing follows). ADR-007 says an app in a Hub-owned
                // session must not touch Pi — loading its SDK is touching it.
                //
                // Fail-safe by construction: no SDK here means every buy
                // handler already refuses Mode 2 and bounces to the Hub, which
                // is exactly what ADR-007 requires of this session anyway.
                try {
                  if (sessionStorage.getItem('__tec_hub_entry') === '1' || __fromHub) {
                    window.__TEC_PI_FOREIGN_SESSION = true;
                    window.__TEC_PI_READY = true;
                    window.dispatchEvent(new Event('tec-pi-ready'));
                    return;
                  }
                } catch(e) {}

                // Standalone session — load the SDK now, then init it.
                var __boot = function () {
                  if (typeof window.Pi === 'undefined') {
                    window.__TEC_PI_ERROR = true;
                    window.dispatchEvent(new Event('tec-pi-error'));
                    return;
                  }
                  try {
                    var __isTestnetHost = /\\.vercel\\.app$/i.test(location.hostname)
                      || /-test\\.tecosystem\\.app$/i.test(location.hostname);
                    // SANDBOX IS NOT TESTNET. The HOST decides which Pi APP the
                    // visitor is in (and so which network the server approves
                    // against); "sandbox" points the SDK at Pi's SANDBOX
                    // environment, a third thing. A paired Testnet app is a
                    // normal app on its own domain — NOT the sandbox. Setting
                    // sandbox:true there left the Pi bridge silent ("Messaging
                    // promise with id 1 timed out after 120000ms"). Default
                    // false; ?pi_sandbox=1 is the way back in, honoured only on
                    // the Testnet host so no query param can put a Mainnet
                    // payment into sandbox mode.
                    var __q = null;
                    try { __q = new URLSearchParams(location.search).get('pi_sandbox'); } catch (e) {}
                    var __sandbox = __isTestnetHost
                      ? (__q === '1')
                      : ${process.env.NEXT_PUBLIC_PI_SANDBOX === 'true'};
                    window.__TEC_PI_SANDBOX = __sandbox;
                    window.Pi.init({
                      version: '2.0',
                      sandbox: __sandbox,
                    });
                    window.__TEC_PI_READY = true;
                    window.dispatchEvent(new Event('tec-pi-ready'));
                  } catch(e) {
                    window.__TEC_PI_ERROR = true;
                    window.dispatchEvent(new Event('tec-pi-error'));
                  }
                };

                if (typeof window.Pi !== 'undefined') { __boot(); return; }
                var __s = document.createElement('script');
                __s.src   = 'https://sdk.minepi.com/pi-sdk.js';
                __s.async = true;
                __s.onload  = __boot;
                __s.onerror = function () {
                  window.__TEC_PI_ERROR = true;
                  window.dispatchEvent(new Event('tec-pi-error'));
                };
                document.head.appendChild(__s);
              });
            `,
          }}
        />
      </head>
      <body>
        <LocaleProvider>
          <PiWarmup />
          <RefCapture />
          <RefApply />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
