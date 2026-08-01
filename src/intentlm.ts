/**
 * intentLM Browser SDK
 *
 * Copyright (c) 2024–2026 Suman Bhattacharya
 * SPDX-License-Identifier: Apache-2.0
 *
 * Raw events (URLs, DOM text, user input) NEVER leave the browser.
 * Only global taxonomy token IDs are forwarded to intentLM servers.
 * (Taxonomy content in taxonomy.ts is CC BY-SA 4.0 — see LICENSE-TAXONOMY.)
 *
 * Usage (npm):
 *   import { intentLM } from 'intentlm-sdk';
 *   intentLM.init({ apiKey: '...', patterns: { '/pricing*': 102 } });
 *
 * Usage (CDN / script tag):
 *   <script src="intentlm.iife.js"></script>
 *   <script>window.intentLM.init({ apiKey: '...', patterns: { '/pricing*': 102 } });</script>
 */

import { INTENT_TAXONOMY, TOKEN_BY_LABEL, isValidTokenId, type TokenId, type IntentLabel } from './taxonomy.js';
import { resolveVisitorId } from './visitor.js';
import { logSdkDebug, logSdkError } from './debug.js';
import { isFormFieldElement } from './formEngagement.js';
import {
  isBrowserForbiddenTokenId,
  normalizeViewId,
  type ViewMap,
  type ViewCoverageReport,
} from './manifest.js';
import { normalizeUrlGlob, normalizeUrlPath, patternToRegex } from './patterns.js';
import { fetchRemoteInstrumentation, mergeRemoteConfig, instrumentationUrl } from './remoteConfig.js';
import { createPathViewBinder, type RouteViewMap } from './router-bridge.js';
import { attachSemanticCapture } from './semanticCapture.js';
import {
  attachModalDiscovery,
  stateViewId,
  type DiscoveryEvent,
} from './discovery.js';

// ── Public types ────────────────────────────────────────────────────────────

/** URL glob patterns to global token ID mappings provided by the customer */
export type PatternMap = Record<string, number>;

export type { ViewMap, ViewCoverageReport, IntentLMManifest } from './manifest.js';
export {
  normalizeViewId,
  routePathToViewId,
  isBrowserForbiddenTokenId,
} from './manifest.js';
export {
  patternToRegex,
  matchPathToKey,
  normalizeUrlPath,
  normalizeUrlGlob,
} from './patterns.js';
export { instrumentationUrl } from './remoteConfig.js';
export {
  viewIdForPath,
  createPathViewBinder,
  buildViewsFromRoutes,
  type RouteViewMap,
} from './router-bridge.js';

/** Configuration passed to intentLM.init() */
export interface IntentLMConfig {
  /** intentLM API key (ilm_live_... format) */
  apiKey: string;

  /**
   * URL glob pattern → global token ID mappings.
   * The customer maps their own URL structure to intentLM's shared vocabulary.
   * Example: { '/pricing*': 102, '/checkout/**': 203, '/users/:id/edit': 806 }
   */
  patterns: PatternMap;

  /**
   * In-app view id → global token ID (logged-in screens, tabs, modals).
   * Use {@link IntentLMSDK.setView} or {@link createPathViewBinder} from your router.
   * View ids are opaque strings — never URLs or user-identifying labels.
   */
  views?: ViewMap;

  /**
   * Structural milestone token (600–699), e.g. 605 FIRST_CORE_ACTION.
   * Emit via {@link IntentLMSDK.captureCoreAction} when the user completes first value.
   */
  coreActionToken?: number;

  /**
   * Returns true if the user has granted analytics consent.
   * All event capture is skipped when this returns false.
   * Defaults to () => true (no consent gate).
   */
  consentCheck?: () => boolean;

  /**
   * @deprecated Persistence follows {@link consentCheck}. Kept for API compatibility;
   * ignored when deciding whether to set `_ilm_vid`.
   */
  visitorPersistenceConsentCheck?: () => boolean;

  /**
   * Override the intentLM inference API endpoint.
   * Defaults to the production Cloud Run inference URL (`…/v1`).
   * With useRemoteConfig, Config API may override this via `inference_endpoint`.
   */
  endpoint?: string;

  /**
   * Number of events in the sliding session window sent to the inference API.
   * Defaults to 20.
   */
  windowSize?: number;

  /**
   * Session idle timeout in milliseconds.
   * A new session ID is generated after this duration of inactivity.
   * Defaults to 15 minutes (900_000ms).
   */
  sessionTTL?: number;

  /**
   * When true (default), sets the first-party `_ilm_vid` cookie (random UUID, 1-year TTL)
   * for cross-session stitching whenever {@link consentCheck} returns true.
   * Set to false for session-only mode (no `_ilm_vid`).
   */
  enableVisitorPersistence?: boolean;

  /**
   * Customer's opaque logged-in user id (never email). Sent on analyze/ingest for
   * user-level inference stitch and server pull APIs. Use {@link IntentLMSDK.setUserIdentity}
   * after login/logout.
   */
  userId?: string;

  /**
   * Customer's opaque org/account id (B2B). Optional rollup key for pull APIs and erasure.
   */
  accountId?: string;

  /**
   * When true, logs analyze/ingest failures to the console (dev troubleshooting).
   * Defaults to false — silent in production.
   */
  debug?: boolean;

  /**
   * When false, disables idle/rage-click/scroll/tab behavioral token detectors.
   * When true, idle tokens (903/904) pause while the user focuses a form field
   * or while {@link IntentLMSDK.beginFormEngagement} is active (e.g. Stripe iframe).
   * URL pattern matching and manual capture() still work. Defaults to true.
   */
  trackBehavior?: boolean;

  /**
   * Called after each /v1/analyze round-trip (success or failure).
   * Useful for dashboards and the sandbox intent panel.
   */
  onAnalyze?: (update: IntentAnalyzeUpdate) => void;

  /** Load patterns/views from Config API (dashboard saves). */
  useRemoteConfig?: boolean;

  /**
   * Customer-local token wire id → dot label (e.g. `{ 1: 'DOCS_VIEW.1' }`).
   * Loaded from remote instrumentation or committed `.intentlm/local-tokens.json`.
   */
  localTokens?: Record<number, string>;

  /** Customer-local display aliases (wire id → HOMEPAGE_VIEW_SMB). Canonical labels stay in localTokens. */
  localTokenDisplay?: Record<number, string>;

  /** Config API base URL without /v1 (e.g. http://localhost:8081). */
  configBaseUrl?: string;

