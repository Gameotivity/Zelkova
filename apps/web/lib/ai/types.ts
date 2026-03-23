import { z } from "zod";

/** Matches HyperAlpha AnalyzeResponse from main.py */
export const hyperAlphaResultSchema = z.object({
  ticker: z.string(),
  action: z.enum(["long", "short", "hold", "close"]),
  confidence: z.number().min(0).max(1),
  entry_price: z.number().nullable(),
  stop_loss: z.number().nullable(),
  take_profit: z.number().nullable(),
  size_usd: z.number().nullable(),
  leverage: z.number().nullable(),
  approved: z.boolean(),
  signal_alignment: z.number().int().min(0).max(4),
  risk_score: z.number().min(0).max(1),
  report: z.string(),
  errors: z.array(z.string()),
});

export type HyperAlphaResult = z.infer<typeof hyperAlphaResultSchema>;

export const healthResponseSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** Parsed sections from the formatted report */
export interface ParsedReport {
  analysts: {
    name: string;
    signal: string;
    confidence: string;
    icon: string;
  }[];
  debate: {
    signal: string;
    confidence: string;
    thesis: string;
    quality: string;
  } | null;
  statArb: {
    strategy: string;
    signal: string;
    zScore: string;
  }[];
  recommendation: {
    action: string;
    ticker: string;
    entry: string | null;
    stopLoss: string | null;
    takeProfit: string | null;
    size: string | null;
    leverage: string | null;
    confidence: string;
    timeHorizon: string | null;
    alignment: string;
  } | null;
  risk: {
    approved: boolean;
    riskScore: string;
    warnings: string[];
    vetoReason: string | null;
  } | null;
  finalDecision: {
    approved: boolean;
    notes: string;
  } | null;
  errors: string[];
}
