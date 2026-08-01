/** @jest-environment jsdom */

import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import type { IntentEvent } from '../src/intentlm.js';
import { intentLM } from '../src/intentlm.js';
import {
  initIntentLMActions,
  clearAgentDismissals,
  dismissIntentLMAgent,
  getActiveAgentEvent,
  resolveAgentPayload,
  DEFAULT_AUTO_DISMISS_MS,
} from '../src/intentlm-actions.js';

function churnEvent(overrides: Partial<IntentEvent> = {}): IntentEvent {
  return {
    intent: 'CHURN_SIGNAL_DETECTED',
    confidence: 0.91,
    model_tier: 'markov',
    trigger_nudge: true,
    suppressed: false,
    request_id: 'req-1',
    session_id: 'sess-1',
    analyze_latency_ms: 42,
    ...overrides,
  };
}

describe('resolveAgentPayload', () => {
  it('uses preset copy for churn', () => {
    const payload = resolveAgentPayload(churnEvent());
    expect(payload.headline).toBe('Before you go');
    expect(payload.body).toContain('If something specific is not working well');
    expect(payload.analyzeLatencyMs).toBe(42);
  });

  it('applies customer overrides', () => {
    const payload = resolveAgentPayload(churnEvent(), {
      CHURN_SIGNAL_DETECTED: { headline: 'Custom', body: 'Custom body', cta: 'Go' },
    });
    expect(payload.headline).toBe('Custom');
    expect(payload.body).toBe('Custom body');
    expect(payload.cta).toBe('Go');
  });

  it('uses subtle pricing copy and CTA for expansion intents', () => {
    const payload = resolveAgentPayload(
      churnEvent({ intent: 'EXPANSION_SIGNAL_DETECTED' }),
      undefined,
      undefined,
      { pricingUrl: '/pricing' },
    );
    expect(payload.body).toContain('If a plan change is something you are considering');
    expect(payload.body).not.toContain("We noticed you're interested");
    expect(payload.cta).toBe('View plans');
    expect(payload.ctaUrl).toBe('/pricing');
  });

  it('uses support presets without pricing CTA', () => {
    const support = resolveAgentPayload(
      churnEvent({ intent: 'SUPPORT_NEEDED' }),
      { SUPPORT_NEEDED: { ctaUrl: '/help#chat' } },
      undefined,
      { pricingUrl: '/pricing' },
    );
    expect(support.body).toContain('If something in the product is not clicking');
    expect(support.cta).toBe('Get support');
    expect(support.ctaUrl).toBe('/help#chat');

    const learning = resolveAgentPayload(
      churnEvent({ intent: 'SELF_SERVE_LEARNING' }),
      { SELF_SERVE_LEARNING: { ctaUrl: '/help#tutorial' } },
    );
    expect(learning.body).toContain('tutorial and FAQ');
    expect(learning.cta).toBe('View tutorial');
    expect(learning.ctaUrl).toBe('/help#tutorial');
    expect(learning.ctaUrl).not.toBe('/pricing');
  });

  it('matches traditional cart recovery copy for cart abandonment', () => {
    const payload = resolveAgentPayload(
      churnEvent({ intent: 'CART_ABANDONMENT_IMMINENT' }),
      { CART_ABANDONMENT_IMMINENT: { ctaUrl: '/checkout' } },
    );
    expect(payload.headline).toBe('Still thinking it over?');
    expect(payload.body).toBe(
      'Your headphones are reserved in cart with free shipping. ' +
        'Happy to answer sizing, returns, or payment questions — no pressure.',
    );
    expect(payload.cta).toBe('Return to checkout');
  });

  it('uses purchase intent discount preset with urgency timer', () => {
    const payload = resolveAgentPayload(
      churnEvent({ intent: 'PURCHASE_INTENT' }),
      { PURCHASE_INTENT: { ctaUrl: '/checkout' } },
    );
    expect(payload.headline).toContain('15%');
    expect(payload.body).toContain('SAVE15');
    expect(payload.urgencyMinutes).toBe(5);
    expect(payload.ctaUrl).toBe('/checkout');
  });

  it('humanizes unknown intents with hedged phrasing', () => {
    const payload = resolveAgentPayload(
      churnEvent({ intent: 'POWER_USER_SIGNAL' }),
      undefined,
      undefined,
      { pricingUrl: '/plans' },
    );
    expect(payload.body).toContain('might be exploring');
    expect(payload.body).not.toContain("We noticed you're interested");
    expect(payload.ctaUrl).toBe('/plans');
  });
});