  /** Path glob → view id for automatic setView on SPA navigation. */
  routeViews?: RouteViewMap;

  /**
   * Setup-only: record setView + unmapped modals for instrumentation tour.
   * Enabled via dashboard or remote config `discovery_mode`.
   */
  discoveryMode?: boolean;
}

/** Snapshot emitted via {@link IntentLMConfig.onAnalyze} after each analyze call */
export interface IntentAnalyzeUpdate {
  intent: string | null;
  confidence: number;
  model_tier: 'markov' | 'hybrid' | 'sasrec' | null;
  trigger_nudge: boolean;
  suppressed: boolean;
  /** Cross-session trajectory (ILM-206/208); null when insufficient visitor history */
  longitudinal_intent?: string | null;
  longitudinal_confidence?: number | null;
  /** Token summaries from prior visits stitched into session Markov (server-side) */
  prior_session_tokens?: number[] | null;
  /** Labeled intents from prior visits (oldest → newest) */
  prior_session_intents?: string[] | null;
  sessionTokens: readonly number[];
  sessionId: string | null;
  visitorId?: string;
  isAnalyzing: boolean;
  error?: string;
  /** Round-trip time for the last /v1/analyze call (browser → API → browser). */
  analyze_latency_ms?: number;
  /** Morphological urgency of the classified intent (language-similarity layer). */
  intensity?: string | null;
  /** Behavioral phrase patterns detected alongside the intent. */
  phrases_detected?: string[] | null;
}

/** Options for {@link IntentLMSDK.reset} */
export interface IntentLMResetOptions {
  /** Flush current session to /v1/ingest before clearing (default true). */
  flushBeforeReset?: boolean;
}

/** Payload delivered to window.__ILM_ON_INTENT__ when trigger_nudge is true */
export interface IntentEvent {
  intent: string;
  confidence: number;
  model_tier: 'markov' | 'hybrid' | 'sasrec';
  trigger_nudge: boolean;
  suppressed: boolean;
  request_id: string;
  session_id: string;
  /** Round-trip time for the analyze call that triggered this event */
  analyze_latency_ms?: number;
  longitudinal_intent?: string | null;
  longitudinal_confidence?: number | null;
  prior_session_tokens?: number[] | null;
  prior_session_intents?: string[] | null;
  intensity?: string | null;
  phrases_detected?: string[] | null;
}

// ── Internal types ──────────────────────────────────────────────────────────

interface CompiledPattern {
  regex: RegExp;
  tokenId: number;
  label: string;
}

interface SessionStorageData {
  id: string;
  ts: number;
}

interface CompiledView {
  viewId: string;
  tokenId: number;
  label: string;
}

interface ResolvedConfig {
  apiKey: string;
  endpoint: string;
  patterns: CompiledPattern[];
  views: Map<string, CompiledView>;
  coreActionToken: TokenId | null;
  localTokenLabels: Map<number, string>;
  localTokenByLabel: Map<string, number>;
  consentCheck: () => boolean;
  visitorPersistenceConsentCheck: () => boolean;
  windowSize: number;
  sessionTTL: number;
  enableVisitorPersistence: boolean;
  debug: boolean;
  trackBehavior: boolean;
  discoveryMode: boolean;
  configBaseUrl: string;
  onAnalyze?: (update: IntentAnalyzeUpdate) => void;
}

// ── SDK implementation ──────────────────────────────────────────────────────

class IntentLMSDK {
  private _cfg: ResolvedConfig | null = null;
  private _sessionId: string | null = null;
  private _visitorId: string | undefined = undefined;
  private _userId: string | undefined = undefined;
  private _accountId: string | undefined = undefined;
  private _sequence: number[] = [];
  private _timeDeltas: number[] = [];
  private _lastEventTs: number | null = null;
  private _scrollMilestones = new Set<number>();
  private _spaPatched = false;
  private _behaviorAttached = false;
  private _flushAttached = false;
  private _formEngagementDepth = 0;
  private _idleTimer30: ReturnType<typeof setTimeout> | null = null;
  private _idleTimer120: ReturnType<typeof setTimeout> | null = null;
  /** True after TAB_RETURNED until pointer/keyboard/scroll/click activity. */
  private _awaitingActivityAfterReturn = false;
  /** Tracks whether the tab was hidden so we only emit one TAB_RETURNED per hide. */
  private _tabWasHidden = false;
  private _analyzeStartedAt: number | null = null;
  /** Coalesce rapid token bursts before /v1/analyze (ms). */
  private static readonly _ANALYZE_DEBOUNCE_MS = 250;
  /** Visibility tokens are recorded but must not schedule analyze or extend session TTL. */
  private static readonly _VISIBILITY_TOKEN_IDS: ReadonlySet<number> = new Set([
    TOKEN_BY_LABEL['TAB_HIDDEN'],
    TOKEN_BY_LABEL['TAB_RETURNED'],
  ]);
  /** Passive / passive tokens — recorded for training context, never schedule /analyze. */
  private static readonly _NON_ANALYZE_TOKEN_IDS: ReadonlySet<number> = new Set([
    TOKEN_BY_LABEL['TAB_HIDDEN'],
    TOKEN_BY_LABEL['TAB_RETURNED'],
    TOKEN_BY_LABEL['IDLE_DRIFT_30S'],
    TOKEN_BY_LABEL['IDLE_DRIFT_120S'],
  ]);
  private _analyzeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  /** Monotonic sequence — incremented on each token that schedules analyze. */
  private _analyzeSeq = 0;
  private _analyzeInFlight = false;
  private _analyzeInFlightSeq = 0;
  /** Set when debounce fires while a request is still in flight. */
  private _analyzeFollowUpPending = false;
  /** Avoid isAnalyzing flicker while overlapping debounced/in-flight work runs. */
  private _analyzeUiPending = false;
  private _currentViewId: string | null = null;
  private _seenViewIds = new Set<string>();
  private _discoveredEvents: DiscoveryEvent[] = [];
  private _discoverySeen = new Set<string>();
  private _detachSemantic: (() => void) | null = null;
  private _detachModalDiscovery: (() => void) | null = null;
  /** Warn when consentCheck returns false (dead CMP stub footgun). */
  private _consentDeniedWarned = false;
  private _consentDeniedCount = 0;
  /** Re-apply routeViews → setView on SPA navigations (pushState / popstate). */
  private _routeViewApply: (() => void) | null = null;
  private _onSpaNavigation = (): void => {
    // Prefer URL patterns when both URL glob and route.* view cover the same path.
    const matchedUrl = this._captureCurrentRoute();
    if (!matchedUrl) this._routeViewApply?.();
  };
  private _onPopState = (): void => {
    this._onSpaNavigation();
  };

