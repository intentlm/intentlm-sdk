/**
 * Framework-agnostic helpers to connect routers / SPAs to intentLM views.
 *
 * Works with React Router, Vue Router, custom branch routers, etc.:
 * pass pathname on each navigation and map paths → view ids.
 */

import { matchPathToKey } from './patterns.js';
import type { ViewMap } from './manifest.js';

export type RouteViewMap = Record<string, string>;

/**
 * Resolve a view id from the current pathname using path→view globs.
 * Example: { '/app/*': 'app.shell', '/app/settings': 'app.settings' }
 */
export function viewIdForPath(pathname: string, routeViews: RouteViewMap): string | null {
  return matchPathToKey(pathname, routeViews);
}

/**
 * When your SPA updates the URL on internal navigation, call this after
 * pushState/replaceState or in your router's afterEach hook.
 *
 * Prefer passing `routeViews` to `intentLM.init` — the SDK re-applies the binder
 * on history pushState / replaceState / popstate automatically.
 */
export function createPathViewBinder(
  routeViews: RouteViewMap,
  setView: (viewId: string) => void,
  getPathname: () => string = () =>
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/',
  options?: { applyImmediately?: boolean },
): () => void {
  const apply = (): void => {
    const id = viewIdForPath(getPathname(), routeViews);
    if (id) setView(id);
  };
  if (options?.applyImmediately !== false) {
    apply();
  }
  return apply;
}

/** Merge route-derived view ids with explicit view→token map for init({ views }). */
export function buildViewsFromRoutes(
  routes: string[],
  tokenForRoute: (route: string) => number,
  routeToViewId: (route: string) => string,
): ViewMap {
  const out: ViewMap = {};
  for (const route of routes) {
    out[routeToViewId(route)] = tokenForRoute(route);
  }
  return out;
}
