/**
 * intentlm-actions — Shadow DOM floating agent triggered by __ILM_ON_INTENT__.
 * Loads alongside the main SDK; zero framework dependencies.
 */

import type { IntentEvent } from './intentlm.js';
import { intentLM } from './intentlm.js';
import {
  resolveAgentPayload,
  type AgentActionOverride,
  type AgentDisplayPayload,
} from './agent-payloads.js';

export type { AgentActionOverride, AgentDisplayPayload } from './agent-payloads.js';
export { resolveAgentPayload } from './agent-payloads.js';

export type AgentPosition = 'bottom-left' | 'bottom-right';

export type AgentDismissMode = 'session' | 'persistent' | 'none';

/** Sandbox “explain what happened” copy shown from the agent ⓘ control */
export interface AgentExplainPayload {
  tourTitle: string;
  journey: string;
  intent: string;
  confidence: number;
  confidenceSummary: string;
  ctaLabel: string;
  ctaRationale: string;
  tokenTrail?: string;
}

/** Agent only surfaces when confidence is at or above this value (default 70%, matches inference API). */
export const DEFAULT_MIN_CONFIDENCE = 0.70;

/** Auto-hide the floating agent after this many ms (default 5s). Set 0 to disable. */
export const DEFAULT_AUTO_DISMISS_MS = 5_000;

export interface IntentLMActionsConfig {
  /** Screen corner for the floating agent (default bottom-left) */
  position?: AgentPosition;
  /** Per-intent copy overrides */
  actions?: Record<string, AgentActionOverride>;
  /** Fallback copy when an intent has no preset */
  defaultAction?: AgentActionOverride;
  /** Default pricing/plans URL for upgrade intents and generic fallbacks */
  pricingUrl?: string;
  /** Minimum confidence to show the agent; must be >= this value (default 0.70) */
  minConfidence?: number;
  /**
   * When true, show the agent whenever confidence clears minConfidence (sandbox/demo).
   * When false (default), also requires server trigger_nudge (production webhooks).
   */
  engageOnConfidence?: boolean;
  /** How long the ✕ dismiss also persists in localStorage (`persistent` only). Session suppression applies after first show, ✕, CTA, or auto-dismiss. */
  dismissMode?: AgentDismissMode;
  /** Auto-hide the agent after this many ms (default {@link DEFAULT_AUTO_DISMISS_MS}). Set 0 to disable. */
  autoDismissMs?: number;
  /**
   * When true (or when the callback returns true), the agent stays visible until the user
   * clicks ✕ — no auto-dismiss, and sub-threshold / ineligible events do not hide it.
   * A new eligible intent still replaces the current agent card.
   */
  keepVisibleUntilDismiss?: boolean | (() => boolean);
  /** Return false to block the agent for this event (e.g. adversarial intents in sandbox). */
  shouldShowAgent?: (event: IntentEvent) => boolean;
  /**
   * POST CTA clicks to /v1/agent-response via the main SDK (default true when intentLM.init ran).
   * Set false to skip server logging.
   */
  recordCtaResponses?: boolean;
  /** Called when the CTA button is clicked */
  onCtaClick?: (event: IntentEvent, payload: AgentDisplayPayload) => void;
  /** Called when the user dismisses the agent */
  onDismiss?: (event: IntentEvent) => void;
  /** Optional sandbox copy for the ⓘ “explain what happened” panel */
  getTourExplain?: (
    event: IntentEvent,
    payload: AgentDisplayPayload,
  ) => AgentExplainPayload | null;
}

const TAG = 'intentlm-agent';
const DISMISS_PREFIX = 'ilm_agent_dismiss_';

let _elementRegistered = false;
let _activeEvent: IntentEvent | null = null;
let _config: IntentLMActionsConfig = {};
let _previousHandler: ((event: IntentEvent) => void) | undefined;

type AgentActiveListener = (event: IntentEvent | null) => void;
const _activeListeners = new Set<AgentActiveListener>();

function isKeepVisibleUntilDismiss(): boolean {
  const v = _config.keepVisibleUntilDismiss;
  if (typeof v === 'function') return v();
  return !!v;
}