  /**
   * Initialize the SDK. Must be called once before any other methods.
   * With useRemoteConfig, listeners attach after Config API responds (async).
   */
  init(config: IntentLMConfig): void {
    if (!config.apiKey) {
      throw new Error('[intentLM] config.apiKey is required');
    }

    if (config.useRemoteConfig) {
      const base = config.configBaseUrl ?? '/api/intentlm';
      void fetchRemoteInstrumentation(config.apiKey, base).then((remote) => {
        if (!remote) {
          console.warn(
            `[intentLM] Could not load instrumentation from ${base}/sdk/instrumentation. ` +
              'Check your same-origin proxy (Vite server.proxy / Next rewrites / vercel.json). ' +
              'Falling back to local patterns only.',
          );
        }
        const merged = remote ? mergeRemoteConfig(config, remote) : config;
        this._initCore(merged);
      });
      return;
    }

    if (!config.patterns || Object.keys(config.patterns).length === 0) {
      throw new Error('[intentLM] config.patterns is required — map your URL patterns to global token IDs');
    }
    this._initCore(config);
  }

  /**
   * Preview which token a path would emit (browser-only; does not send to server).
   */
  testPath(path: string): { tokenId: number | null; label: string | null; viewId: string | null } {
    if (!this._cfg) {
      return { tokenId: null, label: null, viewId: null };
    }
    const pathname = normalizeUrlPath(path);
    for (const { regex, tokenId, label } of this._cfg.patterns) {
      if (regex.test(pathname)) {
        return { tokenId, label, viewId: null };
      }
    }
    return { tokenId: null, label: null, viewId: null };
  }

  private _initCore(config: IntentLMConfig): void {
    if (!config.patterns || Object.keys(config.patterns).length === 0) {
      logSdkError(config.debug ?? false, 'No URL patterns — skipping init');
      return;
    }

    const { labels: localTokenLabels, byLabel: localTokenByLabel } =
      this._buildLocalTokenMaps(config.localTokens, config.localTokenDisplay);

    if (this._cfg && this._spaPatched) {
      logSdkDebug(config.debug ?? false, 'init() called again — config refreshed, listeners unchanged');
      const nextConsent = config.consentCheck ?? this._cfg.consentCheck;
      const nextVisitorPersistenceConsent =
        config.visitorPersistenceConsentCheck
        ?? (config.consentCheck !== undefined
          ? config.consentCheck
          : this._cfg.visitorPersistenceConsentCheck);
      const next: ResolvedConfig = {
        ...this._cfg,
        apiKey:       config.apiKey,
        endpoint:     (config.endpoint ?? this._cfg.endpoint).replace(/\/$/, ''),
        patterns:     this._compilePatterns(config.patterns, localTokenLabels),
        views:        this._compileViews(config.views ?? {}, localTokenLabels),
        coreActionToken: this._resolveCoreActionToken(config.coreActionToken),
        localTokenLabels,
        localTokenByLabel,
        consentCheck: nextConsent,
        visitorPersistenceConsentCheck: nextVisitorPersistenceConsent,
        windowSize:   config.windowSize ?? this._cfg.windowSize,
        sessionTTL:   config.sessionTTL ?? this._cfg.sessionTTL,
        enableVisitorPersistence: config.enableVisitorPersistence ?? this._cfg.enableVisitorPersistence,
        debug:        config.debug ?? this._cfg.debug,
        trackBehavior: config.trackBehavior ?? this._cfg.trackBehavior,
        discoveryMode: config.discoveryMode ?? this._cfg.discoveryMode,
        configBaseUrl: config.configBaseUrl ?? this._cfg.configBaseUrl,
      };
      if (config.onAnalyze !== undefined) {
        next.onAnalyze = config.onAnalyze;
      }
      this._cfg = next;
      this._initVisitor();
      this._userId = this._sanitizeOpaqueId(config.userId);
      this._accountId = this._sanitizeOpaqueId(config.accountId);
      const routeViews = config.routeViews;
      if (routeViews && Object.keys(routeViews).length > 0) {
        this._routeViewApply = createPathViewBinder(
          routeViews,
          (id) => this.setView(id),
          undefined,
          { applyImmediately: false },
        );
        this._onSpaNavigation();
      }
      return;
    }

    const baseConsent = config.consentCheck ?? (() => true);
    const resolved: ResolvedConfig = {
      apiKey:       config.apiKey,
      endpoint:     (config.endpoint ?? 'https://intentlm-dev-inference-krxe5fa7dq-uw.a.run.app/v1').replace(/\/$/, ''),
      patterns:     this._compilePatterns(config.patterns, localTokenLabels),
      views:        this._compileViews(config.views ?? {}, localTokenLabels),
      coreActionToken: this._resolveCoreActionToken(config.coreActionToken),
      localTokenLabels,
      localTokenByLabel,
      consentCheck: baseConsent,
      visitorPersistenceConsentCheck:
        config.visitorPersistenceConsentCheck ?? baseConsent,
      windowSize:   config.windowSize  ?? 20,
      sessionTTL:   config.sessionTTL  ?? 15 * 60 * 1000,
      enableVisitorPersistence: config.enableVisitorPersistence ?? true,
      debug:        config.debug ?? false,
      trackBehavior: config.trackBehavior ?? true,
      discoveryMode: config.discoveryMode ?? false,
      configBaseUrl: config.configBaseUrl ?? '/api/intentlm',
    };
    if (config.onAnalyze !== undefined) {
      resolved.onAnalyze = config.onAnalyze;
    }
    this._cfg = resolved;

    logSdkDebug(this._cfg.debug, 'initialized', {
      endpoint: this._cfg.endpoint,
      trackBehavior: this._cfg.trackBehavior,
      visitorPersistence: this._cfg.enableVisitorPersistence,
    });

    this._initVisitor();
    this._userId = this._sanitizeOpaqueId(config.userId);
    this._accountId = this._sanitizeOpaqueId(config.accountId);
    this._initSession();
    this._record(TOKEN_BY_LABEL['SESSION_STARTED']);

    this._attachSPAListener();
    if (this._cfg.trackBehavior) {
      this._attachBehavioralDetectors();
    }
    this._attachFlushListeners();

    const routeViews = config.routeViews;
    if (routeViews && Object.keys(routeViews).length > 0) {
      this._routeViewApply = createPathViewBinder(
        routeViews,
        (id) => this.setView(id),
        undefined,
        { applyImmediately: false },
      );
    } else {
      this._routeViewApply = null;
    }
    this._onSpaNavigation();

    this._attachSemanticCapture();
    if (this._cfg.discoveryMode) {
      this._attachDiscoveryObservers();
    }
  }

