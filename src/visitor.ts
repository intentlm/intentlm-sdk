/**
 * Anonymous visitor cookie (_ilm_vid) for cross-session stitching (ILM-203).
 *
 * Pseudonymous UUID only — never linked to PII in the SDK.
 * Cookie is JS-readable (not HttpOnly) so the SDK can attach visitor_id to API calls.
 */

export const VISITOR_COOKIE_NAME = '_ilm_vid';
export const VISITOR_COOKIE_MAX_AGE_S = 31_536_000; // 1 year

/** UUID v4 (RFC 4122) — matches server-side validation in inference schemas */
export const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Minimal document surface for cookie read/write (browser or test double) */
export interface CookieDocument {
  cookie: string;
}

export function isValidVisitorId(value: string): boolean {
  return UUID_V4_RE.test(value);
}

export function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const raw = trimmed.slice(prefix.length);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return undefined;
}

export function formatVisitorCookie(uuid: string): string {
  return `${VISITOR_COOKIE_NAME}=${encodeURIComponent(uuid)}; path=/; max-age=${VISITOR_COOKIE_MAX_AGE_S}; SameSite=Strict`;
}

/**
 * Read or create the visitor cookie. Returns undefined when cookies are blocked
 * or persistence is disabled — callers must omit visitor_id from API payloads.
 */
export function resolveVisitorId(
  doc: CookieDocument | undefined,
  enabled: boolean,
  randomUuid: () => string = () => crypto.randomUUID(),
): string | undefined {
  if (!enabled || doc === undefined) return undefined;

  const existing = parseCookieValue(doc.cookie, VISITOR_COOKIE_NAME);
  if (existing && isValidVisitorId(existing)) {
    return existing;
  }

  const id = randomUuid();
  if (!isValidVisitorId(id)) return undefined;

  try {
    doc.cookie = formatVisitorCookie(id);
  } catch {
    return undefined;
  }

  const written = parseCookieValue(doc.cookie, VISITOR_COOKIE_NAME);
  return written === id ? id : undefined;
}
