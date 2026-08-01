/**
 * URL glob → RegExp (shared by SDK route matching and router bridges).
 *
 * Paths and globs are matched case-insensitively by lowercasing both sides
 * so `/Booking*` and `/booking*` are the same pattern and match `/booking`.
 */

/** Pathname (+ optional query) used for pattern matching — always lowercased. */
export function normalizeUrlPath(path: string): string {
  const noHash = path.split('#')[0] ?? path
  return noHash.toLowerCase()
}

/** Glob string as stored/compared — lowercased so duplicates collapse. */
export function normalizeUrlGlob(glob: string): string {
  return glob.toLowerCase()
}

export function patternToRegex(pattern: string): RegExp {
  const DEEP = '\x00D\x00'
  const escaped = normalizeUrlGlob(pattern)
    .replace(/\*\*/g, DEEP)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*')
    .replace(new RegExp(DEEP, 'g'), '.*')
    .replace(/:([a-zA-Z_]+)/g, '[^/]+')
  return new RegExp('^' + escaped + '(?:[?#].*)?$')
}

/** First matching key in `map` for `pathname` (query allowed). */
export function matchPathToKey(
  pathname: string,
  map: Record<string, string>,
): string | null {
  const path = normalizeUrlPath(pathname)
  const entries = Object.entries(map).sort(
    (a, b) => b[0].length - a[0].length || b[0].localeCompare(a[0]),
  )
  for (const [pattern, key] of entries) {
    if (patternToRegex(pattern).test(path)) {
      return key
    }
  }
  return null
}