  /**
   * Set opaque logged-in user/account ids after auth (call on login/logout).
   * Never pass email or other direct PII — use your internal user primary key.
   */
  setUserIdentity(identity: { userId?: string | null; accountId?: string | null }): void {
    this._userId = this._sanitizeOpaqueId(identity.userId);
    this._accountId = this._sanitizeOpaqueId(identity.accountId);
  }

  /**
   * Re-read `_ilm_vid` after CMP cookie consent changes (call from consent handlers).
   */
  refreshVisitorIdentity(): void {
    this._initVisitor();
  }

  /** Anonymous visitor UUID from the _ilm_vid cookie (undefined when persistence is off). */
  getVisitorId(): string | undefined {
    return this._visitorId;
  }

  /**
   * Clear the in-memory token sequence and start a new session.
   * Preserves visitor_id (_ilm_vid) for cross-session stitching.
   */
  reset(options: IntentLMResetOptions = {}): void {
    if (!this._cfg) {
      console.warn('[intentLM] Call init() before reset()');
      return;
    }
    const flush = options.flushBeforeReset !== false;
    if (flush && this._sequence.length >= 2) {
      this._flushTrainingPayload();
    }
    this._sequence = [];
    this._timeDeltas = [];
    this._lastEventTs = null;
    this._scrollMilestones.clear();
    this._currentViewId = null;
    this._seenViewIds.clear();
    this._cancelPendingAnalyze();
    this._startNewSession();
    this._record(TOKEN_BY_LABEL['SESSION_STARTED']);
    this._onSpaNavigation();
    logSdkDebug(this._cfg.debug, 'session reset', { session_id: this._sessionId });
    this._notifyAnalyze({ isAnalyzing: false, intent: null, confidence: 0 });
  }

  /**
   * Flush the current session token sequence to /v1/ingest without clearing it.
   * Use before ending a visit so the labeling job can pick up cross-session history.
   */
  flushIngest(): void {
    if (!this._cfg) {
      console.warn('[intentLM] Call init() before flushIngest()');
      return;
    }
    this._flushTrainingPayload();
  }

