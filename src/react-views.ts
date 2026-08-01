/**
 * React helpers for intentLM view tracking (optional peer: react >= 17).
 *
 * For non-React apps use intentLM.setView() or createPathViewBinder().
 */

import { useEffect } from 'react';
import { intentLM } from './intentlm.js';

/** Call setView on mount and whenever viewId changes (route elements, layouts). */
export function useIntentLMView(viewId: string): void {
  useEffect(() => {
    intentLM.setView(viewId);
  }, [viewId]);
}
