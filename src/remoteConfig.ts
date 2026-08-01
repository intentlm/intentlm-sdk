/**
 * Fetch instrumentation from intentLM Config API (dashboard-published mappings).
 */

import type { PatternMap, ViewMap } from './manifest.js';
import type { RouteViewMap } from './router-bridge.js';

/** Local wire id → dot label (e.g. 1 → DOCS_VIEW.1) from Config API */
export type LocalTokenMap = Record<number, string>;

export interface RemoteInstrumentation {
  version: string;
  patterns: PatternMap;
  views: ViewMap;
  route_views: RouteViewMap;
  core_action_token?: number;
  local_tokens?: LocalTokenMap;
  local_token_display?: LocalTokenMap;
  discovery_mode?: boolean;
  enable_visitor_persistence?: boolean;
  /** Inference API base including /v1 (analyze + ingest). */
  inference_endpoint?: string;
}

/** Resolve instrumentation URL for absolute Config host or same-origin proxy prefix. */
export function instrumentationUrl(configBaseUrl: string): string {
  const base = configBaseUrl.trim().replace(/\/$/, '');
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}/v1/sdk/instrumentation`;
  }
  const prefix = base.startsWith('/') ? base : `/${base}`;
  return `${prefix}/sdk/instrumentation`;
}

export async function fetchRemoteInstrumentation(
  apiKey: string,
  configBaseUrl: string,
): Promise<RemoteInstrumentation | null> {
  const url = instrumentationUrl(configBaseUrl);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      version?: string;
      patterns?: Array<{ glob: string; token_id: number }>;
      views?: Array<{ view_id: string; token_id: number }>;
      route_views?: Record<string, string>;
      core_action_token?: number | null;
      local_tokens?: Record<string, string> | Record<number, string>;
      local_token_display?: Record<string, string> | Record<number, string>;
      discovery_mode?: boolean;
      enable_visitor_persistence?: boolean;
      inference_endpoint?: string | null;
    };

    const patterns: PatternMap = {};
    for (const p of data.patterns ?? []) {
      patterns[p.glob] = p.token_id;
    }
    const views: ViewMap = {};
    for (const v of data.views ?? []) {
      views[v.view_id] = v.token_id;
    }
    const local_tokens: LocalTokenMap = {};
    for (const [k, label] of Object.entries(data.local_tokens ?? {})) {
      local_tokens[Number(k)] = label;
    }
    const local_token_display: LocalTokenMap = {};
    for (const [k, label] of Object.entries(data.local_token_display ?? {})) {
      local_token_display[Number(k)] = label;
    }
    const inferenceEndpoint =
      typeof data.inference_endpoint === 'string' && data.inference_endpoint.trim()
        ? data.inference_endpoint.trim().replace(/\/$/, '')
        : undefined;
    return {
      version: data.version ?? '0',
      patterns,
      views,
      route_views: data.route_views ?? {},
      local_tokens,
      local_token_display,
      ...(data.core_action_token != null ? { core_action_token: data.core_action_token } : {}),
      ...(data.discovery_mode ? { discovery_mode: true } : {}),
      ...(data.enable_visitor_persistence ? { enable_visitor_persistence: true } : {}),
      ...(inferenceEndpoint ? { inference_endpoint: inferenceEndpoint } : {}),
    };
  } catch {
    return null;
  }
}

export function mergeRemoteConfig<T extends {
  patterns: PatternMap;
  views?: ViewMap;
  routeViews?: RouteViewMap;
  coreActionToken?: number;
  localTokens?: LocalTokenMap;
  localTokenDisplay?: LocalTokenMap;
  discoveryMode?: boolean;
  enableVisitorPersistence?: boolean;
  endpoint?: string;
}>(
  local: T,
  remote: RemoteInstrumentation,
): T {
  return {
    ...local,
    patterns: Object.keys(remote.patterns).length > 0 ? remote.patterns : local.patterns,
    views: Object.keys(remote.views).length > 0 ? remote.views : local.views,
    routeViews:
      Object.keys(remote.route_views).length > 0 ? remote.route_views : local.routeViews,
    coreActionToken: remote.core_action_token ?? local.coreActionToken,
    localTokens:
      Object.keys(remote.local_tokens ?? {}).length > 0
        ? remote.local_tokens
        : local.localTokens,
    localTokenDisplay:
      Object.keys(remote.local_token_display ?? {}).length > 0
        ? remote.local_token_display
        : local.localTokenDisplay,
    discoveryMode: remote.discovery_mode ?? local.discoveryMode,
    enableVisitorPersistence:
      remote.enable_visitor_persistence ?? local.enableVisitorPersistence,
    // Prefer platform-served inference URL so dead/stale SDK defaults never stick.
    endpoint: remote.inference_endpoint ?? local.endpoint,
  };
}