  /**
   * Log an IntentLM agent CTA click to /v1/agent-response (fire-and-forget).
   */
  recordAgentResponse(params: {
    intent: string;
    confidence: number;
    ctaLabel: string;
    ctaUrl?: string;
    requestId?: string;
    sessionId?: string;
  }): void {
    const cfg = this._cfg;
    if (!cfg) {
      logSdkError(true, 'agent-response skipped: call init() before recordAgentResponse()');
      return;
    }
    if (!params.intent) return;

    const sessionId = params.sessionId ?? this._sessionId;
    if (!sessionId) {
      logSdkError(cfg.debug, 'agent-response skipped: missing session_id');
      return;
    }

    const payload = {
      ...this._apiPayloadBase(),
      session_id: sessionId,
      intent: params.intent,
      confidence: params.confidence,
      cta_label: params.ctaLabel,
      ...(params.ctaUrl ? { cta_url: params.ctaUrl } : {}),
      ...(params.requestId ? { request_id: params.requestId } : {}),
    };

    fetch(`${cfg.endpoint}/agent-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(res => {
        if (!res.ok) {
          logSdkError(cfg.debug, `agent-response HTTP ${res.status}`);
        }
      })
      .catch(err => {
        logSdkError(cfg.debug, 'agent-response failed', err);
      });
  }

  /**
   * Manually fire a semantic intent event by label name.
   * Use for high-value interactions that aren't route-based.
   *
   * @example
   * intentLM.capture('UPGRADE_CTA_CLICK');
   * intentLM.capture('FEATURE_GATE_HIT');
   */
  capture(intentLabel: IntentLabel | string): void {
    if (!this._cfg) {
      console.warn('[intentLM] Call init() before capture()');
      return;
    }
    const localId = this._cfg.localTokenByLabel.get(intentLabel);
    if (localId !== undefined) {
      this._record(localId);
      return;
    }
    const tokenId = TOKEN_BY_LABEL[intentLabel as IntentLabel];
    if (tokenId === undefined) {
      console.warn(`[intentLM] Unknown intent label: "${intentLabel}". See taxonomy.ts or local tokens.`);
      return;
    }
    this._record(tokenId);
  }

  /** Human-readable label for a wire token id (local display alias, canonical local, or global). */
  tokenLabel(tokenId: number): string {
    if (this._cfg) {
      return this._tokenLabel(tokenId, this._cfg.localTokenLabels);
    }
    if (isValidTokenId(tokenId)) return INTENT_TAXONOMY[tokenId as TokenId];
    return `TOKEN_${tokenId}`;
  }

  /**
   * Record an in-app view transition (SPA screens, tabs, modals).
   * Id must exist in `init({ views })` unless you only use coverage in dev.
   */
  setView(viewId: string): void {
    if (!this._cfg) {
      console.warn('[intentLM] Call init() before setView()');
      return;
    }
    const normalized = normalizeViewId(viewId) ?? stateViewId(viewId);
    if (!normalized) {
      console.warn(`[intentLM] Invalid view id: "${viewId}"`);
      return;
    }

    const compiled = this._cfg.views.get(normalized);
    if (this._cfg.discoveryMode) {
      this._recordDiscovery({ kind: 'view', id: normalized, ts: Date.now() });
    }

    if (!compiled) {
      if (this._cfg.debug || this._cfg.discoveryMode) {
        console.warn(`[intentLM] Unknown view id "${normalized}" — add it to init({ views }) or finish discovery tour`);
      }
      return;
    }

    if (this._currentViewId === normalized) return;
    this._currentViewId = normalized;
    this._seenViewIds.add(normalized);
    this._record(compiled.tokenId);
  }

  /** Active view id from the last {@link setView}, or null. */
  getActiveViewId(): string | null {
    return this._currentViewId;
  }

  /**
   * Emit the configured structural core-action token (600–699).
   * No-op if `coreActionToken` was not set in init().
   */
  captureCoreAction(): void {
    if (!this._cfg) {
      console.warn('[intentLM] Call init() before captureCoreAction()');
      return;
    }
    const token = this._cfg.coreActionToken;
    if (token === null) {
      if (this._cfg.debug) {
        console.warn('[intentLM] coreActionToken not configured');
      }
      return;
    }
    this._record(token);
  }

  /**
   * Dev/setup helper: which configured views were seen this session (browser-only).
   */
  getViewCoverage(): ViewCoverageReport {
    const expected = this._cfg ? [...this._cfg.views.keys()].sort() : [];
    const seen = [...this._seenViewIds].sort();
    const missing = expected.filter((id) => !this._seenViewIds.has(id));
    return { expected, seen, missing };
  }

  /** Setup tour: opaque view/modal ids observed this session (browser-only until flush). */
  getDiscoveryReport(): readonly DiscoveryEvent[] {
    return [...this._discoveredEvents];
  }

  /** Upload discovery events to Config API (setup tour). */
  flushDiscovery(): void {
    if (!this._cfg?.discoveryMode || this._discoveredEvents.length === 0) return;
    const base = this._cfg.configBaseUrl.replace(/\/$/, '');
    const prefix = base.startsWith('http') ? `${base}/v1/sdk/discovery` : `${base.startsWith('/') ? base : `/${base}`}/sdk/discovery`;
    const payload = {
      events: this._discoveredEvents.map(({ kind, id }) => ({ kind, id })),
    };
    void fetch(prefix, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this._cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  private _recordDiscovery(event: DiscoveryEvent): void {
    const key = `${event.kind}:${event.id}`;
    if (this._discoverySeen.has(key)) return;
    this._discoverySeen.add(key);
    this._discoveredEvents.push(event);
    if (this._discoveredEvents.length >= 8) {
      this.flushDiscovery();
      this._discoveredEvents = [];
    }
  }

  /** Analytics consent — warns loudly when denied (once, then every 25 denials). */
  private _hasConsent(): boolean {
    const cfg = this._cfg;
    if (!cfg) return false;
    const ok = cfg.consentCheck();
    if (!ok) {
      this._consentDeniedCount += 1;
      const shouldWarn =
        !this._consentDeniedWarned || this._consentDeniedCount % 25 === 0;
      if (shouldWarn) {
        this._consentDeniedWarned = true;
        console.warn(
          '[intentLM] consentCheck() returned false — capture and discovery are paused. ' +
            'If you have not wired a CMP yet, use consentCheck: () => true for local setup/discover, ' +
            'then replace it before production (Setup → Compliance). ' +
            'A ConsentManager?.hasGranted ?? false stub silently blocks all tokens when ConsentManager is missing. ' +
            'Fix existing configs: npx -y @intentlm/cli consent migrate',
        );
      }
    }
    return ok;
  }

  private _attachSemanticCapture(): void {
    if (!this._cfg || this._detachSemantic) return;
    this._detachSemantic = attachSemanticCapture(
      (label) => this.capture(label),
      () => this._hasConsent(),
    );
  }

  private _attachDiscoveryObservers(): void {
    if (!this._cfg || this._detachModalDiscovery) return;
    this._detachModalDiscovery = attachModalDiscovery(
      (id) => this._recordDiscovery({ kind: 'modal', id, ts: Date.now() }),
      () => this._hasConsent(),
    );
  }

  // ── Pattern compilation ───────────────────────────────────────────────────

  private _buildLocalTokenMaps(
    raw: Record<number, string> | undefined,
    displayRaw?: Record<number, string> | undefined,
  ): { labels: Map<number, string>; byLabel: Map<string, number> } {
    const labels = new Map<number, string>();
    const byLabel = new Map<string, number>();
    if (!raw) return { labels, byLabel };
    for (const [idStr, canonical] of Object.entries(raw)) {
      const id = Number(idStr);
      if (!Number.isFinite(id) || !canonical) continue;
      const display = displayRaw?.[id];
      const shown = display ?? canonical;
      labels.set(id, shown);
      byLabel.set(canonical, id);
      if (display) byLabel.set(display, id);
    }
    return { labels, byLabel };
  }

  private _tokenLabel(tokenId: number, localLabels: Map<number, string>): string {
    const local = localLabels.get(tokenId);
    if (local) return local;
    if (isValidTokenId(tokenId)) return INTENT_TAXONOMY[tokenId as TokenId];
    return `TOKEN_${tokenId}`;
  }

  private _isAllowedTokenId(tokenId: number, localLabels: Map<number, string>): boolean {
    return localLabels.has(tokenId) || isValidTokenId(tokenId);
  }

  private _compilePatterns(
    rawPatterns: PatternMap,
    localLabels: Map<number, string>,
  ): CompiledPattern[] {
    const compiled: CompiledPattern[] = [];
    const seenGlobs = new Set<string>();
    for (const [pattern, tokenId] of Object.entries(rawPatterns)) {
      const globKey = normalizeUrlGlob(pattern);
      if (seenGlobs.has(globKey)) {
        continue; // /Booking* and /booking* → one pattern
      }
      seenGlobs.add(globKey);
      if (isBrowserForbiddenTokenId(tokenId)) {
        console.warn(
          `[intentLM] Token ${tokenId} for pattern "${pattern}" is security-only — use server-side events, not URL patterns.`,
        );
        continue;
      }
      if (!this._isAllowedTokenId(tokenId, localLabels)) {
        console.warn(`[intentLM] Token ID ${tokenId} for pattern "${pattern}" is not recognized. Skipping.`);
        continue;
      }
      compiled.push({
        regex:   patternToRegex(pattern),
        tokenId,
        label:   this._tokenLabel(tokenId, localLabels),
      });
    }
    return compiled;
  }

  private _compileViews(
    rawViews: ViewMap,
    localLabels: Map<number, string>,
  ): Map<string, CompiledView> {
    const map = new Map<string, CompiledView>();
    for (const [rawId, tokenId] of Object.entries(rawViews)) {
      const viewId = normalizeViewId(rawId);
      if (!viewId) {
        console.warn(`[intentLM] Invalid view id "${rawId}". Skipping.`);
        continue;
      }
      if (isBrowserForbiddenTokenId(tokenId)) {
        console.warn(
          `[intentLM] Token ${tokenId} for view "${viewId}" is security-only — emit from your backend.`,
        );
        continue;
      }
      if (!this._isAllowedTokenId(tokenId, localLabels)) {
        console.warn(`[intentLM] Token ID ${tokenId} for view "${viewId}" is not recognized. Skipping.`);
        continue;
      }
      map.set(viewId, {
        viewId,
        tokenId,
        label: this._tokenLabel(tokenId, localLabels),
      });
    }
    return map;
  }

  private _resolveCoreActionToken(token: number | undefined): TokenId | null {
    if (token === undefined) return null;
    if (isBrowserForbiddenTokenId(token) || !isValidTokenId(token)) {
      console.warn(`[intentLM] Invalid coreActionToken ${token}. Must be a valid structural token (600–699).`);
      return null;
    }
    if (token < 600 || token > 699) {
      console.warn(`[intentLM] coreActionToken ${token} should be in 600–699 (onboarding structural).`);
    }
    return token as TokenId;
  }

  // ── Visitor cookie (_ilm_vid) ─────────────────────────────────────────────

  /** `_ilm_vid` follows analytics consent unless explicitly disabled. */
  private _visitorPersistenceAllowed(): boolean {
    const cfg = this._cfg!;
    if (cfg.enableVisitorPersistence === false) return false;
    return this._hasConsent();
  }

  private _initVisitor(): void {
    const cfg = this._cfg!;
    if (!this._visitorPersistenceAllowed()) {
      this._visitorId = undefined;
      return;
    }
    const doc = typeof document !== 'undefined' ? document : undefined;
    this._visitorId = resolveVisitorId(doc, true);
  }

  // ── Session management ────────────────────────────────────────────────────

  private _initSession(): void {
    const stored = this._readSessionStorage();
    const now    = Date.now();

    if (stored && (now - stored.ts) < this._cfg!.sessionTTL) {
      this._sessionId = stored.id;
      this._lastEventTs = now;
      this._writeSessionStorage();
      return;
    }
    this._startNewSession();
  }

  private _startNewSession(): void {
    const now = Date.now();
    this._sessionId = 'sess_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    this._lastEventTs = now;
    this._writeSessionStorage();
  }

  private _readSessionStorage(): SessionStorageData | null {
    try {
      const raw = sessionStorage.getItem('_ilm');
      return raw ? (JSON.parse(raw) as SessionStorageData) : null;
    } catch {
      return null;
    }
  }

  private _writeSessionStorage(): void {
    try {
      sessionStorage.setItem('_ilm', JSON.stringify({ id: this._sessionId, ts: Date.now() }));
    } catch {
      // sessionStorage unavailable (private browsing, etc.) — continue silently
    }
  }

  // ── Event recording ───────────────────────────────────────────────────────

  private _captureCurrentRoute(): boolean {
    if (!this._cfg || !this._hasConsent()) return false;

    const path = normalizeUrlPath(window.location.pathname + window.location.search);
    const last  = this._sequence[this._sequence.length - 1];

    for (const { regex, tokenId } of this._cfg.patterns) {
      if (regex.test(path)) {
        if (tokenId !== last) {
          this._record(tokenId);
        }
        return true;
      }
    }
    // No pattern match — unknown route. Raw URL is NOT forwarded.
    return false;
  }

  private _record(tokenId: number): void {
    if (!this._cfg || !this._hasConsent()) return;

    const now   = Date.now();
    const delta = this._lastEventTs !== null ? (now - this._lastEventTs) : 0;
    const isVisibility = IntentLMSDK._VISIBILITY_TOKEN_IDS.has(tokenId);
    const skipAnalyze = IntentLMSDK._NON_ANALYZE_TOKEN_IDS.has(tokenId);

    this._sequence.push(tokenId);
    this._timeDeltas.push(delta);
    this._lastEventTs = now;

    if (this._sequence.length > this._cfg.windowSize) {
      this._sequence.shift();
      this._timeDeltas.shift();
    }

    // Tab hide/return is not user activity — don't extend sessionTTL or re-analyze.
    if (isVisibility) return;

    if (this._awaitingActivityAfterReturn) {
      this._awaitingActivityAfterReturn = false;
      this._resetIdleTimers();
    }
    this._writeSessionStorage();
    if (!skipAnalyze) {
      this._scheduleAnalyze();
    }
  }

  /**
   * Pause behavioral idle tokens while the user is in a payment or sensitive form.
   * Use when focus is inside a third-party iframe (e.g. Stripe Elements) where
   * focus/input events are not visible to the parent page. Pair with {@link endFormEngagement}.
   */
  beginFormEngagement(): void {
    this._formEngagementDepth++;
    this._clearIdleTimers();
  }

  /**
   * Resume idle detection after {@link beginFormEngagement}.
   */
  endFormEngagement(): void {
    this._formEngagementDepth = Math.max(0, this._formEngagementDepth - 1);
    if (this._formEngagementDepth === 0) {
      this._resetIdleTimers();
    }
  }

  /** Base fields for analyze/ingest API payloads. */
  private _apiPayloadBase(): {
    session_id: string | null;
    visitor_id?: string;
    user_id?: string;
    account_id?: string;
  } {
    const base: {
      session_id: string | null;
      visitor_id?: string;
      user_id?: string;
      account_id?: string;
    } = {
      session_id: this._sessionId,
    };
    if (this._visitorId) {
      base.visitor_id = this._visitorId;
    }
    if (this._userId) {
      base.user_id = this._userId;
    }
    if (this._accountId) {
      base.account_id = this._accountId;
    }
    return base;
  }

  private _sanitizeOpaqueId(value?: string | null): string | undefined {
    if (value == null) return undefined;
    const v = value.trim();
    if (!v) return undefined;
    if (v.includes('@')) {
      logSdkError(this._cfg?.debug ?? false, 'opaque id must not contain @ (use internal ids, not email)');
      return undefined;
    }
    if (v.length > 128) {
      logSdkError(this._cfg?.debug ?? false, 'opaque id exceeds 128 characters');
      return undefined;
    }
    return v;
  }

  private _notifyAnalyze(update: Partial<IntentAnalyzeUpdate> & { isAnalyzing: boolean }): void {
    if (!this._cfg?.onAnalyze) return;
    const payload: IntentAnalyzeUpdate = {
      intent:         update.intent ?? null,
      confidence:     update.confidence ?? 0,
      model_tier:     update.model_tier ?? null,
      trigger_nudge:  update.trigger_nudge ?? false,
      suppressed:     update.suppressed ?? false,
      sessionTokens:  [...this._sequence],
      sessionId:      this._sessionId,
      isAnalyzing:    update.isAnalyzing,
    };
    if (this._visitorId !== undefined) {
      payload.visitorId = this._visitorId;
    }
    if (update.error !== undefined) {
      payload.error = update.error;
    }
    if (update.longitudinal_intent !== undefined) {
      payload.longitudinal_intent = update.longitudinal_intent;
    }
    if (update.longitudinal_confidence !== undefined) {
      payload.longitudinal_confidence = update.longitudinal_confidence;
    }
    if (update.prior_session_tokens !== undefined) {
      payload.prior_session_tokens = update.prior_session_tokens;
    }
    if (update.prior_session_intents !== undefined) {
      payload.prior_session_intents = update.prior_session_intents;
    }
    if (update.analyze_latency_ms !== undefined) {
      payload.analyze_latency_ms = update.analyze_latency_ms;
    }
    if (update.intensity !== undefined) {
      payload.intensity = update.intensity;
    }
    if (update.phrases_detected !== undefined) {
      payload.phrases_detected = update.phrases_detected;
    }
    this._cfg.onAnalyze(payload);
  }

  // ── Real-time inference ───────────────────────────────────────────────────

  private _scheduleAnalyze(): void {
    this._analyzeSeq++;
    if (this._analyzeDebounceTimer !== null) {
      clearTimeout(this._analyzeDebounceTimer);
    }
    this._analyzeDebounceTimer = setTimeout(() => {
      this._analyzeDebounceTimer = null;
      this._flushAnalyze();
    }, IntentLMSDK._ANALYZE_DEBOUNCE_MS);
  }

  private _cancelPendingAnalyze(): void {
    if (this._analyzeDebounceTimer !== null) {
      clearTimeout(this._analyzeDebounceTimer);
      this._analyzeDebounceTimer = null;
    }
    this._analyzeSeq++;
    this._analyzeUiPending = false;
    this._analyzeStartedAt = null;
    this._analyzeFollowUpPending = false;
  }

  private _flushAnalyze(): void {
    if (this._analyzeInFlight) {
      this._analyzeFollowUpPending = true;
      return;
    }
    this._analyzeFollowUpPending = false;
    this._startAnalyze(this._analyzeSeq);
  }

  private _isAnalyzeResponseCurrent(requestSeq: number): boolean {
    return requestSeq === this._analyzeSeq;
  }

  private _maybeRunFollowUpAnalyze(completedSeq: number): void {
    if (this._analyzeInFlight) return;
    const needsFollowUp = this._analyzeFollowUpPending || this._analyzeSeq > completedSeq;
    this._analyzeFollowUpPending = false;
    if (!needsFollowUp) return;
    if (this._analyzeDebounceTimer !== null) return;
    this._flushAnalyze();
  }

  private _startAnalyze(requestSeq: number): void {
    const cfg = this._cfg!;
    this._analyzeInFlight = true;
    this._analyzeInFlightSeq = requestSeq;

    const startedAt = performance.now();
    if (!this._analyzeUiPending) {
      this._analyzeUiPending = true;
      this._analyzeStartedAt = startedAt;
      this._notifyAnalyze({ isAnalyzing: true });
    }

    const payload = {
      ...this._apiPayloadBase(),
      tokens:         [...this._sequence],
      time_deltas_ms: [...this._timeDeltas],
    };

    fetch(`${cfg.endpoint}/analyze`, {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
      body:      JSON.stringify(payload),
      keepalive: true,
    })
    .then(async r => {
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        const error = `analyze failed (${r.status})${body ? `: ${body}` : ''}`;
        logSdkError(cfg.debug, error);
        if (!this._isAnalyzeResponseCurrent(requestSeq)) return null;
        const latency = Math.round(performance.now() - startedAt);
        this._analyzeUiPending = false;
        this._analyzeStartedAt = null;
        this._notifyAnalyze({
          isAnalyzing: false,
          error,
          analyze_latency_ms: latency,
        });
        return null;
      }
      return r.json() as Promise<IntentEvent>;
    })
    .then(data => {
      if (!data) return;
      if (!this._isAnalyzeResponseCurrent(requestSeq)) return;

      logSdkDebug(cfg.debug, 'analyze result', {
        intent: data.intent,
        confidence: data.confidence,
        tier: data.model_tier,
        latency_ms: Math.round(performance.now() - startedAt),
      });
      const latency = Math.round(performance.now() - startedAt);
      this._analyzeUiPending = false;
      this._analyzeStartedAt = null;
      this._notifyAnalyze({
        isAnalyzing: false,
        intent: data.intent,
        confidence: data.confidence,
        model_tier: data.model_tier,
        trigger_nudge: data.trigger_nudge,
        suppressed: data.suppressed,
        longitudinal_intent: data.longitudinal_intent ?? null,
        longitudinal_confidence: data.longitudinal_confidence ?? null,
        prior_session_tokens: data.prior_session_tokens ?? null,
        prior_session_intents: data.prior_session_intents ?? null,
        analyze_latency_ms: latency,
        intensity: data.intensity ?? null,
        phrases_detected: data.phrases_detected ?? null,
      });

      if (data.intent && typeof (window as Window & { __ILM_ON_INTENT__?: (e: IntentEvent) => void }).__ILM_ON_INTENT__ === 'function') {
        (window as Window & { __ILM_ON_INTENT__?: (e: IntentEvent) => void }).__ILM_ON_INTENT__!({
          ...data,
          analyze_latency_ms: latency,
        });
      }
    })
    .catch(err => {
      logSdkError(cfg.debug, 'analyze network error', err);
      if (!this._isAnalyzeResponseCurrent(requestSeq)) return;
      const latency = Math.round(performance.now() - startedAt);
      this._analyzeUiPending = false;
      this._analyzeStartedAt = null;
      this._notifyAnalyze({
        isAnalyzing: false,
        error: err instanceof Error ? err.message : 'analyze network error',
        analyze_latency_ms: latency,
      });
    })
    .finally(() => {
      if (this._analyzeInFlightSeq === requestSeq) {
        this._analyzeInFlight = false;
      }
      this._maybeRunFollowUpAnalyze(requestSeq);
    });
  }

  // ── Training payload flush ────────────────────────────────────────────────

  private _flushTrainingPayload(): void {
    if (this._sequence.length < 2) return;
    const cfg = this._cfg!;

    const payload = {
      ...this._apiPayloadBase(),
      tokens:         [...this._sequence],
      time_deltas_ms: [...this._timeDeltas],
    };

    // sendBeacon cannot set Authorization; use keepalive fetch so ingest is authenticated.
    fetch(`${cfg.endpoint}/ingest`, {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
      body:      JSON.stringify(payload),
      keepalive: true,
    })
    .then(r => {
      if (!r.ok) {
        logSdkError(cfg.debug, `ingest failed (${r.status})`);
      } else {
        logSdkDebug(cfg.debug, 'ingest accepted', { tokens: this._sequence.length });
      }
    })
    .catch(err => {
      logSdkError(cfg.debug, 'ingest network error', err);
    });
  }

  // ── Behavioral detectors ──────────────────────────────────────────────────

  private _attachSPAListener(): void {
    if (this._spaPatched || typeof window === 'undefined') return;
    this._spaPatched = true;

    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);

    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      origPush(...args);
      this._onSpaNavigation();
    };
    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      origReplace(...args);
      this._onSpaNavigation();
    };
    window.addEventListener('popstate', this._onPopState);
  }

  private _attachBehavioralDetectors(): void {
    if (this._behaviorAttached || typeof document === 'undefined') return;
    this._behaviorAttached = true;
    this._attachIdleDetector();
    this._attachRageClickDetector();
    this._attachScrollDepthDetector();
    this._attachFormSubmitDetector();
    this._attachTabVisibilityDetector();
  }

  private _attachIdleDetector(): void {
    const reset = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (this._awaitingActivityAfterReturn) {
        this._awaitingActivityAfterReturn = false;
      }
      if (this._formEngagementDepth === 0) {
        this._resetIdleTimers();
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isFormFieldElement(e.target)) return;
      this._formEngagementDepth++;
      this._clearIdleTimers();
    };

    const onFocusOut = (e: FocusEvent) => {
      if (!isFormFieldElement(e.target)) return;
      this._formEngagementDepth = Math.max(0, this._formEngagementDepth - 1);
      if (this._formEngagementDepth === 0) {
        this._resetIdleTimers();
      }
    };

    (
      [
        'mousemove',
        'keydown',
        'input',
        'beforeinput',
        'compositionend',
        'scroll',
        'click',
        'touchstart',
      ] as const
    ).forEach(e => document.addEventListener(e, reset, { passive: true }));

    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    this._resetIdleTimers();
  }

  private _clearIdleTimers(): void {
    if (this._idleTimer30 !== null) {
      clearTimeout(this._idleTimer30);
      this._idleTimer30 = null;
    }
    if (this._idleTimer120 !== null) {
      clearTimeout(this._idleTimer120);
      this._idleTimer120 = null;
    }
  }

  private _resetIdleTimers(): void {
    this._clearIdleTimers();
    if (this._formEngagementDepth > 0) return;
    if (this._awaitingActivityAfterReturn) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    this._idleTimer30 = setTimeout(() => {
      if (this._formEngagementDepth > 0) {
        this._resetIdleTimers();
        return;
      }
      if (typeof document !== 'undefined' && document.hidden) return;
      if (this._awaitingActivityAfterReturn) return;
      this._record(TOKEN_BY_LABEL['IDLE_DRIFT_30S']);
    }, 30_000);

    this._idleTimer120 = setTimeout(() => {
      if (this._formEngagementDepth > 0) {
        this._resetIdleTimers();
        return;
      }
      if (typeof document !== 'undefined' && document.hidden) return;
      if (this._awaitingActivityAfterReturn) return;
      this._record(TOKEN_BY_LABEL['IDLE_DRIFT_120S']);
    }, 120_000);
  }

  private _attachRageClickDetector(): void {
    let times: number[] = [];
    document.addEventListener('click', () => {
      const now = Date.now();
      times = times.filter(t => now - t < 1000);
      times.push(now);
      if (times.length >= 3) {
        this._record(TOKEN_BY_LABEL['RAGE_CLICK']);
        times = [];
      }
    }, { passive: true });
  }

  private _attachScrollDepthDetector(): void {
    const onScroll = () => {
      const pct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100;
      if (pct >= 25 && !this._scrollMilestones.has(25)) {
        this._scrollMilestones.add(25);
        this._record(TOKEN_BY_LABEL['SCROLL_DEPTH_25']);
      }
      if (pct >= 50 && !this._scrollMilestones.has(50)) {
        this._scrollMilestones.add(50);
        this._record(TOKEN_BY_LABEL['SCROLL_DEPTH_50']);
      }
      if (pct >= 75 && !this._scrollMilestones.has(75)) {
        this._scrollMilestones.add(75);
        this._record(TOKEN_BY_LABEL['SCROLL_DEPTH_75']);
      }
      if (pct >= 100 && !this._scrollMilestones.has(100)) {
        this._scrollMilestones.add(100);
        this._record(TOKEN_BY_LABEL['SCROLL_DEPTH_100']);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  private _attachFormSubmitDetector(): void {
    document.addEventListener('submit', (e) => {
      if (e.target instanceof HTMLFormElement) {
        this._record(TOKEN_BY_LABEL['FORM_SUBMIT_SUCCESS']);
      }
    }, true);
  }

  private _attachTabVisibilityDetector(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._clearIdleTimers();
        this._cancelPendingAnalyze();
        this._tabWasHidden = true;
        this._record(TOKEN_BY_LABEL['TAB_HIDDEN']);
        return;
      }
      // Visible again — one TAB_RETURNED max per hide; idle stays paused until real activity.
      if (!this._tabWasHidden) return;
      this._tabWasHidden = false;
      this._awaitingActivityAfterReturn = true;
      this._clearIdleTimers();
      this._record(TOKEN_BY_LABEL['TAB_RETURNED']);
    });
  }

  private _attachFlushListeners(): void {
    if (this._flushAttached || typeof window === 'undefined') return;
    this._flushAttached = true;
    window.addEventListener('pagehide',     () => {
      this._flushTrainingPayload();
      this.flushDiscovery();
    });
    window.addEventListener('beforeunload', () => {
      this._flushTrainingPayload();
      this.flushDiscovery();
    });
  }
}

// ── Exports ───────────────────────────────────────────────────────────────

/** Singleton SDK instance */
export const intentLM = new IntentLMSDK();

/** Class export for advanced/testing use */
export { IntentLMSDK };

// Re-export taxonomy for consumers that import from this package
export { INTENT_TAXONOMY, TOKEN_BY_LABEL, isValidTokenId } from './taxonomy.js';
export type { TokenId, IntentLabel } from './taxonomy.js';
export {
  VISITOR_COOKIE_NAME,
  VISITOR_COOKIE_MAX_AGE_S,
  resolveVisitorId,
  formatVisitorCookie,
  isValidVisitorId,
} from './visitor.js';
export type { CookieDocument } from './visitor.js';

// Attach to window for IIFE / CDN usage
if (typeof window !== 'undefined') {
  (window as Window & { intentLM?: IntentLMSDK }).intentLM = intentLM;
}
