import { useCallback, useEffect, useRef, useState } from 'react';
import type { DesignSpec } from '../../lib/types';

const HISTORY_DEBOUNCE_MS = 300;
const MAX_PAST = 50;

interface HistoryState {
  past: DesignSpec[];
  present: DesignSpec;
  future: DesignSpec[];
}

/**
 * Undo/redo state manager for the active design spec. Rapid successive
 * edits (e.g. dragging a slider) collapse into a single history entry —
 * a new past-snapshot is only committed after edits settle for
 * `HISTORY_DEBOUNCE_MS`.
 */
export function useDesignHistory(initial: DesignSpec) {
  const [state, setState] = useState<HistoryState>({
    past: [],
    present: initial,
    future: [],
  });

  /** Spec captured at the start of the current burst of edits, pending commit to `past`. */
  const pendingSnapshotRef = useRef<DesignSpec | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const setSpec = useCallback((next: DesignSpec) => {
    setState((s) => {
      if (pendingSnapshotRef.current === null) {
        pendingSnapshotRef.current = s.present;
      }
      return { past: s.past, present: next, future: [] };
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState((s) => {
        const snapshot = pendingSnapshotRef.current;
        pendingSnapshotRef.current = null;
        if (snapshot === null) return s;
        const past = [...s.past, snapshot].slice(-MAX_PAST);
        return { ...s, past };
      });
    }, HISTORY_DEBOUNCE_MS);
  }, []);

  /** Replace the spec wholesale without pushing a history entry (loads, reset). */
  const replace = useCallback((next: DesignSpec) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingSnapshotRef.current = null;
    setState({ past: [], present: next, future: [] });
  }, []);

  const undo = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingSnapshotRef.current = null;
    setState((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        present: previous,
        future: [s.present, ...s.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingSnapshotRef.current = null;
    setState((s) => {
      if (s.future.length === 0) return s;
      const [next, ...rest] = s.future;
      return {
        past: [...s.past, s.present].slice(-MAX_PAST),
        present: next,
        future: rest,
      };
    });
  }, []);

  return {
    spec: state.present,
    setSpec,
    replace,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
