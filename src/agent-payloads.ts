import type { IntentEvent } from './intentlm.js';

/** Resolved copy shown inside the floating agent primitive */
export interface AgentDisplayPayload {
  intent: string;
  confidence: number;
  headline: string;
  body: string;
  cta: string;
  ctaUrl?: string;
  /** Live countdown for flash offers (minutes from when the agent is shown) */
  urgencyMinutes?: number;
  analyzeLatencyMs?: number;
}

/** Per-intent overrides supplied at init time */
export type AgentActionOverride = Partial<
  Pick<AgentDisplayPayload, 'headline' | 'body' | 'cta' | 'ctaUrl' | 'urgencyMinutes'>
>;

export interface ResolveAgentPayloadOptions {
  /** Default plans/pricing page — used for upgrade/expansion intents and generic fallbacks */
  pricingUrl?: string;
}

/** Soft phrasing for intent classes — never stated as fact */
const INTENT_INTEREST_LABELS: Record<string, string> = {
  EXPANSION_SIGNAL_DETECTED: 'a plan change',
  UPGRADE_SEEKING: 'an upgrade',
  USAGE_LIMIT_APPROACHING: 'more usage headroom',
  ENTERPRISE_INTENT: 'enterprise options',
  TRIAL_PURCHASE_READY: 'a paid plan',
  RENEWAL_READY: 'renewal',
  CHECKOUT_ABANDONMENT: 'checkout',
  CHECKOUT_FRICTION: 'checkout',
  PURCHASE_READY: 'a purchase',
  PURCHASE_INTENT: 'completing your order',
  CART_ABANDONMENT_IMMINENT: 'your order',
  CHURN_SIGNAL_DETECTED: 'account changes',
  UX_FRICTION: 'a workflow',
  ACTIVATION_STALLED: 'getting started',
  ONBOARDING_ACTIVE: 'onboarding',
  SUPPORT_NEEDED: 'getting help',
  SELF_SERVE_LEARNING: 'learning the product',
  NAVIGATION_CONFUSION: 'finding something in the product',
};

/** Intents where the primary CTA should route to pricing/plans */
const PRICING_INTENTS = new Set([
  'EXPANSION_SIGNAL_DETECTED',
  'UPGRADE_SEEKING',
  'USAGE_LIMIT_APPROACHING',
  'ENTERPRISE_INTENT',
  'TRIAL_PURCHASE_READY',
  'RENEWAL_READY',
]);

const DEFAULT_BY_INTENT: Record<string, AgentActionOverride> = {
  CHURN_SIGNAL_DETECTED: {
    headline: 'Before you go',
    body:
      'If something specific is not working well for your team, we would like to understand what is driving this before you make any changes.',
    cta: 'Talk to us',
  },
  CART_ABANDONMENT_IMMINENT: {
    headline: 'Still thinking it over?',
    body:
      'Your headphones are reserved in cart with free shipping. ' +
      'Happy to answer sizing, returns, or payment questions — no pressure.',
    cta: 'Return to checkout',
  },
  PURCHASE_INTENT: {
    headline: '15% off — finish in 5 minutes',
    body:
      'Complete checkout in the next 5 minutes and save 15% on this order. ' +
      'Your session-only code SAVE15 applies at payment.',
    cta: 'Apply discount & checkout',
    urgencyMinutes: 5,
  },
  PURCHASE_READY: {
    headline: '15% off — finish in 5 minutes',
    body:
      'You are close — complete your order in the next 5 minutes for 15% off. ' +
      'Code SAVE15 is ready at checkout.',
    cta: 'Continue with discount',
    urgencyMinutes: 5,
  },
  CHECKOUT_ABANDONMENT: {
    headline: 'Pick up where you left off',
    body:
      'If you stepped away from checkout, you can continue whenever you are ready — we can help with payment or shipping questions.',
    cta: 'Continue checkout',
  },
  UPGRADE_SEEKING: {
    headline: 'Exploring options?',
    body:
      'If an upgrade might be on your radar, our pricing page can help you compare tiers and see what changes between plans.',
    cta: 'View plans',
  },
  EXPANSION_SIGNAL_DETECTED: {
    headline: 'Comparing plans?',
    body:
      'If a plan change is something you are considering, our pricing page breaks down what is included on each tier.',
    cta: 'View plans',
  },
  USAGE_LIMIT_APPROACHING: {
    headline: 'Need more headroom?',
    body:
      'If you are running into usage limits, our pricing page shows which plans may give you more capacity.',
    cta: 'View plans',
  },
  ENTERPRISE_INTENT: {
    headline: 'Enterprise fit?',
    body:
      'If enterprise features are what you are looking into, our pricing page covers standard tiers — or we can discuss a custom option.',
    cta: 'View plans',
  },
  CHECKOUT_FRICTION: {
    headline: 'Checkout feeling sticky?',
    body:
      'If something is getting in the way of checkout, tell us what you are trying to do and we will help you finish.',
    cta: 'Get checkout help',
  },
  UX_FRICTION: {
    headline: 'Something not working?',
    body:
      'If something in the product does not seem to be working as expected, live chat or a support ticket may help you get unstuck.',
    cta: 'Get support',
  },
  SUPPORT_NEEDED: {
    headline: 'Need a hand?',
    body:
      'If something in the product is not clicking, we can help — live chat or a support ticket are both options.',
    cta: 'Get support',
  },
  SELF_SERVE_LEARNING: {
    headline: 'Learning the product?',
    body:
      'If you are exploring how things work, the tutorial and FAQ in our help center may be a good place to start.',
    cta: 'View tutorial',
  },
  NAVIGATION_CONFUSION: {
    headline: 'Looking for something?',
    body:
      'If you are having trouble finding what you need, our FAQ or support team may be able to point you in the right direction.',
    cta: 'Browse FAQ',
  },
};

