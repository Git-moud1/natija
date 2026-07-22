"use client";

import { useCallback, useEffect, useState } from "react";
import { ResultsEngine } from "@/lib/engine";
import type { Dataset } from "@/lib/types";

export type DatasetState =
  | { status: "loading" }
  | { status: "ready"; engine: ResultsEngine }
  | { status: "error" };

const cache = new Map<string, ResultsEngine>();

async function fetchWithRetry(url: string, signal: AbortSignal, tries = 4): Promise<Dataset> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal, cache: "force-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as Dataset;
    } catch (err) {
      lastErr = err;
      if (signal.aborted) throw err;
      await new Promise((r) => setTimeout(r, 300 * 2 ** i)); // 300/600/1200ms
    }
  }
  throw lastErr;
}

/** Loads a dataset URL, builds the engine once, caches it, retries on failure. */
export function useDataset(url: string | null, version: string): {
  state: DatasetState;
  retry: () => void;
} {
  const [state, setState] = useState<DatasetState>(
    url ? { status: "loading" } : { status: "error" },
  );
  const [nonce, setNonce] = useState(0);
  const key = url ? `${url}::${version}` : "";

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!url) {
      setState({ status: "error" });
      return;
    }
    const cached = cache.get(key);
    if (cached) {
      setState({ status: "ready", engine: cached });
      return;
    }
    setState({ status: "loading" });
    const ctrl = new AbortController();
    let done = false;

    fetchWithRetry(url, ctrl.signal)
      .then((dataset) => {
        if (done || ctrl.signal.aborted) return;
        const engine = new ResultsEngine(dataset);
        cache.set(key, engine);
        setState({ status: "ready", engine });
      })
      .catch(() => {
        if (!done && !ctrl.signal.aborted) setState({ status: "error" });
      });

    return () => {
      done = true;
      ctrl.abort();
    };
  }, [url, key, nonce]);

  return { state, retry };
}