describe('initIntentLMActions', () => {
  let teardown: () => void;

  beforeEach(() => {
    document.body.innerHTML = '';
    window.sessionStorage.clear();
    window.localStorage.clear();
    delete (window as Window & { __ILM_ON_INTENT__?: (e: IntentEvent) => void }).__ILM_ON_INTENT__;
    jest.spyOn(intentLM, 'recordAgentResponse').mockImplementation(() => {});
    teardown = initIntentLMActions({ position: 'bottom-left' });
  });

  afterEach(() => {
    teardown();
    dismissIntentLMAgent();
    jest.restoreAllMocks();
  });

  it('renders shadow agent when trigger_nudge is true', () => {
    window.__ILM_ON_INTENT__?.(churnEvent());
    const agent = document.querySelector('intentlm-agent');
    expect(agent).not.toBeNull();
    expect(agent?.shadowRoot?.textContent).toContain('Before you go');
    expect(agent?.shadowRoot?.textContent).toContain('engaged in 42ms');
  });

  it('does not render when trigger_nudge is false', () => {
    window.__ILM_ON_INTENT__?.(churnEvent({ trigger_nudge: false }));
    expect(document.querySelector('intentlm-agent')).toBeNull();
  });

  it('does not render below 70% confidence', () => {
    window.__ILM_ON_INTENT__?.(churnEvent({ confidence: 0.69 }));
    expect(document.querySelector('intentlm-agent')).toBeNull();
  });

  it('renders at or above 70% confidence', () => {
    window.__ILM_ON_INTENT__?.(churnEvent({ confidence: 0.70 }));
    expect(document.querySelector('intentlm-agent')).not.toBeNull();

    dismissIntentLMAgent();
    window.__ILM_ON_INTENT__?.(
      churnEvent({ intent: 'SUPPORT_NEEDED', confidence: 0.76, trigger_nudge: true }),
    );
    expect(document.querySelector('intentlm-agent')).not.toBeNull();
  });

  it('renders on confidence alone when engageOnConfidence is enabled', () => {
    teardown()
    dismissIntentLMAgent()
    teardown = initIntentLMActions({
      position: 'bottom-left',
      engageOnConfidence: true,
      minConfidence: 0.70,
    })
    window.__ILM_ON_INTENT__?.(
      churnEvent({
        intent: 'UPGRADE_SEEKING',
        confidence: 0.89,
        trigger_nudge: false,
      }),
    )
    expect(document.querySelector('intentlm-agent')).not.toBeNull()
  })

  it('respects session dismiss', () => {
    teardown();
    teardown = initIntentLMActions({ dismissMode: 'session', engageOnConfidence: true });
    window.__ILM_ON_INTENT__?.(churnEvent());
    const dismiss = document
      .querySelector('intentlm-agent')
      ?.shadowRoot?.querySelector('.dismiss') as HTMLButtonElement;
    dismiss.click();
    expect(document.querySelector('intentlm-agent')).toBeNull();

    window.__ILM_ON_INTENT__?.(churnEvent());
    expect(document.querySelector('intentlm-agent')).toBeNull();
  });

  it('hides agent when confidence drops below minConfidence', () => {
    teardown();
    teardown = initIntentLMActions({ engageOnConfidence: true, minConfidence: 0.70 });
    window.__ILM_ON_INTENT__?.(churnEvent({ confidence: 0.91 }));
    expect(document.querySelector('intentlm-agent')).not.toBeNull();
    window.__ILM_ON_INTENT__?.(
      churnEvent({ intent: 'SUPPORT_NEEDED', confidence: 0.23, trigger_nudge: true }),
    );
    expect(document.querySelector('intentlm-agent')).toBeNull();
  });

  it('keepVisibleUntilDismiss preserves agent on ineligible follow-up events', () => {
    teardown();
    teardown = initIntentLMActions({
      engageOnConfidence: true,
      minConfidence: 0.70,
      keepVisibleUntilDismiss: true,
      autoDismissMs: DEFAULT_AUTO_DISMISS_MS,
    });
    window.__ILM_ON_INTENT__?.(churnEvent({ intent: 'SUPPORT_NEEDED', confidence: 0.91 }));
    expect(document.querySelector('intentlm-agent')).not.toBeNull();
    window.__ILM_ON_INTENT__?.(
      churnEvent({ intent: 'AGENT_JURISDICTION_BYPASS', confidence: 0.95, suppressed: true }),
    );
    expect(document.querySelector('intentlm-agent')).not.toBeNull();
    window.__ILM_ON_INTENT__?.(
      churnEvent({ intent: 'NAVIGATION_CONFUSION', confidence: 0.25, trigger_nudge: true }),
    );
    expect(document.querySelector('intentlm-agent')).not.toBeNull();
  });

  it('keepVisibleUntilDismiss replaces agent when a new eligible intent arrives', () => {
    teardown();
    teardown = initIntentLMActions({
      engageOnConfidence: true,
      keepVisibleUntilDismiss: true,
    });
    window.__ILM_ON_INTENT__?.(
      churnEvent({ intent: 'NAVIGATION_CONFUSION', confidence: 0.82 }),
    );
    window.__ILM_ON_INTENT__?.(
      churnEvent({ intent: 'SUPPORT_NEEDED', confidence: 0.91 }),
    );
    expect(getActiveAgentEvent()?.intent).toBe('SUPPORT_NEEDED');
  });

  it('shouldShowAgent can block adversarial intents above minConfidence', () => {
    teardown();
    teardown = initIntentLMActions({
      engageOnConfidence: true,
      minConfidence: 0.70,
      shouldShowAgent: event => event.intent !== 'AGENT_JURISDICTION_BYPASS',
    });
    window.__ILM_ON_INTENT__?.(
      churnEvent({ intent: 'AGENT_JURISDICTION_BYPASS', confidence: 0.95 }),
    );
    expect(document.querySelector('intentlm-agent')).toBeNull();
  });

  it('none dismiss mode still suppresses intent for the session after first show', () => {
    teardown();
    teardown = initIntentLMActions({ dismissMode: 'none', engageOnConfidence: true });
    window.__ILM_ON_INTENT__?.(churnEvent());
    const dismiss = document
      .querySelector('intentlm-agent')
      ?.shadowRoot?.querySelector('.dismiss') as HTMLButtonElement;
    dismiss.click();
    expect(document.querySelector('intentlm-agent')).toBeNull();
    expect(sessionStorage.getItem('ilm_agent_dismiss_CHURN_SIGNAL_DETECTED')).toBe('1');

    window.__ILM_ON_INTENT__?.(churnEvent());
    expect(document.querySelector('intentlm-agent')).toBeNull();
  });

  it('clearAgentDismissals allows the agent to show again after dismiss', () => {
    window.__ILM_ON_INTENT__?.(churnEvent());
    const dismiss = document
      .querySelector('intentlm-agent')
      ?.shadowRoot?.querySelector('.dismiss') as HTMLButtonElement;
    dismiss.click();
    expect(document.querySelector('intentlm-agent')).toBeNull();

    clearAgentDismissals();
    window.__ILM_ON_INTENT__?.(churnEvent());
    expect(document.querySelector('intentlm-agent')).not.toBeNull();
  });

  it('renders scoped styles inside shadow root', () => {
    window.__ILM_ON_INTENT__?.(churnEvent());
    const shadow = document.querySelector('intentlm-agent')?.shadowRoot;
    expect(shadow?.querySelector('style')?.textContent).toContain('.cta');
    expect(shadow?.querySelector('.cta')).not.toBeNull();
  });

  it('shows explain control when getTourExplain returns payload', () => {
    teardown();
    teardown = initIntentLMActions({
      engageOnConfidence: true,
      getTourExplain: () => ({
        tourTitle: 'B2B Upgrade',
        journey: 'User visited pricing and clicked upgrade.',
        intent: 'UPGRADE_SEEKING',
        confidence: 0.91,
        confidenceSummary: 'above the 70% demo threshold, so the floating agent engaged',
        ctaLabel: 'View plans',
        ctaRationale: 'pricing tokens predict upgrade intent.',
        tokenTrail: 'PRICING_VIEW → UPGRADE_CTA_CLICK',
      }),
    });
    window.__ILM_ON_INTENT__?.(churnEvent({ intent: 'UPGRADE_SEEKING' }));
    const shadow = document.querySelector('intentlm-agent')?.shadowRoot;
    expect(shadow?.getElementById('intentlm-explain-btn')).not.toBeNull();
    (shadow?.getElementById('intentlm-explain-btn') as HTMLButtonElement).click();
    expect(shadow?.getElementById('intentlm-explain')?.classList.contains('hidden')).toBe(false);
    expect(shadow?.getElementById('intentlm-explain')?.textContent).toContain('B2B Upgrade');
  });

  it('auto-dismisses after DEFAULT_AUTO_DISMISS_MS and suppresses re-show for the session', () => {
    jest.useFakeTimers();
    teardown();
    teardown = initIntentLMActions({ dismissMode: 'none', engageOnConfidence: true });
    window.__ILM_ON_INTENT__?.(churnEvent());
    expect(document.querySelector('intentlm-agent')).not.toBeNull();
    expect(sessionStorage.getItem('ilm_agent_dismiss_CHURN_SIGNAL_DETECTED')).toBe('1');

    jest.advanceTimersByTime(DEFAULT_AUTO_DISMISS_MS);
    expect(document.querySelector('intentlm-agent')).toBeNull();

    window.__ILM_ON_INTENT__?.(churnEvent());
    expect(document.querySelector('intentlm-agent')).toBeNull();
    jest.useRealTimers();
  });

  it('shows each intent at most once per session', () => {
    teardown();
    teardown = initIntentLMActions({ engageOnConfidence: true });
    window.__ILM_ON_INTENT__?.(churnEvent({ intent: 'UPGRADE_SEEKING', confidence: 0.88 }));
    expect(document.querySelector('intentlm-agent')).not.toBeNull();

    window.__ILM_ON_INTENT__?.(churnEvent({ intent: 'UPGRADE_SEEKING', confidence: 0.95 }));
    expect(document.querySelectorAll('intentlm-agent').length).toBe(1);

    window.__ILM_ON_INTENT__?.(churnEvent({ intent: 'SUPPORT_NEEDED', confidence: 0.91 }));
    expect(document.querySelectorAll('intentlm-agent').length).toBe(1);
    expect(document.querySelector('intentlm-agent')?.shadowRoot?.textContent).toContain('help');
  });

  it('records agent CTA click via intentLM.recordAgentResponse', () => {
    teardown();
    teardown = initIntentLMActions({
      dismissMode: 'none',
      engageOnConfidence: true,
      actions: { CHURN_SIGNAL_DETECTED: { ctaUrl: '/help' } },
    });
    window.__ILM_ON_INTENT__?.(churnEvent());
    const cta = document
      .querySelector('intentlm-agent')
      ?.shadowRoot?.getElementById('intentlm-cta') as HTMLButtonElement;
    cta.click();

    expect(intentLM.recordAgentResponse).toHaveBeenCalledWith({
      intent: 'CHURN_SIGNAL_DETECTED',
      confidence: 0.91,
      ctaLabel: expect.any(String),
      ctaUrl: '/help',
      requestId: 'req-1',
      sessionId: 'sess-1',
    });
  });

  it('suppresses agent for the session after CTA click even when dismissMode is none', () => {
    teardown();
    teardown = initIntentLMActions({
      dismissMode: 'none',
      engageOnConfidence: true,
      actions: { CHURN_SIGNAL_DETECTED: { ctaUrl: '/help' } },
    });
    window.__ILM_ON_INTENT__?.(churnEvent());
    const cta = document
      .querySelector('intentlm-agent')
      ?.shadowRoot?.getElementById('intentlm-cta') as HTMLButtonElement;
    cta.click();
    expect(document.querySelector('intentlm-agent')).toBeNull();
    expect(sessionStorage.getItem('ilm_agent_dismiss_CHURN_SIGNAL_DETECTED')).toBe('1');

    window.__ILM_ON_INTENT__?.(churnEvent({ confidence: 0.95 }));
    expect(document.querySelector('intentlm-agent')).toBeNull();
  });
});
