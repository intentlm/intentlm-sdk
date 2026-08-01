/**
 * Example: Customer Integration
 *
 * This is all the customer writes. Everything below is their app-specific config.
 * They never touch the SDK bundle directly.
 *
 * The patterns object maps THEIR URL structure to GLOBAL token IDs.
 * Token IDs are stable across all intentLM customers — that's what enables
 * cross-customer model training on a shared vocabulary.
 */

intentLM.init({
  apiKey: 'vibe_live_your_key_here',

  /**
   * URL pattern → global token ID
   *
   * Patterns support:
   *   /exact              exact path match
   *   /prefix*            wildcard within a segment (/pricing, /pricing-annual)
   *   /deep/**            deep wildcard (/docs/api/v2/reference/...)
   *   /users/:id/edit     named parameter segments
   *
   * All token IDs come from the global taxonomy (sdk/src/taxonomy.ts).
   * Multiple patterns can map to the same token (e.g. /pricing AND /plans both → 102).
   */
  patterns: {
    // ── Navigation
    '/':                    101,   // HOMEPAGE_VIEW
    '/pricing*':            102,   // PRICING_VIEW  ← /pricing, /pricing?plan=pro, /pricing-annual
    '/plans*':              102,   // PRICING_VIEW  ← same token, different URL alias
    '/docs/**':             103,   // DOCS_VIEW
    '/demo*':               107,   // DEMO_PAGE_VIEW

    // ── Purchase
    '/checkout*':           203,   // CHECKOUT_STARTED
    '/upgrade*':            202,   // UPGRADE_CTA_CLICK (page-level; also fired manually below)
    '/billing/history':     510,   // BILLING_HISTORY_VIEW

    // ── Churn risk
    '/cancel*':             401,   // CANCELLATION_FLOW_VIEW
    '/downgrade*':          403,   // DOWNGRADE_VIEW
    '/account/export*':     402,   // DATA_EXPORT_INITIATED

    // ── Expansion
    '/settings/team*':      607,   // INVITE_TEAM_VIEW
    '/settings/sso*':       505,   // SSO_CONFIGURATION_VIEW
    '/settings/billing*':   510,   // BILLING_HISTORY_VIEW
    '/usage*':              511,   // USAGE_DASHBOARD_VIEW

    // ── Onboarding
    '/onboarding/**':       601,   // ONBOARDING_STARTED (deep match)
    '/onboarding/complete':  604,  // ONBOARDING_COMPLETED (more specific, declare AFTER the deep match)
    '/integrations/**':      606,  // INTEGRATION_SETUP_VIEW

    // ── Support
    '/help/**':             701,   // HELP_DOC_VIEW
    '/support*':            702,   // SUPPORT_CHAT_OPENED
    '/status':              704,   // STATUS_PAGE_VIEW
  },

  /**
   * Returns true only when the user has granted analytics consent.
   * Setup/discover: temporary () => true (CLI/dashboard default).
   * Production: wire OneTrust / Cookiebot / custom CMP via Setup → Compliance.
   * Do NOT use ConsentManager?.hasGranted ?? false unless ConsentManager exists —
   * that silently blocks all capture when the global is missing.
   */
  consentCheck: () => true,

  // _ilm_vid follows analytics consent (default). Set false for session-only mode.
  enableVisitorPersistence: true,
  debug: false,                     // set true in dev to log analyze/ingest errors
  trackBehavior: true,              // false disables idle/rage/scroll/tab detectors
});

// On logout — new session, same visitor cookie:
// intentLM.reset();


// ── Manual semantic events ───────────────────────────────────────────────────
//
// ── In-app views (logged-in SPA screens, tabs, modals) ─────────────────────
// Map opaque view ids → tokens in init({ views }). Works for any framework.
//
//   intentLM.init({
//     apiKey: '...',
//     patterns: { '/': 101, '/pricing*': 102 },
//     views: {
//       'app.dashboard': 805,
//       'app.settings': 806,
//     },
//     coreActionToken: 605,  // FIRST_CORE_ACTION — your product's "aha" moment
//   });
//
//   intentLM.setView('app.dashboard');
//   intentLM.captureCoreAction();
//
// React: import { useIntentLMView } from 'intentlm-sdk/react';
// Router: createPathViewBinder({ '/app/*': 'app.shell' }, (id) => intentLM.setView(id));

// For high-value interactions that aren't route changes, call intentLM.capture()
// directly in your component/handler. Use the label string from sdk/src/taxonomy.ts.
//
// This is more reliable than DOM autocapture because YOU control the semantic label.

// Button click inside the app
document.querySelector('#upgrade-btn')?.addEventListener('click', () => {
  intentLM.capture('UPGRADE_CTA_CLICK');   // token 202
});

// Plan comparison table interaction
document.querySelectorAll('[data-plan-toggle]').forEach(el => {
  el.addEventListener('click', () => {
    intentLM.capture('PLAN_COMPARISON_VIEW');   // token 201
  });
});

// Feature gate hit (when your app blocks a user from a paid feature)
function showUpgradeModal(featureName) {
  intentLM.capture('FEATURE_GATE_HIT');   // token 504
  openModal(featureName);
}

// Checkout form error (fired from your validation logic, not a URL change)
function onPaymentError(err) {
  intentLM.capture('PAYMENT_FORM_ERROR');  // token 206
  showErrorBanner(err);
}

// NPS score submitted
function onNpsSubmit(score) {
  if (score <= 5) {
    intentLM.capture('NPS_SURVEY_LOW');    // token 404
  }
  submitNpsToBackend(score);
}

// Seat limit reached (fired from your team invite logic)
function onInviteBlocked() {
  intentLM.capture('SEAT_CAPACITY_REACHED');  // token 501
  showSeatLimitBanner();
}


// ── Receiving intent evaluations ─────────────────────────────────────────────
//
// Option A (recommended): intentlm-actions Shadow DOM agent.
// Renders a floating in-product agent when the server returns trigger_nudge: true
// (confidence cleared the customer's sensitivity threshold).

import { initIntentLMActions } from 'intentlm-sdk/actions';

initIntentLMActions({
  position: 'bottom-left',
  actions: {
    CHURN_SIGNAL_DETECTED: {
      headline: 'Before you go',
      body: 'Is something specific not working well for your team?',
      cta: 'Talk to us',
    },
  },
  onCtaClick(event) {
    // Route to Intercom, Sierra, or your own workflow
    console.log('IntentLM agent CTA', event.intent, event.confidence);
  },
});

// Option B: custom handler on the stable __ILM_ON_INTENT__ contract.
// Fires only when trigger_nudge is true (threshold already applied server-side).
//
// window.__ILM_ON_INTENT__ = function (intentData) {
//   // {
//   //   intent: 'CHECKOUT_FRICTION',
//   //   confidence: 0.91,
//   //   trigger_nudge: true,
//   //   model_tier: 'markov',
//   //   analyze_latency_ms: 47,
//   //   request_id: '...',
//   //   session_id: '...'
//   // }
//   window.__AGENT_INTENT_CONTEXT__ = intentData;
// };