export function humanizeIntentInterest(intent: string): string {
  return (
    INTENT_INTEREST_LABELS[intent] ??
    intent
      .replace(/_DETECTED$/, '')
      .replace(/_SIGNAL$/, '')
      .replace(/_IMMINENT$/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
  );
}

function pricingBody(interest: string): string {
  return (
    `If our read of your session suggests you might be exploring ${interest}, ` +
    'our pricing page compares plans side by side.'
  );
}

function defaultBodyForIntent(intent: string, pricingUrl?: string): string {
  const interest = humanizeIntentInterest(intent);
  if (pricingUrl && (PRICING_INTENTS.has(intent) || !DEFAULT_BY_INTENT[intent])) {
    return pricingBody(interest);
  }
  return `If you are working through something related to ${interest}, we are here if you have questions.`;
}

function defaultHeadlineForIntent(intent: string): string {
  if (PRICING_INTENTS.has(intent)) return 'Comparing plans?';
  return 'Can we help?';
}

function defaultCtaForIntent(intent: string, pricingUrl?: string): string {
  if (PRICING_INTENTS.has(intent) || (pricingUrl && !DEFAULT_BY_INTENT[intent])) {
    return 'View plans';
  }
  return 'Continue';
}

/**
 * Merge server intent event with optional customer overrides into display payload.
 */
export function resolveAgentPayload(
  event: IntentEvent,
  overrides?: Record<string, AgentActionOverride>,
  fallback?: AgentActionOverride,
  options?: ResolveAgentPayloadOptions,
): AgentDisplayPayload {
  const preset = DEFAULT_BY_INTENT[event.intent] ?? {};
  const custom = overrides?.[event.intent] ?? {};
  const base = { ...preset, ...fallback, ...custom };

  const usesPricingCta =
    PRICING_INTENTS.has(event.intent) ||
    (options?.pricingUrl !== undefined && !preset.ctaUrl && !custom.ctaUrl);

  const ctaUrl =
    base.ctaUrl ??
    (usesPricingCta && options?.pricingUrl ? options.pricingUrl : undefined);

  return {
    intent: event.intent,
    confidence: event.confidence,
    headline: base.headline ?? defaultHeadlineForIntent(event.intent),
    body: base.body ?? defaultBodyForIntent(event.intent, options?.pricingUrl),
    cta: base.cta ?? defaultCtaForIntent(event.intent, options?.pricingUrl),
    ...(ctaUrl !== undefined ? { ctaUrl } : {}),
    ...(base.urgencyMinutes !== undefined ? { urgencyMinutes: base.urgencyMinutes } : {}),
    ...(event.analyze_latency_ms !== undefined
      ? { analyzeLatencyMs: event.analyze_latency_ms }
      : {}),
  };
}
