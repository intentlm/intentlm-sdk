/** Debug logging helpers — no-op unless debug mode is enabled. */

export function logSdkDebug(enabled: boolean, message: string, detail?: unknown): void {
  if (!enabled) return;
  if (detail !== undefined) {
    console.debug(`[intentLM] ${message}`, detail);
  } else {
    console.debug(`[intentLM] ${message}`);
  }
}

export function logSdkError(enabled: boolean, message: string, detail?: unknown): void {
  if (!enabled) return;
  if (detail !== undefined) {
    console.error(`[intentLM] ${message}`, detail);
  } else {
    console.error(`[intentLM] ${message}`);
  }
}
