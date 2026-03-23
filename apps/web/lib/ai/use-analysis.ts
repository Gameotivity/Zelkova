"use client";

import { useState, useCallback, useEffect } from "react";
import { hyperAlphaResultSchema } from "./types";
import type { HyperAlphaResult } from "./types";

interface UseAnalysisReturn {
  analyze: (ticker: string) => Promise<HyperAlphaResult | null>;
  result: HyperAlphaResult | null;
  loading: boolean;
  error: string | null;
  isOnline: boolean | null;
  checkHealth: () => Promise<void>;
}

export function useAnalysis(): UseAnalysisReturn {
  const [result, setResult] = useState<HyperAlphaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/analyze", { signal: AbortSignal.timeout(6000) });
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  }, []);

  // Check health on mount
  useEffect(() => { checkHealth(); }, [checkHealth]);

  const analyze = useCallback(async (ticker: string): Promise<HyperAlphaResult | null> => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
        signal: AbortSignal.timeout(310_000), // slightly over 5min server timeout
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        const msg = body.error || body.message || `Request failed (${res.status})`;
        setError(msg);
        setLoading(false);
        return null;
      }

      const data: unknown = await res.json();
      const parsed = hyperAlphaResultSchema.safeParse(data);

      if (!parsed.success) {
        setError("Invalid response from AI engine");
        setLoading(false);
        return null;
      }

      setResult(parsed.data);
      setLoading(false);
      return parsed.data;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Analysis timed out (5 min limit)");
      } else {
        setError(err instanceof Error ? err.message : "Analysis failed");
      }
      setLoading(false);
      return null;
    }
  }, []);

  return { analyze, result, loading, error, isOnline, checkHealth };
}