function resolveAutoDismissMs(config: IntentLMActionsConfig): number {
  if (isKeepVisibleUntilDismiss()) return 0;
  return config.autoDismissMs ?? DEFAULT_AUTO_DISMISS_MS;
}

function notifyAgentActive(): void {
  _activeListeners.forEach(fn => fn(_activeEvent));
}

export function getActiveAgentEvent(): IntentEvent | null {
  return _activeEvent;
}

/** Subscribe to floating-agent show/hide (for sandbox intent panel sync). */
export function subscribeAgentActive(listener: AgentActiveListener): () => void {
  _activeListeners.add(listener);
  listener(_activeEvent);
  return () => {
    _activeListeners.delete(listener);
  };
}

function positionStyles(position: AgentPosition): string {
  if (position === 'bottom-right') {
    return 'bottom: 24px; right: 24px;';
  }
  return 'bottom: 24px; left: 24px;';
}

function navigateToUrl(url: string): void {
  if (url.startsWith('/')) {
    window.location.assign(url);
    return;
  }
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin === window.location.origin) {
      window.location.assign(parsed.href);
      return;
    }
  } catch {
    // fall through to open
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dismissKey(intent: string): string {
  return `${DISMISS_PREFIX}${intent}`;
}

function isDismissed(intent: string, mode: AgentDismissMode): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Session flag — set by dismiss (session mode) or CTA click (always session-scoped).
    if (sessionStorage.getItem(dismissKey(intent)) === '1') return true;
  } catch {
    return false;
  }
  if (mode === 'persistent') {
    try {
      return localStorage.getItem(dismissKey(intent)) === '1';
    } catch {
      return false;
    }
  }
  return false;
}

function markDismissed(intent: string, mode: AgentDismissMode): void {
  if (mode === 'none') return;
  if (typeof window === 'undefined') return;
  const storage = mode === 'persistent' ? window.localStorage : window.sessionStorage;
  try {
    storage.setItem(dismissKey(intent), '1');
  } catch {
    // Storage blocked — ignore
  }
}

/** Per-intent, per-session: agent shows at most once until sandbox reset / new session. */
function suppressIntentForSession(intent: string): void {
  markDismissed(intent, 'session');
}

/** Clear session/persistent dismiss flags (e.g. sandbox reset / new visitor). */
export function clearAgentDismissals(): void {
  if (typeof window === 'undefined') return;
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (key?.startsWith(DISMISS_PREFIX)) {
          storage.removeItem(key);
        }
      }
    } catch {
      // Storage blocked — ignore
    }
  }
}

function formatExplainHtml(explain: AgentExplainPayload): string {
  return `
    <p class="explain-heading">What happened</p>
    <p class="explain-text">${escapeHtml(explain.journey)}</p>
    <p class="explain-heading">Intent confidence</p>
    <p class="explain-text">
      <strong class="explain-intent">${escapeHtml(explain.intent)}</strong>
      at <strong>${(explain.confidence * 100).toFixed(1)}%</strong>
      — ${escapeHtml(explain.confidenceSummary)}
    </p>
    ${
      explain.tokenTrail
        ? `<p class="explain-meta">Token path: ${escapeHtml(explain.tokenTrail)}</p>`
        : ''
    }
    <p class="explain-heading">Why this CTA</p>
    <p class="explain-text">
      The agent shows <strong>${escapeHtml(explain.ctaLabel)}</strong>
      because ${escapeHtml(explain.ctaRationale)}
    </p>
    <p class="explain-tour">${escapeHtml(explain.tourTitle)} guided tour</p>
  `;
}

