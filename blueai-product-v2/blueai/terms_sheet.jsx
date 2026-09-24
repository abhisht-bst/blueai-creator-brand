// BlueAI — Terms bottom sheet. One component, two modes, all mounted inside .ba-app like
// every other in-app overlay (login gate z100, boot splash z200 — this sits between at z120,
// above the gate because acceptance conceptually precedes sign-in, below the splash so a cold
// start still boots on top of it):
//   'firstrun'  — first cold start: "Before you start" + "Agree and continue".
//   'update'    — the terms changed: same sheet, update wording.
// BOTH modes are blocking — no close, no scrim dismiss, no Esc; the only way forward is the CTA.
// A dismissible notice-only variant (the X.com "Got it" pattern) existed and was REMOVED
// (Abhisht, 2026-09-24): every update re-collects acceptance, which is one click either way for
// the user, deletes the per-release "is this change material?" judgment call, and produces a
// fresh consent record for every version.
// Nothing here is invented fresh:
//   - overlay containment + card palette: login.jsx (absolute inset-0 against .ba-app; white
//     card, #111827/-0.4px title, #6b7280 body, #e5e7eb hairline)
//   - CTA: login.jsx's flat #1990FF pill + its shared hover lift (blueBtn's exact values)
//   - motion: the house curve cubic-bezier(0.22,1,0.36,1) used across this product's intros
//   - consent line: the website SignInDialog's approved sentence shape, re-pointed at the
//     BlueAI Partner Program Terms (see the note on MODES for why that document, not the TOU)
//   - links: the real legal page (same tabs/anchors the website links), new tab on purpose —
//     never cost the user their place in the app. Relative URL: resolves on the deployment
//     (blueai-screen-library.vercel.app/onblue/terms); 404s on a bare static file server, which
//     is fine — the prototype's job is the sheet, not the destination.
// Exposes window.TermsSheet = { TermsSheet }.
(function () {
  const { useState } = React;

  const TERMS_URL = '/onblue/terms';

  const LegalLink = ({ anchor, children }) => (
    <a href={TERMS_URL + '#' + anchor} target="_blank" rel="noopener"
      style={{ color: '#1990FF', textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 600 }}>
      {children}
    </a>
  );

  // Body copy is JSX (it carries live anchors), so modes hold render functions, not strings.
  const MODES = {
    // The app's governing contract is the BlueAI Partner Program Terms (2026-09-14 legal set;
    // per its "order of documents" section it governs over the site TOU for anything
    // Program-related), so first-run acceptance names IT, not the site Terms of Use.
    // #program is the legal page's PLANNED Program Terms tab — the page rework is a separate
    // task; until it lands the link resolves to the page top, which is still the right page.
    // The arbitration `note` is required at the point of agreement: both contracts open with
    // "BY CLICKING 'I AGREE' BELOW..." and a conspicuous arbitration notice, so every BLOCKING
    // (accepting) mode carries it. The notice-only update mode is not an acceptance moment.
    // Button stays "Agree and continue" (Abhisht, 2026-09-18).
    firstrun: {
      title: 'Before you start',
      body: () => (
        // "Program Terms", not the full program name — the program's name can change, the
        // generic label can't go stale (Abhisht, 2026-09-24). The link still carries the reader
        // to the specific document.
        <>By continuing, you agree to the <LegalLink anchor="program">Program Terms</LegalLink> and{' '}
          <LegalLink anchor="privacy">Privacy Policy</LegalLink>, including{' '}
          <LegalLink anchor="cookies">Cookie Use</LegalLink>.</>
      ),
      note: 'These terms include binding arbitration for disputes.',
      cta: 'Agree and continue'
    },
    // The document names here are placeholders for whichever documents actually changed in that
    // update — in the real build they are data, not fixed copy.
    update: {
      title: 'Updates to our Terms of Use',
      body: () => (
        <>We've updated our <LegalLink anchor="terms">Terms of Use</LegalLink> and{' '}
          <LegalLink anchor="privacy">Privacy Policy</LegalLink>. Please review and accept them to
          keep using BlueAI.</>
      ),
      note: 'These terms include binding arbitration for disputes.',
      cta: 'Agree and continue'
    }
  };

  function TermsSheet({ mode, onDone }) {
    const cfg = MODES[mode] || MODES.firstrun;
    // Accepting plays the exit (sheet slides back down, scrim fades) BEFORE unmounting —
    // 'leaving' drives the exit classes, the timeout matches their 0.32s duration.
    const [leaving, setLeaving] = useState(false);
    const close = () => { if (leaving) return; setLeaving(true); setTimeout(() => onDone?.(), 340); };

    return (
      <div role="dialog" aria-modal="true" aria-label={cfg.title}
        className={'tsh-scrim' + (leaving ? ' tsh-out' : '')}
        style={{ position: 'absolute', inset: 0, zIndex: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(8,10,31,0.44)' }}>
        <style>{`
          @keyframes tshScrimIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes tshScrimOut { from { opacity: 1; } to { opacity: 0; } }
          @keyframes tshSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes tshSheetDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
          .tsh-scrim { animation: tshScrimIn 0.3s ease both; }
          .tsh-sheet { animation: tshSheetUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
          .tsh-scrim.tsh-out { animation: tshScrimOut 0.32s ease both; }
          .tsh-out .tsh-sheet { animation: tshSheetDown 0.32s cubic-bezier(0.5,0,0.75,0.4) both; }
          @media (prefers-reduced-motion: reduce) {
            .tsh-scrim, .tsh-sheet, .tsh-scrim.tsh-out, .tsh-out .tsh-sheet { animation: none !important; }
          }
        `}</style>

        <div className="tsh-sheet"
          style={{ background: 'white', borderRadius: '20px 20px 0 0', borderTop: '1px solid #e5e7eb', boxShadow: '0 -12px 40px rgba(8,10,31,0.18)', padding: '26px 24px 24px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px', lineHeight: 1.25 }}>
            {cfg.title}
          </h2>
          <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
            {cfg.body()}
          </p>
          {cfg.note &&
            <p style={{ marginTop: 6, fontSize: 11.5, color: '#9ca3af', lineHeight: 1.5 }}>
              {cfg.note}
            </p>}
          <button onClick={close}
            style={{ width: '100%', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1990FF', border: 'none', borderRadius: 999, padding: '13px 28px', fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(25,144,255,0.35)', transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.06)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(25,144,255,0.42)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.filter = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(25,144,255,0.35)'; }}>
            {cfg.cta}
          </button>
        </div>
      </div>);
  }

  window.TermsSheet = { TermsSheet };
})();