function registerAgentElement(): void {
  if (_elementRegistered || typeof window === 'undefined' || typeof customElements === 'undefined') {
    return;
  }

  class IntentLMAgentElement extends HTMLElement {
  private _onDismiss: (() => void) | null = null;
  private _onAutoDismiss: (() => void) | null = null;
  private _onCta: (() => void) | null = null;
  private _countdownTimer: ReturnType<typeof setInterval> | null = null;
  private _autoDismissTimer: ReturnType<typeof setTimeout> | null = null;
  private _explainOpen = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  disconnectedCallback(): void {
    this._clearCountdown();
    this._detachListeners();
  }

  private _clearCountdown(): void {
    if (this._countdownTimer !== null) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  private _clearAutoDismiss(): void {
    if (this._autoDismissTimer !== null) {
      clearTimeout(this._autoDismissTimer);
      this._autoDismissTimer = null;
    }
  }

  show(
    payload: AgentDisplayPayload,
    position: AgentPosition,
    onDismiss: () => void,
    onCta: () => void,
    explain: AgentExplainPayload | null,
    autoDismissMs: number,
    onAutoDismiss: () => void,
  ): void {
    this._clearCountdown();
    this._clearAutoDismiss();
    this._detachListeners();
    this._onDismiss = onDismiss;
    this._onAutoDismiss = onAutoDismiss;
    this._onCta = onCta;
    this._explainOpen = false;

    const latencyBadge =
      payload.analyzeLatencyMs !== undefined
        ? `<span class="badge">engaged in ${payload.analyzeLatencyMs}ms</span>`
        : '';

    const explainBtn = explain
      ? `<button type="button" class="explain-btn" id="intentlm-explain-btn" aria-label="Explain what happened" title="Explain what happened">ⓘ</button>`
      : '';

    const explainPanel = explain
      ? `<div class="explain-panel hidden" id="intentlm-explain" aria-live="polite">${formatExplainHtml(explain)}</div>`
      : '';

    const hostPosition = positionStyles(position);

    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          position: fixed;
          ${hostPosition}
          width: min(340px, calc(100vw - 2rem));
          z-index: 2147483646;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: slideUp 0.12s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          :host { animation: none; }
        }
        .card {
          background: #ffffff;
          border: 1px solid #a7f3d0;
          border-radius: 16px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 16px;
          background: #ecfdf5;
          border-bottom: 1px solid #d1fae5;
        }
        .title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #10b981;
          flex-shrink: 0;
        }
        .title {
          margin: 0;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #065f46;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .explain-btn {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 1.5px solid #059669;
          background: #ffffff;
          color: #059669;
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .explain-btn:hover, .explain-btn[aria-expanded="true"] {
          background: #059669;
          color: #ffffff;
        }
        .controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .badge {
          font-size: 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          padding: 2px 8px;
          border-radius: 999px;
          background: #d1fae5;
          color: #047857;
          border: 1px solid #6ee7b7;
          white-space: nowrap;
        }
        .dismiss {
          border: none;
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          padding: 2px 4px;
        }
        .dismiss:hover { color: #4b5563; }
        .explain-panel {
          padding: 12px 16px;
          background: #f0fdf4;
          border-bottom: 1px solid #d1fae5;
          max-height: 220px;
          overflow-y: auto;
        }
        .explain-panel.hidden { display: none; }
        .explain-heading {
          margin: 0 0 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #047857;
        }
        .explain-heading:not(:first-child) { margin-top: 10px; }
        .explain-text {
          margin: 0;
          font-size: 12px;
          line-height: 1.45;
          color: #374151;
        }
        .explain-intent { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
        .explain-meta {
          margin: 6px 0 0;
          font-size: 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: #6b7280;
          line-height: 1.4;
        }
        .explain-tour {
          margin: 10px 0 0;
          font-size: 10px;
          color: #059669;
          font-weight: 600;
        }
        .body-wrap { padding: 12px 16px 16px; }
        .headline {
          margin: 0 0 8px;
          font-size: 15px;
          font-weight: 600;
          color: #111827;
        }
        .body {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.5;
          color: #374151;
        }
        .urgency {
          margin: 0 0 12px;
          padding: 8px 10px;
          border-radius: 8px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          font-size: 12px;
          font-weight: 600;
          color: #c2410c;
          text-align: center;
        }
        .urgency-countdown {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-variant-numeric: tabular-nums;
        }
        .cta {
          width: 100%;
          border: none;
          background: #059669;
          color: #ffffff;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .cta:hover { background: #047857; }
        @keyframes slideUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
      <div class="card" role="dialog" aria-live="polite" aria-label="IntentLM agent">
        <div class="header">
          <div class="title-row">
            <span class="dot" aria-hidden="true"></span>
            <p class="title">IntentLM Agent</p>
            ${explainBtn}
          </div>
          <div class="controls">
            ${latencyBadge}
            <button type="button" class="dismiss" aria-label="Dismiss">✕</button>
          </div>
        </div>
        ${explainPanel}
        <div class="body-wrap">
          <h3 class="headline">${escapeHtml(payload.headline)}</h3>
          ${
            payload.urgencyMinutes
              ? `<div class="urgency" aria-live="polite">⏱ <span class="urgency-countdown" id="intentlm-countdown"></span> remaining</div>`
              : ''
          }
          <p class="body">${escapeHtml(payload.body)}</p>
          <button type="button" class="cta" id="intentlm-cta">${escapeHtml(payload.cta)}</button>
        </div>
      </div>
    `;

    if (payload.urgencyMinutes && payload.urgencyMinutes > 0) {
      const countdownEl = this.shadowRoot!.getElementById('intentlm-countdown');
      const deadline = Date.now() + payload.urgencyMinutes * 60_000;
      const tick = (): void => {
        const leftMs = Math.max(0, deadline - Date.now());
        const minutes = Math.floor(leftMs / 60_000);
        const seconds = Math.floor((leftMs % 60_000) / 1000);
        if (countdownEl) {
          countdownEl.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
        }
        if (leftMs <= 0) {
          this._clearCountdown();
        }
      };
      tick();
      this._countdownTimer = setInterval(tick, 1000);
    }

    const dismissBtn = this.shadowRoot!.querySelector('.dismiss');
    const ctaBtn = this.shadowRoot!.getElementById('intentlm-cta');
    const explainBtnEl = this.shadowRoot!.getElementById('intentlm-explain-btn');
    dismissBtn?.addEventListener('click', this._handleDismiss);
    ctaBtn?.addEventListener('click', this._handleCta);
    explainBtnEl?.addEventListener('click', this._handleExplainToggle);

    if (autoDismissMs > 0) {
      this._autoDismissTimer = setTimeout(() => {
        this._autoDismissTimer = null;
        this._onAutoDismiss?.();
      }, autoDismissMs);
    }
  }

  private _handleDismiss = (): void => {
    this._clearAutoDismiss();
    this._onDismiss?.();
  };

  private _handleCta = (): void => {
    this._clearAutoDismiss();
    this._onCta?.();
  };

  private _handleExplainToggle = (): void => {
    const panel = this.shadowRoot?.getElementById('intentlm-explain');
    const btn = this.shadowRoot?.getElementById('intentlm-explain-btn');
    if (!panel || !btn) return;
    this._explainOpen = !this._explainOpen;
    panel.classList.toggle('hidden', !this._explainOpen);
    btn.setAttribute('aria-expanded', this._explainOpen ? 'true' : 'false');
  };

  private _detachListeners(): void {
    this._clearCountdown();
    this._clearAutoDismiss();
    const dismissBtn = this.shadowRoot?.querySelector('.dismiss');
    const ctaBtn = this.shadowRoot?.getElementById('intentlm-cta');
    const explainBtn = this.shadowRoot?.getElementById('intentlm-explain-btn');
    dismissBtn?.removeEventListener('click', this._handleDismiss);
    ctaBtn?.removeEventListener('click', this._handleCta);
    explainBtn?.removeEventListener('click', this._handleExplainToggle);
  }
  }

  if (!customElements.get(TAG)) {
    customElements.define(TAG, IntentLMAgentElement);
  }
  _elementRegistered = true;
}

function shouldRecordCta(config: IntentLMActionsConfig): boolean {
  return config.recordCtaResponses !== false;
}

function recordCtaResponse(event: IntentEvent, payload: AgentDisplayPayload, config: IntentLMActionsConfig): void {
  if (!shouldRecordCta(config) || !event.intent) return;
  intentLM.recordAgentResponse({
    intent: event.intent,
    confidence: event.confidence,
    ctaLabel: payload.cta,
    sessionId: event.session_id,
    ...(payload.ctaUrl ? { ctaUrl: payload.ctaUrl } : {}),
    ...(event.request_id ? { requestId: event.request_id } : {}),
  });
}

function hideAgent(): void {
  if (typeof document === 'undefined') return;
  document.querySelector(TAG)?.remove();
  _activeEvent = null;
  notifyAgentActive();
}

function showAgent(event: IntentEvent, payload: AgentDisplayPayload, config: IntentLMActionsConfig): void {
  if (typeof document === 'undefined') return;
  registerAgentElement();

  suppressIntentForSession(event.intent);

  hideAgent();
  _activeEvent = event;

  const node = document.createElement(TAG) as HTMLElement & {
    show: (
      payload: AgentDisplayPayload,
      position: AgentPosition,
      onDismiss: () => void,
      onCta: () => void,
      explain: AgentExplainPayload | null,
      autoDismissMs: number,
      onAutoDismiss: () => void,
    ) => void;
  };

  const position = config.position ?? 'bottom-left';
  const dismissMode = config.dismissMode ?? 'session';
  const explain = config.getTourExplain?.(event, payload) ?? null;
  const autoDismissMs = resolveAutoDismissMs(config);

  node.show(
    payload,
    position,
    () => {
      suppressIntentForSession(event.intent);
      if (dismissMode === 'persistent') {
        markDismissed(event.intent, 'persistent');
      }
      config.onDismiss?.(event);
      hideAgent();
    },
    () => {
      recordCtaResponse(event, payload, config);
      suppressIntentForSession(event.intent);
      hideAgent();
      if (payload.ctaUrl) {
        navigateToUrl(payload.ctaUrl);
      }
      config.onCtaClick?.(event, payload);
    },
    explain,
    autoDismissMs,
    () => {
      suppressIntentForSession(event.intent);
      hideAgent();
    },
  );

  document.body.appendChild(node);
  notifyAgentActive();
}

function shouldEngageAgent(event: IntentEvent): boolean {
  if (!event.intent || event.suppressed) return false;

  if (_config.shouldShowAgent && !_config.shouldShowAgent(event)) return false;

  const minConfidence = _config.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  if (event.confidence < minConfidence) return false;

  if (_config.engageOnConfidence) return true;
  return event.trigger_nudge;
}

function handleIntentEvent(event: IntentEvent): void {
  if (!shouldEngageAgent(event)) {
    if (isKeepVisibleUntilDismiss() && _activeEvent && document.querySelector(TAG)) {
      return;
    }
    hideAgent();
    return;
  }

  const dismissMode = _config.dismissMode ?? 'session';
  if (isDismissed(event.intent, dismissMode)) return;

  if (_activeEvent?.intent === event.intent && document.querySelector(TAG)) {
    return;
  }

  const payload = resolveAgentPayload(
    event,
    _config.actions,
    _config.defaultAction,
    _config.pricingUrl ? { pricingUrl: _config.pricingUrl } : undefined,
  );
  showAgent(event, payload, _config);
}

/**
 * Wire the Shadow DOM agent to {@link window.__ILM_ON_INTENT__}.
 * Returns a teardown function for SPAs.
 */
export function initIntentLMActions(config: IntentLMActionsConfig = {}): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  _config = config;
  registerAgentElement();

  _previousHandler = (window as Window & { __ILM_ON_INTENT__?: (e: IntentEvent) => void }).__ILM_ON_INTENT__;
  (window as Window & { __ILM_ON_INTENT__?: (e: IntentEvent) => void }).__ILM_ON_INTENT__ = (event: IntentEvent) => {
    _previousHandler?.(event);
    handleIntentEvent(event);
  };

  return () => {
    hideAgent();
    const w = window as Window & { __ILM_ON_INTENT__?: (e: IntentEvent) => void };
    if (w.__ILM_ON_INTENT__) {
      if (_previousHandler) {
        w.__ILM_ON_INTENT__ = _previousHandler;
      } else {
        delete w.__ILM_ON_INTENT__;
      }
    }
    _previousHandler = undefined;
    _config = {};
  };
}

/** Hide any visible agent immediately (e.g. on route change). */
export function dismissIntentLMAgent(): void {
  hideAgent();
}

/**
 * Feed a classification into the agent (e.g. sandbox SDK subscribe replay).
 * Requires {@link initIntentLMActions} to have run first.
 */
export function dispatchIntentEvent(event: IntentEvent): void {
  handleIntentEvent(event);
}
